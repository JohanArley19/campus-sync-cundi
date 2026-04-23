import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type Impact = {
  recent_completion_pct: number;
  prev_completion_pct: number;
  recent_realizadas: number;
  prev_realizadas: number;
  recent_active_students: number;
  prev_active_students: number;
};

function Delta({ recent, prev, suffix = "" }: { recent: number; prev: number; suffix?: string }) {
  const diff = Number(recent) - Number(prev);
  const pct = prev > 0 ? Math.round((diff / Number(prev)) * 100) : recent > 0 ? 100 : 0;
  const tone =
    diff > 0 ? "text-success" : diff < 0 ? "text-destructive" : "text-muted-foreground";
  const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
  return (
    <span className={`inline-flex items-center gap-1 font-body text-xs font-semibold ${tone}`}>
      <Icon className="h-3 w-3" />
      {diff > 0 ? "+" : ""}
      {diff}
      {suffix} ({pct > 0 ? "+" : ""}
      {pct}%)
    </span>
  );
}

export function ImpactComparison({ data }: { data: Impact | undefined }) {
  if (!data) return null;
  const rows = [
    {
      label: "Cumplimiento",
      recent: `${data.recent_completion_pct}%`,
      prev: `${data.prev_completion_pct}%`,
      delta: <Delta recent={data.recent_completion_pct} prev={data.prev_completion_pct} suffix="pp" />,
    },
    {
      label: "Tareas realizadas",
      recent: data.recent_realizadas,
      prev: data.prev_realizadas,
      delta: <Delta recent={data.recent_realizadas} prev={data.prev_realizadas} />,
    },
    {
      label: "Estudiantes activos",
      recent: data.recent_active_students,
      prev: data.prev_active_students,
      delta: <Delta recent={data.recent_active_students} prev={data.prev_active_students} />,
    },
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2 px-3 pb-1 border-b border-border">
        <span className="font-body text-[10px] uppercase tracking-wide text-muted-foreground">
          Métrica
        </span>
        <span className="font-body text-[10px] uppercase tracking-wide text-muted-foreground text-right">
          30d previos
        </span>
        <span className="font-body text-[10px] uppercase tracking-wide text-muted-foreground text-right">
          Últimos 30d
        </span>
        <span className="font-body text-[10px] uppercase tracking-wide text-muted-foreground text-right">
          Cambio
        </span>
      </div>
      {rows.map((r) => (
        <div
          key={r.label}
          className="grid grid-cols-4 gap-2 items-center px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors"
        >
          <span className="font-body text-sm font-medium">{r.label}</span>
          <span className="font-body text-sm text-muted-foreground text-right">{r.prev}</span>
          <span className="font-display text-base font-bold text-foreground text-right">
            {r.recent}
          </span>
          <span className="text-right">{r.delta}</span>
        </div>
      ))}
    </div>
  );
}
