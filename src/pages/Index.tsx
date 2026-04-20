import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { useActivities } from "@/hooks/useActivities";
import { useSubjects } from "@/hooks/useSubjects";
import { completionRate, daysUntil, STATUS_LABELS, PRIORITY_LABELS } from "@/lib/academic";
import { BookOpen, ListChecks, AlertTriangle, CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import { AIInsightsCard } from "@/components/dashboard/AIInsightsCard";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";

const STATUS_COLORS = {
  pendiente: "hsl(var(--status-pendiente))",
  realizada: "hsl(var(--status-realizada))",
  no_realizada: "hsl(var(--status-no-realizada))",
};

const PRIORITY_COLORS = {
  alta: "hsl(var(--priority-alta))",
  media: "hsl(var(--priority-media))",
  baja: "hsl(var(--priority-baja))",
};

export default function Index() {
  const { data: activities = [], isLoading: actLoading } = useActivities();
  const { data: subjects = [], isLoading: subLoading } = useSubjects();

  const stats = useMemo(() => {
    const total = activities.length;
    const pendientes = activities.filter((a) => a.status === "pendiente").length;
    const realizadas = activities.filter((a) => a.status === "realizada").length;
    const noRealizadas = activities.filter((a) => a.status === "no_realizada").length;
    const cumplimiento = completionRate(activities);
    const proximas = activities
      .filter((a) => a.status === "pendiente" && a.due_date)
      .map((a) => ({ ...a, days: daysUntil(a.due_date) }))
      .filter((a) => a.days !== null && a.days >= 0 && a.days <= 7)
      .sort((a, b) => (a.days ?? 0) - (b.days ?? 0));

    const statusData = [
      { name: STATUS_LABELS.pendiente, value: pendientes, color: STATUS_COLORS.pendiente },
      { name: STATUS_LABELS.realizada, value: realizadas, color: STATUS_COLORS.realizada },
      { name: STATUS_LABELS.no_realizada, value: noRealizadas, color: STATUS_COLORS.no_realizada },
    ].filter((d) => d.value > 0);

    const priorityCounts = { alta: 0, media: 0, baja: 0 };
    activities
      .filter((a) => a.status === "pendiente")
      .forEach((a) => {
        const p = (a.ai_suggested_priority ?? a.priority) as keyof typeof priorityCounts;
        priorityCounts[p]++;
      });
    const priorityData = (["alta", "media", "baja"] as const).map((p) => ({
      name: PRIORITY_LABELS[p],
      value: priorityCounts[p],
      color: PRIORITY_COLORS[p],
    }));

    const subjectData = subjects.map((s) => {
      const subjectActs = activities.filter((a) => a.subject_id === s.id);
      return {
        name: s.name.length > 15 ? s.name.slice(0, 15) + "…" : s.name,
        pendientes: subjectActs.filter((a) => a.status === "pendiente").length,
        realizadas: subjectActs.filter((a) => a.status === "realizada").length,
      };
    });

    return { total, pendientes, realizadas, noRealizadas, cumplimiento, proximas, statusData, priorityData, subjectData };
  }, [activities, subjects]);

  const isEmpty = !actLoading && !subLoading && subjects.length === 0;

  return (
    <AppShell title="Dashboard" subtitle="Resumen de tu actividad académica">
      <SEOHead title="Dashboard — CampusSync" description="Visualiza tus métricas académicas en CampusSync." />

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
        {isEmpty ? (
          <EmptyDashboard />
        ) : (
          <>
            {/* KPIs */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                icon={BookOpen}
                label="Materias"
                value={subjects.length}
                tone="primary"
              />
              <KpiCard
                icon={ListChecks}
                label="Pendientes"
                value={stats.pendientes}
                tone="warning"
              />
              <KpiCard
                icon={CheckCircle2}
                label="Completadas"
                value={stats.realizadas}
                tone="success"
              />
              <KpiCard
                icon={Sparkles}
                label="Cumplimiento"
                value={`${stats.cumplimiento}%`}
                tone="accent"
              />
            </div>

            {/* AI Insights */}
            <AIInsightsCard />

            {/* Charts */}
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard title="Estado de actividades">
                {stats.statusData.length === 0 ? (
                  <EmptyChart message="Aún no tienes actividades" />
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={stats.statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {stats.statusData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Prioridad sugerida (pendientes)">
                {stats.priorityData.every((p) => p.value === 0) ? (
                  <EmptyChart message="No hay actividades pendientes" />
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={stats.priorityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {stats.priorityData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>

            {stats.subjectData.length > 0 && (
              <ChartCard title="Actividades por materia">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stats.subjectData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="pendientes" fill="hsl(var(--status-pendiente))" name="Pendientes" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="realizadas" fill="hsl(var(--status-realizada))" name="Realizadas" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {/* Próximas actividades */}
            {stats.proximas.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-accent" />
                    <h2 className="font-display text-lg font-bold text-foreground">
                      Próximas a vencer
                    </h2>
                  </div>
                  <Link to="/app/actividades">
                    <Button variant="ghost" size="sm" className="font-body">
                      Ver todas
                      <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
                <div className="space-y-2">
                  {stats.proximas.slice(0, 5).map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/60 bg-background"
                    >
                      <div className="min-w-0">
                        <p className="font-body text-sm font-medium text-foreground truncate">
                          {a.title}
                        </p>
                        <p className="font-body text-xs text-muted-foreground">
                          {a.days === 0 ? "Vence hoy" : a.days === 1 ? "Vence mañana" : `En ${a.days} días`}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="shrink-0"
                        style={{
                          borderColor: PRIORITY_COLORS[(a.ai_suggested_priority ?? a.priority) as keyof typeof PRIORITY_COLORS],
                          color: PRIORITY_COLORS[(a.ai_suggested_priority ?? a.priority) as keyof typeof PRIORITY_COLORS],
                        }}
                      >
                        {PRIORITY_LABELS[(a.ai_suggested_priority ?? a.priority) as keyof typeof PRIORITY_LABELS]}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: string | number;
  tone: "primary" | "warning" | "success" | "accent";
}) {
  const toneClasses = {
    primary: "bg-primary-soft text-primary",
    warning: "bg-accent-soft text-accent",
    success: "bg-primary-soft text-primary",
    accent: "bg-accent-soft text-accent",
  };
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="font-body text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          {label}
        </span>
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${toneClasses[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="font-display text-3xl font-black text-foreground">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="font-display text-base font-bold text-foreground mb-3">{title}</h3>
      {children}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground font-body">
      {message}
    </div>
  );
}

function EmptyDashboard() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center max-w-2xl mx-auto">
      <div className="h-14 w-14 rounded-full gradient-hero mx-auto flex items-center justify-center shadow-emerald mb-5">
        <BookOpen className="h-7 w-7 text-primary-foreground" />
      </div>
      <h2 className="font-display text-2xl font-bold text-foreground mb-2">
        Empieza por agregar tu primera materia
      </h2>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Una vez que tengas materias y actividades, aquí verás tus métricas, gráficos y las tareas que están por vencer.
      </p>
      <Link to="/app/materias">
        <Button size="lg" className="font-body shadow-emerald">
          Crear primera materia
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}
