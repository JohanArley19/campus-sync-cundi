import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import SEOHead from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSubjects } from "@/hooks/useSubjects";
import { useActivities, useUpdateActivity, type Activity } from "@/hooks/useActivities";
import { useSemester } from "@/contexts/SemesterContext";
import { subjectSemesterKey, formatSemester } from "@/lib/semester";
import { subjectGrade, semesterGpa, gradeTone, GRADE_MAX } from "@/lib/grades";
import { GraduationCap, BookOpen, ChevronDown } from "lucide-react";
import { toast } from "sonner";

const TONE_TEXT: Record<string, string> = {
  success: "text-success",
  warning: "text-priority-media",
  danger: "text-destructive",
  muted: "text-muted-foreground",
};

export default function Grades() {
  const { data: allSubjects = [], isLoading } = useSubjects();
  const { data: allActivities = [] } = useActivities();
  const { selected } = useSemester();
  const updateActivity = useUpdateActivity();

  const subjects = useMemo(
    () => allSubjects.filter((s) => subjectSemesterKey(s) === selected),
    [allSubjects, selected],
  );

  const activitiesBySubject = useMemo(() => {
    const m = new Map<string, Activity[]>();
    subjects.forEach((s) => m.set(s.id, []));
    allActivities.forEach((a) => {
      if (m.has(a.subject_id)) m.get(a.subject_id)!.push(a);
    });
    return m;
  }, [subjects, allActivities]);

  const gpa = useMemo(() => semesterGpa(subjects, activitiesBySubject), [subjects, activitiesBySubject]);

  const [expanded, setExpanded] = useState<string | null>(null);

  const saveGrade = async (a: Activity, field: "grade" | "weight", raw: string) => {
    const value = raw.trim() === "" ? null : Number(raw);
    if (value !== null && Number.isNaN(value)) return;
    if (field === "grade" && value !== null && (value < 0 || value > GRADE_MAX)) {
      toast.error(`La nota debe estar entre 0 y ${GRADE_MAX}`);
      return;
    }
    if (field === "weight" && value !== null && (value < 0 || value > 100)) {
      toast.error("El peso debe estar entre 0 y 100");
      return;
    }
    try {
      await updateActivity.mutateAsync({ id: a.id, [field]: value });
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar");
    }
  };

  return (
    <AppShell title="Notas" subtitle="Calificaciones y proyección por materia">
      <SEOHead title="Notas — CampusSync" description="Registra calificaciones y calcula tu promedio ponderado." />
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5 animate-fade-in">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-12 font-body text-sm">Cargando…</p>
        ) : subjects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center max-w-xl mx-auto">
            <div className="h-12 w-12 rounded-full bg-primary-soft mx-auto flex items-center justify-center mb-4">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <h2 className="font-display text-lg font-bold text-foreground mb-1">
              Sin materias en {formatSemester(selected)}
            </h2>
            <p className="text-muted-foreground text-sm">
              Agrega materias y registra el peso y la nota de sus actividades para ver tu promedio.
            </p>
          </div>
        ) : (
          <>
            {/* GPA del semestre */}
            <div className="rounded-xl border border-border bg-card p-5 flex items-center justify-between">
              <div>
                <p className="font-body text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Promedio ponderado (proyectado)
                </p>
                <p className="font-body text-xs text-muted-foreground mt-0.5">
                  Por créditos · {gpa.credits} crédito(s)
                </p>
              </div>
              <p className={`font-display text-4xl font-black ${TONE_TEXT[gradeTone(gpa.gpa)]}`}>
                {gpa.gpa !== null ? gpa.gpa.toFixed(1) : "—"}
              </p>
            </div>

            <div className="space-y-3">
              {subjects.map((s) => {
                const acts = activitiesBySubject.get(s.id) ?? [];
                const g = subjectGrade(acts);
                const open = expanded === s.id;
                return (
                  <div key={s.id} className="rounded-xl border border-border bg-card overflow-hidden">
                    <button
                      className="w-full flex items-center gap-3 p-4 text-left hover:bg-secondary/40 transition-colors"
                      onClick={() => setExpanded(open ? null : s.id)}
                    >
                      <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: s.color }}>
                        <BookOpen className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display text-base font-bold text-foreground truncate">{s.name}</h3>
                        <p className="font-body text-xs text-muted-foreground">
                          {s.credits ? `${s.credits} créditos` : "Sin créditos"} · {Math.round(g.gradedWeight)}% evaluado
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-display text-xl font-black ${TONE_TEXT[gradeTone(g.projected)]}`}>
                          {g.projected !== null ? g.projected.toFixed(1) : "—"}
                        </p>
                        <p className="font-body text-[10px] text-muted-foreground uppercase tracking-wide">Proyección</p>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
                    </button>

                    {open && (
                      <div className="border-t border-border p-4 space-y-3">
                        {g.hasGrades && (
                          <div className="flex flex-wrap gap-2 text-xs font-body">
                            <Badge variant="outline">Promedio evaluado: {g.currentAverage?.toFixed(1)}</Badge>
                            <Badge variant="outline">Nota asegurada: {g.earned.toFixed(1)}</Badge>
                            <Badge variant="outline">Peso registrado: {Math.round(g.totalWeight)}%</Badge>
                          </div>
                        )}
                        {acts.length === 0 ? (
                          <p className="font-body text-sm text-muted-foreground">Esta materia aún no tiene actividades.</p>
                        ) : (
                          <div className="space-y-2">
                            <div className="hidden sm:grid grid-cols-[1fr_90px_90px] gap-2 px-1 text-[10px] uppercase tracking-wide text-muted-foreground font-body font-semibold">
                              <span>Actividad</span>
                              <span>Nota</span>
                              <span>Peso %</span>
                            </div>
                            {acts.map((a) => (
                              <div key={a.id} className="grid grid-cols-[1fr_90px_90px] gap-2 items-center">
                                <span className="font-body text-sm text-foreground truncate">{a.title}</span>
                                <Input
                                  type="number" step="0.1" min={0} max={GRADE_MAX}
                                  defaultValue={a.grade ?? ""}
                                  placeholder="0.0"
                                  className="h-8 text-sm"
                                  onBlur={(e) => saveGrade(a, "grade", e.target.value)}
                                />
                                <Input
                                  type="number" step="1" min={0} max={100}
                                  defaultValue={a.weight ?? ""}
                                  placeholder="0"
                                  className="h-8 text-sm"
                                  onBlur={(e) => saveGrade(a, "weight", e.target.value)}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
