import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import SEOHead from "@/components/SEOHead";
import { Sparkles, Send, Loader2, Trash2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Msg = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "¿Qué debería estudiar hoy?",
  "Hazme un plan para esta semana",
  "Dame un resumen de mi carga académica",
  "Divide mi próximo parcial en sub-tareas",
];

export default function Assistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Cargar historial al entrar
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoadingHistory(true);
      const { data, error } = await supabase
        .from("chat_messages")
        .select("role, content")
        .order("created_at", { ascending: true })
        .limit(50);
      if (!error && data) {
        setMessages(
          data
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        );
      }
      setLoadingHistory(false);
    })();
  }, [user]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || streaming) return;
    setInput("");

    const userMsg: Msg = { role: "user", content };
    const next = [...messages, userMsg];
    setMessages(next);
    setStreaming(true);

    // Persistir mensaje user
    if (user) {
      void supabase.from("chat_messages").insert({
        user_id: user.id,
        role: "user",
        content,
      });
    }

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m,
          );
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error("Sesión expirada. Recarga la página.");

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/study-assistant`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ messages: next }),
      });

      if (resp.status === 429) {
        toast.error("Límite de uso alcanzado. Intenta en unos minutos.");
        setStreaming(false);
        setMessages((prev) => prev.slice(0, -1));
        return;
      }
      if (resp.status === 402) {
        toast.error("Créditos de IA agotados. Contacta al administrador.");
        setStreaming(false);
        setMessages((prev) => prev.slice(0, -1));
        return;
      }
      if (!resp.ok || !resp.body) throw new Error("Error al iniciar el stream");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let done = false;

      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        textBuffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, nl);
          textBuffer = textBuffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Persistir respuesta
      if (user && assistantSoFar) {
        void supabase.from("chat_messages").insert({
          user_id: user.id,
          role: "assistant",
          content: assistantSoFar,
        });
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Error al consultar al asistente");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  };

  const clearHistory = async () => {
    if (!user) return;
    if (!confirm("¿Borrar todo el historial de conversación?")) return;
    await supabase.from("chat_messages").delete().eq("user_id", user.id);
    setMessages([]);
    toast.success("Historial borrado");
  };

  return (
    <AppShell
      title="Asistente IA"
      subtitle="Pregúntale por tu plan de estudio"
      actions={
        messages.length > 0 ? (
          <Button size="sm" variant="ghost" onClick={clearHistory} className="font-body">
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Limpiar
          </Button>
        ) : null
      }
    >
      <SEOHead title="Asistente IA — CampusSync" />

      <div className="flex flex-col h-[calc(100vh-3.5rem)]">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-3xl mx-auto space-y-4">
            {loadingHistory ? (
              <p className="text-center text-muted-foreground py-8 font-body text-sm">
                Cargando…
              </p>
            ) : messages.length === 0 ? (
              <EmptyChat onPick={send} />
            ) : (
              messages.map((m, i) => <Bubble key={i} msg={m} />)
            )}
            {streaming && messages[messages.length - 1]?.role === "user" && (
              <div className="flex items-start gap-3 animate-fade-in">
                <div className="h-8 w-8 rounded-lg gradient-hero flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-card border border-border px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t bg-card p-3 sm:p-4">
          <div className="max-w-3xl mx-auto flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Pregunta lo que quieras sobre tu semestre…"
              rows={1}
              disabled={streaming}
              className="resize-none font-body text-sm min-h-[44px] max-h-32"
            />
            <Button
              onClick={() => send()}
              disabled={streaming || !input.trim()}
              size="icon"
              className="h-11 w-11 shrink-0"
            >
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-center font-body text-[10px] text-muted-foreground mt-2 max-w-3xl mx-auto">
            La IA puede equivocarse. Revisa información crítica antes de actuar.
          </p>
        </div>
      </div>
    </AppShell>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex items-start gap-3 animate-fade-in ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
          isUser ? "bg-primary text-primary-foreground" : "gradient-hero"
        }`}
      >
        {isUser ? (
          <span className="font-display text-xs font-bold">Tú</span>
        ) : (
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        )}
      </div>
      <div
        className={`rounded-2xl px-4 py-2.5 max-w-[85%] ${
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-card border border-border text-foreground rounded-tl-sm"
        }`}
      >
        {isUser ? (
          <p className="font-body text-sm whitespace-pre-wrap">{msg.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none font-body text-sm prose-strong:text-foreground prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-headings:font-display prose-headings:mt-3 prose-headings:mb-1.5">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyChat({ onPick }: { onPick: (s: string) => void }) {
  return (
    <div className="text-center py-8 space-y-5">
      <div className="h-14 w-14 rounded-full gradient-hero mx-auto flex items-center justify-center shadow-emerald">
        <MessageSquare className="h-7 w-7 text-primary-foreground" />
      </div>
      <div className="space-y-1">
        <h2 className="font-display text-2xl font-bold text-foreground">
          ¿En qué te ayudo hoy?
        </h2>
        <p className="font-body text-sm text-muted-foreground max-w-md mx-auto">
          Tengo acceso a tus materias y actividades, así que puedo darte planes y prioridades reales.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-2 max-w-xl mx-auto">
        {STARTERS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="text-left rounded-lg border border-border bg-card hover:bg-accent-soft hover:border-accent/40 transition-colors p-3 font-body text-sm text-foreground"
          >
            <Sparkles className="h-3.5 w-3.5 text-accent inline mr-1.5 -mt-0.5" />
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
