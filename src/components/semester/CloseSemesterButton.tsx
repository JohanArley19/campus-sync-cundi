import { useMemo, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Lock, CheckCircle2, BookOpen, Flame } from "lucide-react";
import { useActivities, useUpdateActivity, type Activity } from "@/hooks/useActivities";
import { useSubjects } from "@/hooks/useSubjects";
import { useSemester } from "@/contexts/SemesterContext";
import { subjectSemesterKey, formatSemester } from "@/lib/semester";
import { completionRate } from "@/lib/academic";
import { toast } from "sonner";

function computeStreak(activities: Activity[]): number {
  // Días consecutivos (hacia atrás desde hoy) con al menos una actividad realizada.
  const days = new Set(
    activities
      .filter((a) => a.status === "realizada")
      .map((a) => new Date(a.updated_at).toISOString().slice(0, 10)),
  );
  let streak = 0;
  const cursor = new Date();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (days.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (streak === 0 && key === new Date().toISOString().slice(0, 10)) {
      // permite que hoy no tenga aún actividad sin romper la racha previa
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export function CloseSemesterButton() {
  const { data: allActivities = [] } = useActivities();
  const { data: allSubjects = [] } = useSubjects();
  const { selected } = useSemester();
  const updateActivity = useUpdateActivity();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [summary, setSummary] = useState<{
    frozen: number;
    completion: number;
    subjects: number;
    streak: number;
  } | null>(null);

  const { semesterActivities, subjects, overduePending } = useMemo(() => {
    const subs = allSubjects.filter((s) => subjectSemesterKey(s) === selected);
    const ids = new Set(subs.map((s) => s.id));
    const acts = allActivities.filter((a) => ids.has(a.subject_id));
    const now = Date.now();
    const overdue = acts.filter(
      (a) =>
        a.status === "pendiente" &&
        a.due_date &&
        new Date(a.due_date).getTime() < now,
    );
    return { semesterActivities: acts, subjects: subs, overduePending: overdue };
  }, [allActivities, allSubjects, selected]);

  if (subjects.length === 0) return null;

  const handleClose = async () => {
    setWorking(true);
    try {
      for (const a of overduePending) {
        await updateActivity.mutateAsync({ id: a.id, status: "no_realizada" });
      }
      // Recalcular sobre el estado final.
      const finalActs = semesterActivities.map((a) =>
        overduePending.some((o) => o.id === a.id)
          ? { ...a, status: "no_realizada" as const }
          : a,
      );
      setSummary({
        frozen: overduePending.length,
        completion: completionRate(finalActs),
        subjects: subjects.length,
        streak: computeStreak(finalActs),
      });
      setConfirmOpen(false);
      setSummaryOpen(true);
      if (overduePending.length > 0) {
        toast.success(`${overduePending.length} pendiente(s) vencida(s) marcadas como no realizadas`);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Error al cerrar el semestre");
    } finally {
      setWorking(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="font-body"
        onClick={() => setConfirmOpen(true)}
      >
        <Lock className="h-4 w-4 mr-1.5" />
        Cerrar semestre
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Cerrar {formatSemester(selected)}
            </AlertDialogTitle>
            <AlertDialogDescription className="font-body">
              Se marcarán <strong>{overduePending.length}</strong> actividad(es) pendiente(s) ya
              vencida(s) como <strong>no realizadas</strong> para no arrastrarlas. Verás un resumen
              final del semestre. Esta acción no se puede deshacer automáticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-body" disabled={working}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction className="font-body" onClick={(e) => { e.preventDefault(); handleClose(); }} disabled={working}>
              {working ? "Procesando…" : "Cerrar semestre"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Resumen de {formatSemester(selected)}
            </AlertDialogTitle>
            <AlertDialogDescription className="font-body">
              Cierre completado. Este es el balance final del periodo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {summary && (
            <div className="grid grid-cols-2 gap-3 py-2">
              <SummaryStat icon={CheckCircle2} label="Cumplimiento" value={`${summary.completion}%`} tone="primary" />
              <SummaryStat icon={BookOpen} label="Materias" value={summary.subjects} tone="primary" />
              <SummaryStat icon={Flame} label="Mejor racha" value={`${summary.streak} d`} tone="accent" />
              <SummaryStat icon={Lock} label="Congeladas" value={summary.frozen} tone="accent" />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogAction className="font-body" onClick={() => setSummaryOpen(false)}>
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: string | number;
  tone: "primary" | "accent";
}) {
  const toneClass = tone === "primary" ? "bg-primary-soft text-primary" : "bg-accent-soft text-accent";
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className={`h-7 w-7 rounded-md flex items-center justify-center ${toneClass}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="font-body text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
          {label}
        </span>
      </div>
      <p className="font-display text-2xl font-black text-foreground">{value}</p>
    </div>
  );
}
