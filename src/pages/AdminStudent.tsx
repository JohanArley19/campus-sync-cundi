import { useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { ArrowLeft, BookOpen, ListChecks, AlertTriangle, CheckCircle2, FileDown, Clock } from "lucide-react";
import { downloadStudentReportPdf } from "@/lib/adminReports";
import { toast } from "sonner";

type Detail = {
  profile: { user_id: string; display_name: string | null; joined_at: string } | null;
  metrics: {
    total_activities: number; pendientes: number; realizadas: number;
    no_realizadas: number; vencidas: number; completion_pct: number;
  };
  subjects: Array<{
    id: string; name: string; code: string | null; semester: string | null; color: string;
    total: number; pendientes: number; realizadas: number; no_realizadas: number;
  }>;
  activities: Array<{
    id: string; title: string; description: string | null; status: string;
    priority: string; ai_suggested_priority: string | null; due_date: string | null;
    subject_name: string | null; subject_color: string | null;
    created_at: string; updated_at: string;
  }>;
  weekly: Array<{ week_start: string; realizadas: number; no_realizadas: number }>;
};

const STATUS_TONE: Record<string, string> = {
  pendiente: "bg-accent text-accent-foreground",
  realizada: "bg-success text-success-foreground",
  no_realizada: "bg-destructive text-destructive-foreground",
};
const PRIORITY_TONE: Record<string, string> = {
  alta: "border-destructive text-destructive",
  media: "border-accent text-accent",
  baja: "border-muted-foreground text-muted-foreground",
};

const fmt = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function AdminStudent() {
  const { userId = "" } = useParams();
  const navigate = useNavigate();

  const detailQ = useQuery({
    queryKey: ["admin", "student-detail", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_student_detail", { p_user_id: userId });
      if (error) throw error;
      return data as unknown as Detail;
    },
    enabled: !!userId,
  });

  const d = detailQ.data;

  const weekly = useMemo(
    () =>
      (d?.weekly ?? []).map((w) => ({
        week: new Date(w.week_start).toLocaleDateString("es-CO", { day: "2-digit", month: "short" }),
        Realizadas: Number(w.realizadas),
        "No realizadas": Number(w.no_realizadas),
      })),
    [d],
  );

  const handleExport = () => {
    if (!d?.profile) return;
    try {
      downloadStudentReportPdf({
        profile: d.profile,
        metrics: d.metrics,
        subjects: d.subjects,
        activities: d.activities.map((a) => ({
          title: a.title,
          subject_name: a.subject_name,
          status: a.status,
          priority: a.priority,
          due_date: a.due_date,
        })),
      });
      toast.success("Reporte PDF generado");
    } catch (e: any) {
      toast.error("No se pudo generar el PDF");
    }
  };

  return (
    <AppShell
      title={d?.profile?.display_name || "Estudiante"}
      subtitle="Detalle individual"
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => navigate("/app/admin")} className="font-body">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
          <Button size="sm" onClick={handleExport} disabled={!d} className="font-body">
            <FileDown className="h-4 w-4 mr-1" /> Exportar PDF
          </Button>
        </>
      }
    >
      <SEOHead title={`${d?.profile?.display_name || "Estudiante"} — Admin`} />

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
        {detailQ.isLoading || !d ? (
          <p className="text-center font-body text-sm text-muted-foreground py-12">Cargando…</p>
        ) : !d.profile ? (
          <p className="text-center font-body text-sm text-muted-foreground py-12">
            Estudiante no encontrado. <Link className="text-primary underline" to="/app/admin">Volver</Link>
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi icon={<ListChecks className="h-4 w-4" />} label="Actividades" value={d.metrics.total_activities} tone="primary" />
              <Kpi icon={<Clock className="h-4 w-4" />} label="Pendientes" value={d.metrics.pendientes} tone="accent" />
              <Kpi icon={<CheckCircle2 className="h-4 w-4" />} label="Cumplimiento" value={`${d.metrics.completion_pct}%`} tone="success" />
              <Kpi icon={<AlertTriangle className="h-4 w-4" />} label="Vencidas" value={d.metrics.vencidas} tone="destructive" />
            </div>

            <Panel title="Tendencia semanal" subtitle="Últimas 8 semanas de este estudiante">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weekly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="Realizadas" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="No realizadas" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title={`Materias (${d.subjects.length})`} icon={<BookOpen className="h-4 w-4 text-primary" />}>
              {d.subjects.length === 0 ? (
                <p className="font-body text-sm text-muted-foreground">Aún no tiene materias.</p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {d.subjects.map((s) => (
                    <div key={s.id} className="rounded-lg border border-border bg-card p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        <p className="font-body text-sm font-bold truncate">{s.name}</p>
                      </div>
                      <p className="font-body text-[11px] text-muted-foreground">
                        {s.code ?? "Sin código"} · {s.semester ?? "—"}
                      </p>
                      <div className="flex items-center gap-3 mt-2 font-body text-xs">
                        <span><b>{s.total}</b> total</span>
                        <span className="text-accent"><b>{s.pendientes}</b> pend.</span>
                        <span className="text-success"><b>{s.realizadas}</b> ok</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title={`Actividades (${d.activities.length})`} icon={<ListChecks className="h-4 w-4 text-primary" />}>
              {d.activities.length === 0 ? (
                <p className="font-body text-sm text-muted-foreground">Aún no tiene actividades.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-body text-xs">Título</TableHead>
                        <TableHead className="font-body text-xs">Materia</TableHead>
                        <TableHead className="font-body text-xs">Estado</TableHead>
                        <TableHead className="font-body text-xs">Prioridad</TableHead>
                        <TableHead className="font-body text-xs">Vence</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {d.activities.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-body text-sm font-medium max-w-[280px] truncate">{a.title}</TableCell>
                          <TableCell className="font-body text-xs">
                            <span className="inline-flex items-center gap-1.5">
                              {a.subject_color && (
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: a.subject_color }} />
                              )}
                              {a.subject_name ?? "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${STATUS_TONE[a.status] ?? ""} font-body text-[10px]`}>
                              {a.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`${PRIORITY_TONE[a.ai_suggested_priority ?? a.priority] ?? ""} font-body text-[10px]`}>
                              {a.ai_suggested_priority ?? a.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-body text-xs text-muted-foreground">
                            {fmt(a.due_date)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Panel>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Kpi({ icon, label, value, tone }: {
  icon: React.ReactNode; label: string; value: number | string;
  tone: "primary" | "accent" | "success" | "destructive";
}) {
  const cls = {
    primary: "bg-primary-soft text-primary",
    accent: "bg-accent-soft text-accent",
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
  }[tone];
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-body text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className={`h-7 w-7 rounded-lg flex items-center justify-center ${cls}`}>{icon}</span>
      </div>
      <p className="font-display text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function Panel({ title, subtitle, icon, children }: {
  title: string; subtitle?: string; icon?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3">
        <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
          {icon}{title}
        </h3>
        {subtitle && <p className="font-body text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
