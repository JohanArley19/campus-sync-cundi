import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2, Check, X, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { useUpdateActivity, type Activity, type ActivityPriority } from "@/hooks/useActivities";
import { PRIORITY_LABELS } from "@/lib/academic";

interface Suggestion {
  id: string;
  priority: ActivityPriority;
  reasoning: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  activities: Activity[];
}

const PRIO_COLOR: Record<ActivityPriority, string> = {
  alta: "bg-priority-alta/15 text-priority-alta border-priority-alta/30",
  media: "bg-priority-media/15 text-priority-media border-priority-media/30",
  baja: "bg-priority-baja/15 text-priority-baja border-priority-baja/30",
};

export function BatchAnalyzeDialog({ open, onOpenChange, activities }: Props) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [todayPlan, setTodayPlan] = useState("");
  const [weekPlan, setWeekPlan] = useState("");
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [rejected, setRejected] = useState<Set<string>>(new Set());
  const updateActivity = useUpdateActivity();

  const reset = () => {
    setSuggestions([]);
    setTodayPlan("");
    setWeekPlan("");
    setAccepted(new Set());
    setRejected(new Set());
  };

  const run = async () => {
    setLoading(true);
    reset();
    try {
      const { data, error } = await supabase.functions.invoke("batch-prioritize", {
        body: {},
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSuggestions(data.suggestions ?? []);
      setTodayPlan(data.today_plan ?? "");
      setWeekPlan(data.week_plan ?? "");
      if ((data.suggestions ?? []).length === 0) {
        toast.info("La IA no encontró cambios de prioridad sugeridos.");
      } else {
        toast.success(`IA analizó ${data.suggestions.length} actividades`);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Error al analizar");
    } finally {
      setLoading(false);
    }
  };

  const accept = async (s: Suggestion) => {
    try {
      await updateActivity.mutateAsync({ id: s.id, priority: s.priority });
      setAccepted((prev) => new Set(prev).add(s.id));
      toast.success("Prioridad aplicada");
    } catch (e: any) {
      toast.error(e?.message ?? "Error al aplicar");
    }
  };

  const reject = (s: Suggestion) => {
    setRejected((prev) => new Set(prev).add(s.id));
  };

  const acceptAll = async () => {
    const pending = suggestions.filter((s) => !accepted.has(s.id) && !rejected.has(s.id));
    try {
      await Promise.all(
        pending.map((s) => updateActivity.mutateAsync({ id: s.id, priority: s.priority })),
      );
      setAccepted((prev) => {
        const next = new Set(prev);
        pending.forEach((s) => next.add(s.id));
        return next;
      });
      toast.success(`${pending.length} prioridades aplicadas`);
    } catch (e: any) {
      toast.error(e?.message ?? "Error al aplicar");
    }
  };

  const activityById = new Map(activities.map((a) => [a.id, a]));
  const pendingCount = suggestions.filter(
    (s) => !accepted.has(s.id) && !rejected.has(s.id) && activityById.get(s.id)?.priority !== s.priority,
  ).length;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            Análisis IA en lote
          </DialogTitle>
          <DialogDescription className="font-body text-sm">
            La IA revisa todas tus actividades pendientes y sugiere prioridades + un plan para hoy y la semana.
          </DialogDescription>
        </DialogHeader>

        {!suggestions.length && !todayPlan && !loading && (
          <div className="py-8 text-center space-y-3">
            <div className="h-12 w-12 rounded-full gradient-hero mx-auto flex items-center justify-center shadow-emerald">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <p className="font-body text-sm text-muted-foreground max-w-sm mx-auto">
              Pulsa "Analizar ahora" para que la IA estudie tu carga y te ayude a priorizar.
            </p>
            <Button onClick={run} className="font-body shadow-sm">
              <Sparkles className="h-4 w-4 mr-1.5" />
              Analizar ahora
            </Button>
          </div>
        )}

        {loading && (
          <div className="py-12 text-center space-y-3">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
            <p className="font-body text-sm text-muted-foreground">
              La IA está leyendo tus materias y actividades…
            </p>
          </div>
        )}

        {!loading && (suggestions.length > 0 || todayPlan) && (
          <ScrollArea className="flex-1 pr-3 -mr-3">
            <div className="space-y-5 pb-2">
              {todayPlan && (
                <PlanBlock
                  title="Plan para hoy"
                  icon={<CalendarDays className="h-4 w-4 text-primary" />}
                  markdown={todayPlan}
                />
              )}
              {weekPlan && (
                <PlanBlock
                  title="Plan para la semana"
                  icon={<CalendarDays className="h-4 w-4 text-accent" />}
                  markdown={weekPlan}
                />
              )}
              {suggestions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-display text-sm font-bold text-foreground">
                      Sugerencias de prioridad ({suggestions.length})
                    </h4>
                    {pendingCount > 0 && (
                      <Button size="sm" variant="outline" onClick={acceptAll} className="font-body h-7 text-xs">
                        Aceptar todas ({pendingCount})
                      </Button>
                    )}
                  </div>
                  {suggestions.map((s) => {
                    const a = activityById.get(s.id);
                    if (!a) return null;
                    const isAccepted = accepted.has(s.id);
                    const isRejected = rejected.has(s.id);
                    const sameAsCurrent = a.priority === s.priority;
                    return (
                      <div
                        key={s.id}
                        className={`rounded-lg border p-3 transition-colors ${
                          isAccepted
                            ? "border-primary/30 bg-primary-soft/40"
                            : isRejected
                              ? "border-border bg-muted/30 opacity-60"
                              : "border-border bg-background"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-body text-sm font-semibold text-foreground line-clamp-1">
                            {a.title}
                          </p>
                          <div className="flex items-center gap-1 shrink-0">
                            <Badge variant="outline" className={`font-body text-[10px] ${PRIO_COLOR[a.priority]}`}>
                              {PRIORITY_LABELS[a.priority]}
                            </Badge>
                            <span className="text-muted-foreground text-xs">→</span>
                            <Badge variant="outline" className={`font-body text-[10px] gap-0.5 ${PRIO_COLOR[s.priority]}`}>
                              <Sparkles className="h-2.5 w-2.5" />
                              {PRIORITY_LABELS[s.priority]}
                            </Badge>
                          </div>
                        </div>
                        <p className="font-body text-xs text-muted-foreground italic mb-2">
                          {s.reasoning}
                        </p>
                        {!sameAsCurrent && !isAccepted && !isRejected && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="default" className="h-7 font-body text-xs" onClick={() => accept(s)}>
                              <Check className="h-3 w-3 mr-1" />
                              Aceptar
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 font-body text-xs" onClick={() => reject(s)}>
                              <X className="h-3 w-3 mr-1" />
                              Rechazar
                            </Button>
                          </div>
                        )}
                        {isAccepted && (
                          <p className="font-body text-xs text-primary flex items-center gap-1">
                            <Check className="h-3 w-3" /> Aplicada
                          </p>
                        )}
                        {isRejected && (
                          <p className="font-body text-xs text-muted-foreground">Rechazada</p>
                        )}
                        {sameAsCurrent && !isAccepted && !isRejected && (
                          <p className="font-body text-xs text-muted-foreground">Coincide con prioridad actual</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="border-t pt-3">
          {suggestions.length > 0 || todayPlan ? (
            <>
              <Button variant="outline" onClick={run} disabled={loading} className="font-body">
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                Volver a analizar
              </Button>
              <Button onClick={() => onOpenChange(false)} className="font-body">
                Cerrar
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)} className="font-body">
              Cancelar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlanBlock({
  title,
  icon,
  markdown,
}: {
  title: string;
  icon: React.ReactNode;
  markdown: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h4 className="font-display text-sm font-bold text-foreground">{title}</h4>
      </div>
      <div className="prose prose-sm max-w-none font-body text-sm text-foreground prose-strong:text-foreground prose-p:my-1 prose-ul:my-1 prose-li:my-0.5">
        <ReactMarkdown>{markdown}</ReactMarkdown>
      </div>
    </div>
  );
}
