import { useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import SEOHead from "@/components/SEOHead";
import { useSubjects } from "@/hooks/useSubjects";
import { useActivities, type Activity } from "@/hooks/useActivities";
import { subjectSemesterKey, formatSemester, compareSemesters } from "@/lib/semester";
import { completionRate } from "@/lib/academic";
import { subjectGrade, semesterGpa, gradeTone } from "@/lib/grades";
import { TrendingUp } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const TONE_TEXT: Record<string, string> = {
  success: "text-success",
  warning: "text-priority-media",
  danger: "text-destructive",
  muted: "text-muted-foreground",
};

export default function Progress() {
  const { data: subjects = [], isLoading } = useSubjects();
  const { data: activities = [] } = useActivities();

  const data = useMemo(() => {
    const subjectsBySemester = new Map<string, typeof subjects>();
    subjects.forEach((s) => {
      const key = subjectSemesterKey(s);
      if (!subjectsBySemester.has(key)) subjectsBySemester.set(key, []);
      subjectsBySemester.get(key)!.push(s);
    });

    const rows = Array.from(subjectsBySemester.entries()).map(([sem, subs]) => {
      const ids = new Set(subs.map((s) => s.id));
      const acts = activities.filter((a) => ids.has(a.subject_id));
      const bySubject = new Map<string, Activity[]>();
      subs.forEach((s) => bySubject.set(s.id, acts.filter((a) => a.subject_id === s.id)));
      const gpa = semesterGpa(subs, bySubject);
      return {
        key: sem,
        label: formatSemester(sem),
        cumplimiento: completionRate(acts),
        promedio: gpa.gpa,
        materias: subs.length,
        actividades: acts.length,
      };
    });

    // Orden cronológico ascendente para la línea de tiempo.
    rows.sort((a, b) => compareSemesters(b.key, a.key));
    return rows;
  }, [subjects, activities]);

  return (
    <AppShell title="Progreso" subtitle="Evolución del cumplimiento por semestre">
      <SEOHead title="Progreso — CampusSync" description="Compara tu cumplimiento y promedio entre semestres." />
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5 animate-fade-in">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-12 font-body text-sm">Cargando…</p>
        ) : data.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center max-w-xl mx-auto">
            <div className="h-12 w-12 rounded-full bg-primary-soft mx-auto flex items-center justify-center mb-4">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h2 className="font-display text-lg font-bold text-foreground mb-1">Aún no hay datos</h2>
            <p className="text-muted-foreground text-sm">
              Registra materias y actividades en varios semestres para comparar tu progreso.
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-display text-base font-bold text-foreground mb-3">
                Cumplimiento por periodo (%)
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone" dataKey="cumplimiento" name="Cumplimiento %"
                    stroke="hsl(var(--primary))" strokeWidth={2.5}
                    dot={{ r: 4 }} activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="grid grid-cols-[1.4fr_1fr_1fr_0.8fr] gap-2 px-4 py-2.5 bg-secondary/40 text-[10px] uppercase tracking-wide text-muted-foreground font-body font-semibold">
                <span>Semestre</span>
                <span>Cumplimiento</span>
                <span>Promedio</span>
                <span>Materias</span>
              </div>
              {[...data].reverse().map((r) => (
                <div key={r.key} className="grid grid-cols-[1.4fr_1fr_1fr_0.8fr] gap-2 px-4 py-3 border-t border-border items-center">
                  <span className="font-body text-sm font-medium text-foreground truncate">{r.label}</span>
                  <span className="font-body text-sm text-foreground">{r.cumplimiento}%</span>
                  <span className={`font-display text-sm font-bold ${TONE_TEXT[gradeTone(r.promedio)]}`}>
                    {r.promedio !== null ? r.promedio.toFixed(1) : "—"}
                  </span>
                  <span className="font-body text-sm text-muted-foreground">{r.materias}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
