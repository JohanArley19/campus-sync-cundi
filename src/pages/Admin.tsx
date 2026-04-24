import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell,
} from "recharts";
import {
  Users, BookOpen, ListChecks, AlertTriangle, TrendingUp, Sparkles,
  CheckCircle2, Activity as ActivityIcon, Award, FileDown, ChevronRight,
  Flame, CalendarRange, Gauge, Brain, LayoutDashboard,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { downloadGlobalReportPdf } from "@/lib/adminReports";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Sparkline } from "@/components/admin/Sparkline";
import { ActivityHeatmap } from "@/components/admin/ActivityHeatmap";
import { ImpactComparison } from "@/components/admin/ImpactComparison";
import { KpiSkeleton, PanelSkeleton, TableSkeleton } from "@/components/admin/AdminSkeletons";
import { AITraining } from "@/components/admin/AITraining";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type GlobalMetrics = {
  total_students: number;
  active_students_7d: number;
  new_students_30d: number;
  total_subjects: number;
  total_activities: number;
  pendientes: number;
  realizadas: number;
  no_realizadas: number;
  vencidas: number;
  global_completion_pct: number;
  ai_analyzed_pct: number;
};

type Student = {
  user_id: string;
  display_name: string | null;
  joined_at: string;
  subjects_count: number;
  total_activities: number;
  pendientes: number;
  realizadas: number;
  no_realizadas: number;
  vencidas: number;
  completion_pct: number;
  last_activity_at: string | null;
};

type WeekRow = {
  week_start: string;
  realizadas: number;
  no_realizadas: number;
  creadas: number;
};

type SubjectDist = {
  subject_name: string;
  students_count: number;
  total_activities: number;
  completion_pct: number;
};

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("es-CO", { day: "2-digit", month: "short" }) : "—";

