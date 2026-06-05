import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubjects } from "@/hooks/useSubjects";
import { useActivities, type Activity } from "@/hooks/useActivities";
import { useSemester } from "@/contexts/SemesterContext";
import { subjectSemesterKey, formatSemester } from "@/lib/semester";
import { STATUS_LABELS } from "@/lib/academic";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];
const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const STATUS_DOT: Record<string, string> = {
  pendiente: "bg-status-pendiente",
  realizada: "bg-status-realizada",
  no_realizada: "bg-status-no-realizada",
};

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function CalendarPage() {
  const { data: allSubjects = [] } = useSubjects();
  const { data: allActivities = [] } = useActivities();
  const { selected } = useSemester();

  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const subjectMap = useMemo(() => {
    const m = new Map<string, typeof allSubjects[number]>();
    allSubjects.forEach((s) => m.set(s.id, s));
    return m;
  }, [allSubjects]);

  const byDay = useMemo(() => {
    const ids = new Set(
      allSubjects.filter((s) => subjectSemesterKey(s) === selected).map((s) => s.id),
    );
    const map = new Map<string, Activity[]>();
    allActivities.forEach((a) => {
      if (!a.due_date || !ids.has(a.subject_id)) return;
      const key = a.due_date.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return map;
  }, [allActivities, allSubjects, selected]);

  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    // Lunes = 0
    const offset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result: (Date | null)[] = [];
    for (let i = 0; i < offset; i++) result.push(null);
    for (let d = 1; d <= daysInMonth; d++) result.push(new Date(year, month, d));
    while (result.length % 7 !== 0) result.push(null);
    return result;
  }, [cursor]);

  const todayKey = dayKey(new Date());
  const selectedActs = selectedDay ? byDay.get(selectedDay) ?? [] : [];

  return (
    <AppShell title="Calendario" subtitle="Entregas del semestre por mes">
      <SEOHead title="Calendario — CampusSync" description="Visualiza tus entregas en un calendario mensual." />
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground capitalize">
            {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
          </h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="font-body h-8"
              onClick={() => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); }}>
              Hoy
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <p className="font-body text-xs text-muted-foreground">
          Mostrando entregas de {formatSemester(selected)}.
        </p>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-2 text-center font-body text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((date, i) => {
              if (!date) return <div key={i} className="min-h-[84px] border-b border-r border-border/60 bg-secondary/20" />;
              const key = dayKey(date);
              const acts = byDay.get(key) ?? [];
              const isToday = key === todayKey;
              const isSelected = key === selectedDay;
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(isSelected ? null : key)}
                  className={`min-h-[84px] border-b border-r border-border/60 p-1.5 text-left align-top transition-colors hover:bg-secondary/40 ${isSelected ? "bg-primary-soft" : ""}`}
                >
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full font-body text-xs ${isToday ? "bg-primary text-primary-foreground font-bold" : "text-foreground"}`}>
                    {date.getDate()}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {acts.slice(0, 2).map((a) => {
                      const subject = subjectMap.get(a.subject_id);
                      return (
                        <div key={a.id} className="flex items-center gap-1 min-w-0">
                          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: subject?.color }} />
                          <span className="font-body text-[10px] text-foreground truncate">{a.title}</span>
                        </div>
                      );
                    })}
                    {acts.length > 2 && (
                      <span className="font-body text-[10px] text-muted-foreground">+{acts.length - 2} más</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detalle del día */}
        {selectedDay && (
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="h-4 w-4 text-primary" />
              <h3 className="font-display text-base font-bold text-foreground">
                {new Date(selectedDay + "T00:00:00").toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
              </h3>
            </div>
            {selectedActs.length === 0 ? (
              <p className="font-body text-sm text-muted-foreground">No hay entregas este día.</p>
            ) : (
              <div className="space-y-2">
                {selectedActs.map((a) => {
                  const subject = subjectMap.get(a.subject_id);
                  return (
                    <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-background">
                      <span className="w-1 self-stretch rounded-full" style={{ backgroundColor: subject?.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-sm font-medium text-foreground truncate">{a.title}</p>
                        <p className="font-body text-xs text-muted-foreground">{subject?.name ?? "Sin materia"}</p>
                      </div>
                      <Badge variant="outline" className="font-body text-[10px] gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[a.status]}`} />
                        {STATUS_LABELS[a.status]}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
