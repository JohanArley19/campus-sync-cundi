import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useActivities, useCreateActivity, useUpdateActivity, useDeleteActivity,
  type Activity, type ActivityStatus, type ActivityPriority,
} from "@/hooks/useActivities";
import { useSubjects } from "@/hooks/useSubjects";
import { STATUS_LABELS, PRIORITY_LABELS, formatDate, daysUntil } from "@/lib/academic";
import { Plus, ListChecks, Pencil, Trash2, Sparkles, Loader2, AlertCircle, CheckCircle2, XCircle, Clock, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import { BatchAnalyzeDialog } from "@/components/activities/BatchAnalyzeDialog";

const STATUS_OPTIONS: ActivityStatus[] = ["pendiente", "realizada", "no_realizada"];
const PRIORITY_OPTIONS: ActivityPriority[] = ["alta", "media", "baja"];

const PRIORITY_BADGE_CLASSES: Record<ActivityPriority, string> = {
  alta: "bg-priority-alta/15 text-priority-alta border-priority-alta/30",
  media: "bg-priority-media/15 text-priority-media border-priority-media/30",
  baja: "bg-priority-baja/15 text-priority-baja border-priority-baja/30",
};

const STATUS_ICONS: Record<ActivityStatus, any> = {
  pendiente: Clock,
  realizada: CheckCircle2,
  no_realizada: XCircle,
};

const STATUS_ACTIVE_CLASSES: Record<ActivityStatus, string> = {
  pendiente:
    "bg-accent text-accent-foreground border-accent hover:bg-accent/90 hover:text-accent-foreground shadow-sm",
  realizada:
    "bg-success text-success-foreground border-success hover:bg-success/90 hover:text-success-foreground shadow-sm",
  no_realizada:
    "bg-destructive text-destructive-foreground border-destructive hover:bg-destructive/90 hover:text-destructive-foreground shadow-sm",
};

const STATUS_INACTIVE_CLASSES: Record<ActivityStatus, string> = {
  pendiente: "hover:border-accent/50 hover:text-accent",
  realizada: "hover:border-success/50 hover:text-success",
  no_realizada: "hover:border-destructive/50 hover:text-destructive",
};

export default function Activities() {
  const { data: activities = [], isLoading } = useActivities();
  const { data: subjects = [] } = useSubjects();
  const createActivity = useCreateActivity();
  const updateActivity = useUpdateActivity();
  const deleteActivity = useDeleteActivity();

  const [filterStatus, setFilterStatus] = useState<ActivityStatus | "all">("all");
  const [filterSubject, setFilterSubject] = useState<string>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Activity | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);

  // form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<ActivityStatus>("pendiente");
  const [priority, setPriority] = useState<ActivityPriority>("media");

  const filtered = useMemo(() => {
    return activities.filter((a) => {
      if (filterStatus !== "all" && a.status !== filterStatus) return false;
      if (filterSubject !== "all" && a.subject_id !== filterSubject) return false;
      return true;
    });
  }, [activities, filterStatus, filterSubject]);

  const openNew = () => {
    if (subjects.length === 0) {
      toast.error("Primero debes crear al menos una materia");
      return;
    }
    setEditing(null);
    setTitle("");
    setDescription("");
    setSubjectId(subjects[0].id);
    setDueDate("");
    setStatus("pendiente");
    setPriority("media");
    setDialogOpen(true);
  };

  const openEdit = (a: Activity) => {
    setEditing(a);
    setTitle(a.title);
    setDescription(a.description ?? "");
    setSubjectId(a.subject_id);
    setDueDate(a.due_date ? a.due_date.slice(0, 10) : "");
    setStatus(a.status);
    setPriority(a.priority);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }
    if (!subjectId) {
      toast.error("Selecciona una materia");
      return;
    }
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      subject_id: subjectId,
      due_date: dueDate || null,
      status,
      priority,
    };
    try {
      let savedId: string;
      if (editing) {
        await updateActivity.mutateAsync({ id: editing.id, ...payload });
        savedId = editing.id;
        toast.success("Actividad actualizada");
      } else {
        const created = await createActivity.mutateAsync(payload);
        savedId = created.id;
        toast.success("Actividad creada");
      }
      setDialogOpen(false);
      // Auto-analizar prioridad con IA
      if (status === "pendiente") {
        analyzePriority(savedId);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Error al guardar");
    }
  };

  const analyzePriority = async (activityId: string) => {
    const activity = activities.find((a) => a.id === activityId) ?? (await getActivityById(activityId));
    if (!activity) return;

    setAnalyzingId(activityId);
    try {
      const tareasActivas = activities.filter((a) => a.status === "pendiente").length;
      const finalizadas = activities.filter((a) => a.status === "realizada" || a.status === "no_realizada");
      const cumplimientoPct =
        finalizadas.length > 0
          ? Math.round((finalizadas.filter((a) => a.status === "realizada").length / finalizadas.length) * 100)
          : 50;
      const tiempoRestante = daysUntil(activity.due_date) ?? 30;

      const { data, error } = await supabase.functions.invoke("prioritize-activity", {
        body: {
          tiempo_restante_dias: tiempoRestante,
          tareas_activas: tareasActivas,
          historial_cumplimiento_pct: cumplimientoPct,
          estado: activity.status,
          titulo: activity.title,
          descripcion: activity.description,
        },
      });

      if (error) throw error;
      if (!data?.priority) throw new Error("Respuesta inválida de la IA");

      await updateActivity.mutateAsync({
        id: activityId,
        ai_suggested_priority: data.priority,
        ai_reasoning: data.reasoning ?? null,
        ai_analyzed_at: new Date().toISOString(),
      });
      toast.success(`IA sugiere prioridad: ${PRIORITY_LABELS[data.priority as ActivityPriority]}`);
    } catch (e: any) {
      console.error("AI priority error:", e);
      toast.error(e?.message ?? "No se pudo analizar la prioridad");
    } finally {
      setAnalyzingId(null);
    }
  };

  const getActivityById = async (id: string) => {
    const { data } = await supabase.from("activities").select("*").eq("id", id).single();
    return data as Activity | null;
  };

  const handleQuickStatus = async (a: Activity, newStatus: ActivityStatus) => {
    try {
      await updateActivity.mutateAsync({ id: a.id, status: newStatus });
    } catch (e: any) {
      toast.error(e?.message ?? "Error al actualizar");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteActivity.mutateAsync(deleteTarget.id);
      toast.success("Actividad eliminada");
      setDeleteTarget(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Error al eliminar");
    }
  };

  const subjectMap = useMemo(() => {
    const m = new Map<string, typeof subjects[number]>();
    subjects.forEach((s) => m.set(s.id, s));
    return m;
  }, [subjects]);

  return (
    <AppShell
      title="Actividades"
      subtitle="Tus tareas, parciales y trabajos"
      actions={
        <div className="flex items-center gap-2">
          {activities.some((a) => a.status === "pendiente") && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBatchOpen(true)}
              className="font-body"
              title="La IA analiza todas las pendientes"
            >
              <Wand2 className="h-4 w-4 mr-1 text-accent" />
              Analizar con IA
            </Button>
          )}
          <Button size="sm" onClick={openNew} className="font-body shadow-sm">
            <Plus className="h-4 w-4 mr-1" />
            Nueva actividad
          </Button>
        </div>
      }
    >
      <SEOHead title="Actividades — CampusSync" />
      <BatchAnalyzeDialog
        open={batchOpen}
        onOpenChange={setBatchOpen}
        activities={activities}
      />

      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4 animate-fade-in">
        {subjects.length === 0 ? (
          <EmptyNoSubjects />
        ) : (
          <>
            {/* Filtros */}
            <div className="flex flex-wrap gap-2">
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
                <SelectTrigger className="w-[170px] h-9 font-body text-sm">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger className="w-[200px] h-9 font-body text-sm">
                  <SelectValue placeholder="Materia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las materias</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lista */}
            {isLoading ? (
              <p className="text-center text-muted-foreground py-12 font-body text-sm">Cargando…</p>
            ) : filtered.length === 0 ? (
              activities.length === 0 ? (
                <EmptyActivities onAdd={openNew} />
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground font-body">
                  No hay actividades con esos filtros.
                </div>
              )
            ) : (
              <div className="space-y-2">
                {filtered.map((a) => {
                  const subject = subjectMap.get(a.subject_id);
                  const StatusIcon = STATUS_ICONS[a.status];
                  const days = daysUntil(a.due_date);
                  const overdue = days !== null && days < 0 && a.status === "pendiente";
                  const aiPriority = a.ai_suggested_priority;
                  return (
                    <div
                      key={a.id}
                      className="group rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-3">
                        {subject && (
                          <div
                            className="w-1 self-stretch rounded-full shrink-0"
                            style={{ backgroundColor: subject.color }}
                          />
                        )}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-display text-base font-bold text-foreground">
                                  {a.title}
                                </h3>
                                <Badge variant="outline" className="font-body text-[10px] h-5">
                                  {subject?.name ?? "Sin materia"}
                                </Badge>
                              </div>
                              {a.description && (
                                <p className="font-body text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {a.description}
                                </p>
                              )}
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 shrink-0">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => analyzePriority(a.id)}
                                disabled={analyzingId === a.id}
                                title="Analizar prioridad con IA"
                              >
                                {analyzingId === a.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Sparkles className="h-3.5 w-3.5 text-accent" />
                                )}
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(a)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget(a)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap pt-1">
                            <Badge
                              variant="outline"
                              className={`font-body text-[10px] h-5 ${PRIORITY_BADGE_CLASSES[a.priority]}`}
                            >
                              {PRIORITY_LABELS[a.priority]}
                            </Badge>
                            {aiPriority && aiPriority !== a.priority && (
                              <Badge
                                variant="outline"
                                className={`font-body text-[10px] h-5 gap-1 ${PRIORITY_BADGE_CLASSES[aiPriority]}`}
                                title={a.ai_reasoning ?? ""}
                              >
                                <Sparkles className="h-2.5 w-2.5" />
                                IA: {PRIORITY_LABELS[aiPriority]}
                              </Badge>
                            )}
                            <span className={`font-body text-xs flex items-center gap-1 ${overdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                              <Clock className="h-3 w-3" />
                              {a.due_date ? formatDate(a.due_date) : "Sin fecha"}
                              {overdue && " · vencida"}
                            </span>
                          </div>

                          {/* Estado quick toggle */}
                          <div className="flex gap-1 pt-1">
                            {STATUS_OPTIONS.map((s) => {
                              const Icon = STATUS_ICONS[s];
                              const active = a.status === s;
                              return (
                                <Button
                                  key={s}
                                  size="sm"
                                  variant={active ? "default" : "outline"}
                                  className="h-7 px-2 font-body text-xs"
                                  onClick={() => handleQuickStatus(a, s)}
                                >
                                  <Icon className="h-3 w-3 mr-1" />
                                  {STATUS_LABELS[s]}
                                </Button>
                              );
                            })}
                          </div>

                          {a.ai_reasoning && (
                            <p className="font-body text-xs text-muted-foreground italic mt-1.5 flex items-start gap-1">
                              <Sparkles className="h-3 w-3 text-accent shrink-0 mt-0.5" />
                              {a.ai_reasoning}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialog crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editing ? "Editar actividad" : "Nueva actividad"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="font-body text-xs">Título *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Parcial 1" />
            </div>
            <div className="space-y-1.5">
              <Label className="font-body text-xs">Descripción</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Capítulos 1 al 4" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label className="font-body text-xs">Materia *</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger className="font-body text-sm">
                  <SelectValue placeholder="Selecciona una materia" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="font-body text-xs">Fecha de entrega</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="font-body text-xs">Prioridad</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as ActivityPriority)}>
                  <SelectTrigger className="font-body text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="font-body text-xs">Estado</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ActivityStatus)}>
                <SelectTrigger className="font-body text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="font-body text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
              <Sparkles className="h-3 w-3 text-accent" />
              Al guardar, la IA analizará automáticamente la prioridad sugerida.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="font-body">Cancelar</Button>
            <Button
              onClick={handleSave}
              className="font-body"
              disabled={createActivity.isPending || updateActivity.isPending}
            >
              {editing ? "Guardar cambios" : "Crear actividad"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Eliminar actividad</AlertDialogTitle>
            <AlertDialogDescription className="font-body">
              Vas a eliminar <strong>{deleteTarget?.title}</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-body">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="font-body bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function EmptyNoSubjects() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center max-w-xl mx-auto">
      <AlertCircle className="h-12 w-12 text-accent mx-auto mb-4" />
      <h2 className="font-display text-2xl font-bold text-foreground mb-2">
        Necesitas una materia primero
      </h2>
      <p className="text-muted-foreground mb-6">
        Las actividades deben pertenecer a una materia. Crea tu primera materia para empezar.
      </p>
      <Link to="/app/materias">
        <Button size="lg" className="font-body shadow-emerald">
          Ir a materias
        </Button>
      </Link>
    </div>
  );
}

function EmptyActivities({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center max-w-xl mx-auto">
      <div className="h-14 w-14 rounded-full gradient-hero mx-auto flex items-center justify-center shadow-emerald mb-5">
        <ListChecks className="h-7 w-7 text-primary-foreground" />
      </div>
      <h2 className="font-display text-2xl font-bold text-foreground mb-2">
        Sin actividades aún
      </h2>
      <p className="text-muted-foreground mb-6">
        Registra tareas, parciales o trabajos. La IA te sugerirá la prioridad de cada uno.
      </p>
      <Button size="lg" onClick={onAdd} className="font-body shadow-emerald">
        <Plus className="h-4 w-4 mr-1.5" />
        Crear primera actividad
      </Button>
    </div>
  );
}