export default function Admin() {
  const metricsQ = useQuery({
    queryKey: ["admin", "metrics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_global_metrics");
      if (error) throw error;
      return data as unknown as GlobalMetrics;
    },
  });

  const studentsQ = useQuery({
    queryKey: ["admin", "students"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_student_overview");
      if (error) throw error;
      return (data ?? []) as Student[];
    },
  });

  const weeklyQ = useQuery({
    queryKey: ["admin", "weekly"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_weekly_trend");
      if (error) throw error;
      return (data ?? []) as WeekRow[];
    },
  });

  const subjectsQ = useQuery({
    queryKey: ["admin", "subject-dist"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_subject_distribution");
      if (error) throw error;
      return (data ?? []) as SubjectDist[];
    },
  });

  const heatmapQ = useQuery({
    queryKey: ["admin", "heatmap"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_activity_heatmap");
      if (error) throw error;
      return (data ?? []) as Array<{ dow: number; hour: number; count: number }>;
    },
  });

  const impactQ = useQuery({
    queryKey: ["admin", "impact"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_impact_comparison");
      if (error) throw error;
      return data as unknown as {
        recent_completion_pct: number; prev_completion_pct: number;
        recent_realizadas: number; prev_realizadas: number;
        recent_active_students: number; prev_active_students: number;
      };
    },
  });

  const streaksQ = useQuery({
    queryKey: ["admin", "streaks"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_student_streaks");
      if (error) throw error;
      return (data ?? []) as Array<{
        user_id: string; display_name: string | null;
        current_streak: number; active_days_30d: number;
      }>;
    },
  });

  const sparkQ = useQuery({
    queryKey: ["admin", "sparklines"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_sparklines_14d");
      if (error) throw error;
      return data as unknown as {
        completed: Array<{ d: string; v: number }>;
        active: Array<{ d: string; v: number }>;
        overdue: Array<{ d: string; v: number }>;
      };
    },
  });

  const m = metricsQ.data;
  const students = studentsQ.data ?? [];
  const streakById = useMemo(() => {
    const map = new Map<string, number>();
    (streaksQ.data ?? []).forEach((s) => map.set(s.user_id, s.current_streak));
    return map;
  }, [streaksQ.data]);

  const topStreaks = useMemo(
    () => (streaksQ.data ?? []).filter((s) => s.current_streak > 0).slice(0, 5),
    [streaksQ.data],
  );

  const topStudents = useMemo(
    () =>
      [...students]
        .filter((s) => s.total_activities >= 3)
        .sort((a, b) => b.completion_pct - a.completion_pct || b.realizadas - a.realizadas)
        .slice(0, 5),
    [students],
  );

  const atRisk = useMemo(
    () =>
      [...students]
        .filter((s) => s.vencidas > 0 || (s.total_activities >= 3 && s.completion_pct < 50))
        .sort((a, b) => b.vencidas - a.vencidas || a.completion_pct - b.completion_pct)
        .slice(0, 5),
    [students],
  );

  const weeklyData = (weeklyQ.data ?? []).map((w) => ({
    week: new Date(w.week_start).toLocaleDateString("es-CO", { day: "2-digit", month: "short" }),
    Realizadas: Number(w.realizadas),
    "No realizadas": Number(w.no_realizadas),
    Creadas: Number(w.creadas),
  }));

  const statusPie = m
    ? [
        { name: "Realizadas", value: m.realizadas, color: "hsl(var(--success))" },
        { name: "Pendientes", value: m.pendientes, color: "hsl(var(--accent))" },
        { name: "No realizadas", value: m.no_realizadas, color: "hsl(var(--destructive))" },
      ].filter((d) => d.value > 0)
    : [];

  // Adopción semanal: % de estudiantes activos 7d
  const adoptionPct =
    m && m.total_students > 0 ? Math.round((m.active_students_7d / m.total_students) * 100) : 0;

  const navigate = useNavigate();

  const handleExportGlobal = () => {
    if (!m) return;
    try {
      downloadGlobalReportPdf({
        metrics: m,
        students: students.map((s) => ({
          display_name: s.display_name,
          subjects_count: s.subjects_count,
          total_activities: s.total_activities,
          pendientes: s.pendientes,
          realizadas: s.realizadas,
          vencidas: s.vencidas,
          completion_pct: Number(s.completion_pct),
        })),
        weekly: (weeklyQ.data ?? []).map((w) => ({
          week_start: w.week_start,
          realizadas: Number(w.realizadas),
          no_realizadas: Number(w.no_realizadas),
          creadas: Number(w.creadas),
        })),
        subjects: (subjectsQ.data ?? []).map((s) => ({
          subject_name: s.subject_name,
          students_count: Number(s.students_count),
          total_activities: Number(s.total_activities),
          completion_pct: Number(s.completion_pct),
        })),
      });
      toast.success("Reporte PDF generado");
    } catch {
      toast.error("No se pudo generar el PDF");
    }
  };

  return (
    <AppShell
      title="Panel administrador"
      subtitle="Visión global del aplicativo"
      actions={
        <Button size="sm" onClick={handleExportGlobal} disabled={!m} className="font-body">
          <FileDown className="h-4 w-4 mr-1" /> Exportar PDF
        </Button>
      }
    >
      <SEOHead title="Admin — CampusSync" description="Dashboard administrativo de CampusSync." />

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
        {/* Hero institucional */}
        <AdminHeader />

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="overview" className="font-body gap-1.5">
              <LayoutDashboard className="h-3.5 w-3.5" /> Resumen
            </TabsTrigger>
            <TabsTrigger value="ai-training" className="font-body gap-1.5">
              <Brain className="h-3.5 w-3.5" /> Entrenamiento IA
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-0">
        {/* KPIs con sparkline */}
        {metricsQ.isLoading || !m ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi
              icon={<Users className="h-4 w-4" />}
              label="Estudiantes"
              value={m.total_students}
              hint={`${m.new_students_30d} nuevos · 30d`}
              tone="primary"
              spark={sparkQ.data?.active}
              sparkColor="hsl(var(--primary))"
            />
            <Kpi
              icon={<ActivityIcon className="h-4 w-4" />}
              label="Activos 7d"
              value={m.active_students_7d}
              hint={`${adoptionPct}% del total`}
              tone="accent"
              spark={sparkQ.data?.active}
              sparkColor="hsl(var(--accent))"
            />
            <Kpi
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Cumplimiento global"
              value={`${m.global_completion_pct}%`}
              hint={`${m.realizadas} realizadas`}
              tone="success"
              spark={sparkQ.data?.completed}
              sparkColor="hsl(var(--success))"
            />
            <Kpi
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Vencidas"
              value={m.vencidas}
              hint={`${m.pendientes} pendientes`}
              tone="destructive"
              spark={sparkQ.data?.overdue}
              sparkColor="hsl(var(--destructive))"
            />
            <Kpi icon={<BookOpen className="h-4 w-4" />} label="Materias creadas" value={m.total_subjects} tone="primary" />
            <Kpi icon={<ListChecks className="h-4 w-4" />} label="Actividades totales" value={m.total_activities} tone="primary" />
            <Kpi icon={<Sparkles className="h-4 w-4" />} label="Analizadas con IA" value={`${m.ai_analyzed_pct}%`} hint="Adopción de la IA" tone="accent" />
            <Kpi
              icon={<TrendingUp className="h-4 w-4" />}
              label="Promedio por estudiante"
              value={m.total_students > 0 ? Math.round(m.total_activities / m.total_students) : 0}
              hint="actividades / estudiante"
              tone="primary"
            />
          </div>
        )}

        {/* Comparativa antes/después */}
        <Panel
          title="Impacto del aplicativo"
          subtitle="Comparativa últimos 30 días vs 30 días previos"
          icon={<Gauge className="h-4 w-4 text-primary" />}
        >
          {impactQ.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 bg-muted/40 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <ImpactComparison data={impactQ.data} />
          )}
        </Panel>

        {/* Heatmap */}
        <Panel
          title="Mapa de calor de actividad"
          subtitle="Cuándo entregan tareas los estudiantes (últimos 60 días, hora Bogotá)"
          icon={<CalendarRange className="h-4 w-4 text-primary" />}
        >
          {heatmapQ.isLoading ? (
            <div className="h-48 bg-muted/30 rounded animate-pulse" />
          ) : (
            <ActivityHeatmap data={heatmapQ.data ?? []} />
          )}
        </Panel>

        {/* Charts row */}
        <div className="grid lg:grid-cols-3 gap-4">
          <Panel
            title="Tendencia semanal"
            subtitle="Cumplimiento últimas 8 semanas"
            className="lg:col-span-2"
          >
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Line type="monotone" dataKey="Realizadas" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="No realizadas" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Creadas" stroke="hsl(var(--accent))" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Estado global" subtitle="Distribución de actividades">
            <div className="h-64">
              {statusPie.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusPie.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </Panel>
        </div>

        {/* Subjects + Top/At-risk */}
        <div className="grid lg:grid-cols-3 gap-4">
          <Panel title="Materias más usadas" subtitle="Por nº de actividades" className="lg:col-span-2">
            <div className="h-72">
              {(subjectsQ.data ?? []).length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectsQ.data ?? []} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis
                      type="category"
                      dataKey="subject_name"
                      width={130}
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(value: any, name: string) =>
                        name === "completion_pct" ? [`${value}%`, "Cumplimiento"] : [value, "Actividades"]
                      }
                    />
                    <Bar dataKey="total_activities" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Panel>

          <Panel title="Top estudiantes" subtitle="Mayor cumplimiento" icon={<Award className="h-4 w-4 text-accent" />}>
            {topStudents.length === 0 ? (
              <p className="font-body text-xs text-muted-foreground">Aún no hay datos suficientes.</p>
            ) : (
              <ul className="space-y-2">
                {topStudents.map((s, i) => (
                  <li key={s.user_id} className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-accent-soft text-accent text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-body text-sm font-semibold truncate">
                        {s.display_name || "Estudiante"}
                      </p>
                      <p className="font-body text-[11px] text-muted-foreground">
                        {s.realizadas} realizadas · {s.total_activities} totales
                      </p>
                    </div>
                    <Badge className="bg-success text-success-foreground font-body text-[10px] shrink-0">
                      {s.completion_pct}%
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* Rachas */}
        <Panel
          title="Estudiantes más constantes"
          subtitle="Días consecutivos de uso del aplicativo"
          icon={<Flame className="h-4 w-4 text-accent" />}
        >
          {streaksQ.isLoading ? (
            <div className="h-32 bg-muted/30 rounded animate-pulse" />
          ) : topStreaks.length === 0 ? (
            <p className="font-body text-xs text-muted-foreground">
              Aún no hay rachas registradas. Se contabilizan a partir del segundo día consecutivo de uso.
            </p>
          ) : (
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {topStreaks.map((s, i) => (
                <li
                  key={s.user_id}
                  className="rounded-lg border border-accent/30 bg-accent-soft/40 p-3 flex items-center gap-3 cursor-pointer hover:bg-accent-soft/60 transition-colors"
                  onClick={() => navigate(`/app/admin/estudiantes/${s.user_id}`)}
                >
                  <div className="h-10 w-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0 shadow-sm">
                    <Flame className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-body text-sm font-semibold truncate">
                      {i === 0 && "🥇 "}
                      {i === 1 && "🥈 "}
                      {i === 2 && "🥉 "}
                      {s.display_name || "Estudiante"}
                    </p>
                    <p className="font-body text-[11px] text-muted-foreground">
                      {s.active_days_30d} días activos · 30d
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display text-xl font-bold text-accent leading-none">
                      {s.current_streak}
                    </p>
                    <p className="font-body text-[10px] text-muted-foreground uppercase tracking-wide">
                      días
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Estudiantes en riesgo"
          subtitle="Con vencidas o cumplimiento < 50%"
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
        >
          {atRisk.length === 0 ? (
            <p className="font-body text-xs text-muted-foreground">
              Sin estudiantes en riesgo. Buen indicador del aplicativo.
            </p>
          ) : (
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {atRisk.map((s) => (
                <li
                  key={s.user_id}
                  className="rounded-lg border border-destructive/20 bg-destructive/5 p-3"
                >
                  <p className="font-body text-sm font-semibold truncate">
                    {s.display_name || "Estudiante"}
                  </p>
                  <p className="font-body text-[11px] text-muted-foreground mt-0.5">
                    {s.vencidas} vencidas · cumplimiento {s.completion_pct}%
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Tabla de estudiantes */}
        <Panel title={`Estudiantes registrados (${students.length})`} subtitle="Resumen individual">
          {studentsQ.isLoading ? (
            <TableSkeleton />
          ) : students.length === 0 ? (
            <p className="font-body text-sm text-muted-foreground py-6 text-center">Aún no hay estudiantes registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-body text-xs">Estudiante</TableHead>
                    <TableHead className="font-body text-xs">Registro</TableHead>
                    <TableHead className="font-body text-xs text-right">Materias</TableHead>
                    <TableHead className="font-body text-xs text-right">Actividades</TableHead>
                    <TableHead className="font-body text-xs text-right">Pendientes</TableHead>
                    <TableHead className="font-body text-xs text-right">Vencidas</TableHead>
                    <TableHead className="font-body text-xs text-right">Racha</TableHead>
                    <TableHead className="font-body text-xs text-right">Cumplimiento</TableHead>
                    <TableHead className="font-body text-xs">Última actividad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => {
                    const streak = streakById.get(s.user_id) ?? 0;
                    return (
                      <TableRow
                        key={s.user_id}
                        className="cursor-pointer hover:bg-muted/40 transition-colors group"
                        onClick={() => navigate(`/app/admin/estudiantes/${s.user_id}`)}
                      >
                        <TableCell className="font-body text-sm font-medium">
                          <span className="inline-flex items-center gap-1.5 group-hover:text-primary transition-colors">
                            {s.display_name || "—"}
                            <ChevronRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                          </span>
                        </TableCell>
                        <TableCell className="font-body text-xs text-muted-foreground">
                          {fmtDate(s.joined_at)}
                        </TableCell>
                        <TableCell className="font-body text-sm text-right">{s.subjects_count}</TableCell>
                        <TableCell className="font-body text-sm text-right">{s.total_activities}</TableCell>
                        <TableCell className="font-body text-sm text-right">
                          <span className="text-accent font-semibold">{s.pendientes}</span>
                        </TableCell>
                        <TableCell className="font-body text-sm text-right">
                          {s.vencidas > 0 ? (
                            <span className="text-destructive font-semibold">{s.vencidas}</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="font-body text-sm text-right">
                          {streak > 0 ? (
                            <span className="inline-flex items-center gap-1 text-accent font-semibold">
                              <Flame className="h-3 w-3" />
                              {streak}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <CompletionPill pct={Number(s.completion_pct)} />
                        </TableCell>
                        <TableCell className="font-body text-xs text-muted-foreground">
                          {fmtDate(s.last_activity_at)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Panel>

        <p className="text-center font-body text-xs text-muted-foreground pt-2">
          Vista solo de lectura · <Link to="/app" className="text-primary hover:underline">Volver al dashboard</Link>
        </p>
      </div>
    </AppShell>
  );
}

/* ---------- Subcomponentes ---------- */

function Kpi({
  icon,
  label,
  value,
  hint,
  tone,
  spark,
  sparkColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  hint?: string;
  tone: "primary" | "accent" | "success" | "destructive";
  spark?: Array<{ d?: string; v: number }>;
  sparkColor?: string;
}) {
  const toneCls = {
    primary: "bg-primary-soft text-primary",
    accent: "bg-accent-soft text-accent",
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
  }[tone];
  return (
    <div className="rounded-xl border border-border bg-card p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <span className="font-body text-[11px] uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className={`h-7 w-7 rounded-lg flex items-center justify-center ${toneCls}`}>
          {icon}
        </span>
      </div>
      <p className="font-display text-2xl font-bold text-foreground leading-none">{value}</p>
      {hint && <p className="font-body text-[11px] text-muted-foreground mt-1">{hint}</p>}
      {spark && spark.length > 0 && (
        <div className="mt-2">
          <Sparkline data={spark} color={sparkColor} />
        </div>
      )}
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
  className = "",
  icon,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 ${className}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
            {icon}
            {title}
          </h3>
          {subtitle && (
            <p className="font-body text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function CompletionPill({ pct }: { pct: number }) {
  const tone =
    pct >= 75
      ? "bg-success text-success-foreground"
      : pct >= 50
        ? "bg-accent text-accent-foreground"
        : "bg-destructive text-destructive-foreground";
  return (
    <Badge className={`${tone} font-body text-[10px]`}>{pct}%</Badge>
  );
}

function EmptyChart() {
  return (
    <div className="h-full flex items-center justify-center">
      <p className="font-body text-xs text-muted-foreground">Sin datos aún</p>
    </div>
  );
}
