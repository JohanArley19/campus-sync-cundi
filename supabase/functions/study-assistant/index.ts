// Edge function: study-assistant
// Asistente conversacional con streaming SSE.
// Lee materias y actividades del usuario y responde con contexto académico.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ChatMsg {
  role: "user" | "assistant" | "system";
  content: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY no configurada");

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "No autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supa = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData } = await supa.auth.getUser(token);
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Sesión inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = (await req.json()) as { messages: ChatMsg[] };

    // Cargar contexto académico (RLS limita a sus propios datos)
    const [{ data: subjects }, { data: activities }] = await Promise.all([
      supa.from("subjects").select("id, name, code, semester"),
      supa
        .from("activities")
        .select("title, description, status, priority, due_date, subject_id")
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(80),
    ]);

    const subjectMap = new Map((subjects ?? []).map((s) => [s.id, s.name]));
    const today = new Date().toISOString().slice(0, 10);

    const contextLines: string[] = [];
    contextLines.push(`Hoy: ${today}`);
    contextLines.push(`Materias (${subjects?.length ?? 0}):`);
    (subjects ?? []).forEach((s) => {
      contextLines.push(
        `- ${s.name}${s.code ? ` (${s.code})` : ""}${s.semester ? ` · ${s.semester}` : ""}`,
      );
    });
    contextLines.push("");
    contextLines.push(`Actividades (${activities?.length ?? 0}):`);
    (activities ?? []).forEach((a) => {
      const sub = subjectMap.get(a.subject_id) ?? "Sin materia";
      const due = a.due_date
        ? new Date(a.due_date).toISOString().slice(0, 10)
        : "sin fecha";
      contextLines.push(
        `- [${a.status}|${a.priority}] ${a.title} — ${sub} — entrega: ${due}${
          a.description ? ` — ${a.description.slice(0, 80)}` : ""
        }`,
      );
    });

    const systemPrompt = `Eres el asistente académico de CampusSync, una plataforma de la Universidad de Cundinamarca.
Ayudas a estudiantes universitarios a organizarse, priorizar tareas y prepararse para parciales.

Estilo:
- Responde SIEMPRE en español, tono cercano y motivador pero profesional.
- Usa markdown: títulos con **negrita**, listas con viñetas, tablas cuando ayuden.
- Sé concreto: cuando sugieras un plan, da bloques de tiempo concretos (ej. "9-10am: repasar cap. 3").
- Si el estudiante pide priorizar, considera fecha de entrega, peso académico y carga total.
- No inventes materias ni actividades que no estén en el contexto.

Contexto académico actual del estudiante:
${contextLines.join("\n")}`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          stream: true,
        }),
      },
    );

    if (aiResponse.status === 429) {
      return new Response(
        JSON.stringify({
          error: "Límite de uso alcanzado. Intenta en unos minutos.",
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (aiResponse.status === 402) {
      return new Response(
        JSON.stringify({
          error: "Se agotaron los créditos de Lovable AI del workspace.",
        }),
        {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (!aiResponse.ok || !aiResponse.body) {
      const t = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, t);
      return new Response(JSON.stringify({ error: "Error del gateway IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (err) {
    console.error("study-assistant error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Error desconocido",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
