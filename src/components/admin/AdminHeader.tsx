import { GraduationCap, Calendar, ShieldCheck, Users, TrendingUp, AlertTriangle } from "lucide-react";

type Props = {
  totalStudents?: number;
  activeStudents7d?: number;
  globalCompletionPct?: number;
  vencidas?: number;
};

export function AdminHeader({
  totalStudents,
  activeStudents7d,
  globalCompletionPct,
  vencidas,
}: Props) {
  const today = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const adoptionPct =
    totalStudents && totalStudents > 0 && activeStudents7d != null
      ? Math.round((activeStudents7d / totalStudents) * 100)
      : null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border shadow-sm">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(115deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 55%, hsl(var(--accent)) 100%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "radial-gradient(hsl(var(--primary-foreground)) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />
      <div className="relative p-5 sm:p-6 text-primary-foreground">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary-foreground/15 backdrop-blur-sm ring-1 ring-primary-foreground/30 flex items-center justify-center shrink-0">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="font-body text-[11px] uppercase tracking-[0.18em] opacity-80 flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3" /> Panel administrador
              </p>
              <h1 className="font-display text-xl sm:text-2xl font-bold leading-tight">
                CampusSync · U. de Cundinamarca
              </h1>
              <p className="font-body text-xs opacity-90 mt-0.5">
                Visión global del rendimiento estudiantil
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="rounded-lg bg-primary-foreground/15 backdrop-blur-sm ring-1 ring-primary-foreground/30 px-3 py-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="font-body text-xs capitalize">{today}</span>
            </div>
          </div>
        </div>

        {/* Mini KPIs vivos en el header */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <HeaderStat
            icon={<Users className="h-3.5 w-3.5" />}
            label="Estudiantes"
            value={totalStudents ?? "—"}
          />
          <HeaderStat
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label="Activos 7d"
            value={activeStudents7d ?? "—"}
            sub={adoptionPct != null ? `${adoptionPct}% adopción` : undefined}
          />
          <HeaderStat
            icon={<ShieldCheck className="h-3.5 w-3.5" />}
            label="Cumplimiento"
            value={globalCompletionPct != null ? `${globalCompletionPct}%` : "—"}
          />
          <HeaderStat
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
            label="Vencidas"
            value={vencidas ?? "—"}
          />
        </div>
      </div>
      <div className="relative h-1 bg-accent" />
    </div>
  );
}

function HeaderStat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg bg-primary-foreground/12 backdrop-blur-sm ring-1 ring-primary-foreground/25 px-3 py-2.5">
      <div className="flex items-center gap-1.5 opacity-85">
        {icon}
        <span className="font-body text-[10px] uppercase tracking-wide">{label}</span>
      </div>
      <p className="font-display text-lg sm:text-xl font-bold leading-tight mt-0.5">{value}</p>
      {sub && <p className="font-body text-[10px] opacity-80 mt-0.5">{sub}</p>}
    </div>
  );
}
