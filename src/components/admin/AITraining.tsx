import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Brain, Cpu, Database, Play, Activity, Target, CheckCircle2, XCircle,
  Layers, Zap, Info, Sparkles, TrendingDown, TrendingUp, RotateCcw,
  UserSearch, Calendar, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  buildRealSamples,
  trainModel,
  buildFeaturesForPending,
  predictWithModel,
  type EpochLog,
  type TrainingResult,
  type RealActivity,
  type RealHistoryRow,
} from "@/lib/aiTraining";
import { toast } from "sonner";

const TOTAL_EPOCHS = 30;
const SYNTHETIC_TARGET = 600;

export function AITraining() {
  const [running, setRunning] = useState(false);
  const [epochs, setEpochs] = useState<EpochLog[]>([]);
  const [result, setResult] = useState<TrainingResult | null>(null);
  const [progress, setProgress] = useState(0);
  const cancelRef = useRef(false);

  const dataQ = useQuery({
    queryKey: ["admin", "ai-training-data"],
    queryFn: async () => {
      const [actsR, histR] = await Promise.all([
        supabase
          .from("activities")
          .select("status, priority, due_date, user_id")
          .limit(2000),
        supabase
          .from("completion_history")
          .select("user_id, new_status, recorded_at")
          .limit(2000),
      ]);
      if (actsR.error) throw actsR.error;
      if (histR.error) throw histR.error;
      const samples = buildRealSamples(
        (actsR.data ?? []) as RealActivity[],
        (histR.data ?? []) as RealHistoryRow[],
      );
      return { samples, rawActivities: actsR.data?.length ?? 0 };
    },
  });

  useEffect(() => () => { cancelRef.current = true; }, []);

  const handleTrain = async () => {
    if (!dataQ.data) return;
    setRunning(true);
    setEpochs([]);
    setResult(null);
    setProgress(0);
    try {
      const res = await trainModel({
        real: dataQ.data.samples,
        syntheticTarget: SYNTHETIC_TARGET,
        epochs: TOTAL_EPOCHS,
        onEpochEnd: (log) => {
          setEpochs((prev) => [...prev, log]);
          setProgress(Math.round((log.epoch / TOTAL_EPOCHS) * 100));
        },
      });
      setResult(res);
      toast.success(`Entrenamiento completo · ${(res.accuracy * 100).toFixed(1)}% de acierto`);
    } catch (e) {
      console.error(e);
      toast.error("Error durante el entrenamiento");
    } finally {
      setRunning(false);
    }
  };

  const handleReset = () => {
    setEpochs([]);
    setResult(null);
    setProgress(0);
  };

  const realCount = dataQ.data?.samples.length ?? 0;
  const syntheticCount = Math.max(0, SYNTHETIC_TARGET - realCount);
  const lastEpoch = epochs[epochs.length - 1];

  const chartData = epochs.map((e) => ({
    epoch: e.epoch,
    "Loss train": Number(e.loss.toFixed(4)),
    "Loss validación": Number(e.val_loss.toFixed(4)),
    "Acc train": Number((e.acc * 100).toFixed(2)),
    "Acc validación": Number((e.val_acc * 100).toFixed(2)),
  }));

  const phase: "idle" | "running" | "done" =
    running ? "running" : result ? "done" : "idle";

  return (
    <div className="space-y-6">
      {/* ============ CARD 1: Cabecera + acción ============ */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary-soft/50 via-card to-card overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shrink-0">
                <Brain className="h-7 w-7" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 mb-2">
                  <Sparkles className="h-3 w-3" />
                  <span className="font-body text-[10px] uppercase tracking-wider font-semibold">
                    Modelo de predicción
                  </span>
                </div>
                <h2 className="font-display text-2xl font-bold text-foreground">
                  ¿Una actividad será entregada a tiempo?
                </h2>
                <p className="font-body text-sm text-muted-foreground mt-2 max-w-2xl">
                  Entrenamos una <strong>red neuronal</strong> directamente en tu navegador con los datos
                  reales del aplicativo. Aprende patrones para predecir si un estudiante completará una
                  actividad — sin enviar nada a servidores externos.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              {phase === "done" && (
                <Button variant="outline" size="lg" onClick={handleReset} className="font-body">
                  <RotateCcw className="h-4 w-4 mr-2" /> Reiniciar
                </Button>
              )}
              <Button
                size="lg"
                onClick={handleTrain}
                disabled={running || dataQ.isLoading}
                className="font-body"
              >
                <Play className="h-4 w-4 mr-2" />
                {running
                  ? `Entrenando · ${progress}%`
                  : phase === "done"
                    ? "Entrenar de nuevo"
                    : "Iniciar entrenamiento"}
              </Button>
            </div>
          </div>
        </div>

        {/* Stepper */}
        <div className="border-t border-border bg-card/60 px-6 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Step
              num={1}
              title="Recolectar datos"
              desc={`${realCount} reales + ${syntheticCount} sintéticas`}
              done
              icon={<Database className="h-4 w-4" />}
            />
            <Step
              num={2}
              title="Construir modelo"
              desc="Red 5→16→8→1 (ReLU + Sigmoid)"
              done
              icon={<Layers className="h-4 w-4" />}
            />
            <Step
              num={3}
              title="Entrenar"
              desc={
                phase === "running"
                  ? `Época ${epochs.length}/${TOTAL_EPOCHS}`
                  : phase === "done"
                    ? `${TOTAL_EPOCHS} épocas`
                    : "Listo para iniciar"
              }
              done={phase === "done"}
              active={phase === "running"}
              icon={<Zap className="h-4 w-4" />}
            />
            <Step
              num={4}
              title="Evaluar"
              desc={
                result
                  ? `${(result.accuracy * 100).toFixed(1)}% de acierto`
                  : "Tras finalizar"
              }
              done={phase === "done"}
              icon={<Target className="h-4 w-4" />}
            />
          </div>
        </div>
      </div>

      {/* ============ CARD 2: Cómo funciona (siempre visible, educativo) ============ */}
      <Section
        title="¿Cómo funciona?"
        subtitle="Las 5 señales que recibe el modelo para cada actividad"
        icon={<Info className="h-4 w-4 text-primary" />}
      >
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
          <Feature label="Días restantes" value="-30 a 60" hint="Hasta la fecha de entrega" />
          <Feature label="Prioridad" value="Baja · Media · Alta" hint="Importancia académica" />
          <Feature label="Carga actual" value="0 a 20" hint="Pendientes del estudiante" />
          <Feature label="Historial" value="0 a 100%" hint="% cumplimiento previo" />
          <Feature label="¿Vencida?" value="Sí · No" hint="Pasó la fecha límite" />
        </div>
        <div className="mt-3 rounded-lg bg-muted/40 border border-border px-3 py-2.5 flex items-start gap-2">
          <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="font-body text-xs text-muted-foreground">
            La red neuronal combina estas 5 señales en 16 neuronas ocultas, luego en 8, y finalmente
            produce <strong>1 número entre 0 y 1</strong> — la probabilidad de que la actividad sea
            entregada. Si supera 0.5, predice <strong>realizada</strong>.
          </p>
        </div>
      </Section>

      {/* ============ CARD 3: Progreso en vivo (solo cuando corre o terminó) ============ */}
      {(phase === "running" || phase === "done") && (
        <Section
          title={phase === "running" ? "Entrenamiento en progreso" : "Entrenamiento completado"}
          subtitle={
            phase === "running"
              ? `Procesando época ${epochs.length} de ${TOTAL_EPOCHS}…`
              : `Completado en ${result ? (result.durationMs / 1000).toFixed(1) : "?"} segundos`
          }
          icon={
            phase === "running" ? (
              <Activity className="h-4 w-4 text-primary animate-pulse" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-success" />
            )
          }
        >
          <div className="space-y-4">
            <div>
              <div className="flex justify-between font-body text-xs text-muted-foreground mb-1.5">
                <span>Progreso global</span>
                <span className="font-semibold text-foreground">{progress}%</span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {lastEpoch && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <LiveStat
                  label="Loss train"
                  value={lastEpoch.loss.toFixed(4)}
                  trend={epochs.length > 1 ? lastEpoch.loss - epochs[epochs.length - 2].loss : 0}
                  good="down"
                />
                <LiveStat
                  label="Acc train"
                  value={`${(lastEpoch.acc * 100).toFixed(1)}%`}
                  trend={epochs.length > 1 ? (lastEpoch.acc - epochs[epochs.length - 2].acc) * 100 : 0}
                  good="up"
                />
                <LiveStat
                  label="Loss validación"
                  value={lastEpoch.val_loss.toFixed(4)}
                  trend={
                    epochs.length > 1 ? lastEpoch.val_loss - epochs[epochs.length - 2].val_loss : 0
                  }
                  good="down"
                />
                <LiveStat
                  label="Acc validación"
                  value={`${(lastEpoch.val_acc * 100).toFixed(1)}%`}
                  trend={
                    epochs.length > 1 ? (lastEpoch.val_acc - epochs[epochs.length - 2].val_acc) * 100 : 0
                  }
                  good="up"
                />
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ============ CARD 4: Curvas de aprendizaje ============ */}
      {epochs.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Section
            title="Curva de pérdida (Loss)"
            subtitle="Mide qué tan equivocado está el modelo · más bajo = mejor"
            icon={<TrendingDown className="h-4 w-4 text-primary" />}
          >
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="epoch"
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    label={{ value: "Época", position: "insideBottom", offset: -2, fontSize: 10 }}
                  />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Line
                    type="monotone"
                    dataKey="Loss train"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="Loss validación"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <Hint>
              Si ambas curvas bajan juntas, el modelo aprende bien. Si la línea de validación se queda
              estancada o sube mientras la de train baja, hay <strong>sobreajuste</strong>.
            </Hint>
          </Section>

          <Section
            title="Curva de precisión (Accuracy)"
            subtitle="Porcentaje de aciertos · más alto = mejor"
            icon={<TrendingUp className="h-4 w-4 text-success" />}
          >
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="epoch"
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    label={{ value: "Época", position: "insideBottom", offset: -2, fontSize: 10 }}
                  />
                  <YAxis
                    domain={[0, 100]}
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
                    formatter={(v: any) => `${v}%`}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Line
                    type="monotone"
                    dataKey="Acc train"
                    stroke="hsl(var(--success))"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="Acc validación"
                    stroke="hsl(var(--accent))"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <Hint>
              La línea continua es el desempeño en datos de <strong>entrenamiento</strong>. La punteada
              en datos <strong>nunca vistos</strong> — es la métrica que importa.
            </Hint>
          </Section>
        </div>
      )}

      {/* ============ CARD 5: Resultado final ============ */}
      {result && (
        <>
          <div className="grid lg:grid-cols-5 gap-4">
            <Section
              className="lg:col-span-3"
              title="Matriz de confusión"
              subtitle={`Sobre ${result.testCount} actividades de validación`}
              icon={<Target className="h-4 w-4 text-primary" />}
            >
              <ConfusionMatrixView result={result} />
              <Hint>
                Cada celda cuenta cuántas predicciones fueron correctas (verde) o erróneas (rojo)
                comparadas con la realidad.
              </Hint>
            </Section>

            <Section
              className="lg:col-span-2"
              title="Métricas finales"
              subtitle="Calculadas sobre el conjunto de validación"
              icon={<Sparkles className="h-4 w-4 text-accent" />}
            >
              <div className="grid grid-cols-2 gap-2.5">
                <Metric
                  label="Accuracy"
                  value={`${(result.accuracy * 100).toFixed(1)}%`}
                  tone="success"
                  desc="aciertos totales"
                />
                <Metric
                  label="Precision"
                  value={`${(result.precision * 100).toFixed(1)}%`}
                  tone="primary"
                  desc="cuando dijo sí"
                />
                <Metric
                  label="Recall"
                  value={`${(result.recall * 100).toFixed(1)}%`}
                  tone="primary"
                  desc="capturó realizadas"
                />
                <Metric
                  label="F1"
                  value={`${(result.f1 * 100).toFixed(1)}%`}
                  tone="accent"
                  desc="balance global"
                />
              </div>
              <div className="mt-4 pt-4 border-t border-border space-y-1.5">
                <RowStat label="Tiempo total" value={`${(result.durationMs / 1000).toFixed(1)} s`} />
                <RowStat label="Épocas ejecutadas" value={String(result.epochs)} />
                <RowStat label="Train / Test" value={`${result.trainCount} / ${result.testCount}`} />
                <RowStat label="Reales / Sintéticas" value={`${result.realCount} / ${result.syntheticCount}`} />
              </div>
            </Section>
          </div>

          {/* Log de épocas */}
          <Section
            title="Log de épocas"
            subtitle="Detalle iteración por iteración"
            icon={<Cpu className="h-4 w-4 text-muted-foreground" />}
            collapsible
          >
            <div className="overflow-x-auto max-h-72 rounded-lg border border-border">
              <table className="w-full text-sm font-body">
                <thead className="sticky top-0 bg-muted/50 backdrop-blur">
                  <tr>
                    <th className="text-left py-2 px-3 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Época</th>
                    <th className="text-right py-2 px-3 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Loss</th>
                    <th className="text-right py-2 px-3 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Acc</th>
                    <th className="text-right py-2 px-3 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Val loss</th>
                    <th className="text-right py-2 px-3 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Val acc</th>
                  </tr>
                </thead>
                <tbody>
                  {epochs.map((e, i) => (
                    <tr
                      key={e.epoch}
                      className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}
                    >
                      <td className="py-1.5 px-3 font-semibold">{e.epoch}</td>
                      <td className="py-1.5 px-3 text-right tabular-nums">{e.loss.toFixed(4)}</td>
                      <td className="py-1.5 px-3 text-right tabular-nums">{(e.acc * 100).toFixed(2)}%</td>
                      <td className="py-1.5 px-3 text-right tabular-nums">{e.val_loss.toFixed(4)}</td>
                      <td className="py-1.5 px-3 text-right tabular-nums">{(e.val_acc * 100).toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* ============ CARD 6: Predicción individual por estudiante ============ */}
          <StudentPrediction model={result.model} />
        </>
      )}
    </div>
  );
}

/* ---------- Subcomponentes ---------- */

function Section({
  title, subtitle, children, icon, className = "", collapsible = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className={`rounded-xl border border-border bg-card p-5 ${className}`}>
      <div
        className={`flex items-start justify-between gap-2 ${open ? "mb-4" : ""} ${collapsible ? "cursor-pointer" : ""}`}
        onClick={collapsible ? () => setOpen(!open) : undefined}
      >
        <div>
          <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
            {icon}
            {title}
          </h3>
          {subtitle && <p className="font-body text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {collapsible && (
          <span className="font-body text-xs text-muted-foreground">{open ? "−" : "+"}</span>
        )}
      </div>
      {open && children}
    </div>
  );
}

function Step({
  num, title, desc, icon, done, active,
}: {
  num: number;
  title: string;
  desc: string;
  icon: React.ReactNode;
  done?: boolean;
  active?: boolean;
}) {
  const tone = active
    ? "border-primary bg-primary/10"
    : done
      ? "border-success/40 bg-success/5"
      : "border-border bg-muted/30";
  const iconBg = active
    ? "bg-primary text-primary-foreground"
    : done
      ? "bg-success text-success-foreground"
      : "bg-muted text-muted-foreground";
  return (
    <div className={`rounded-lg border p-3 flex items-center gap-3 ${tone}`}>
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
        {done && !active ? <CheckCircle2 className="h-4 w-4" /> : icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-body text-[10px] uppercase tracking-wide text-muted-foreground">
          Paso {num}
        </p>
        <p className="font-body text-sm font-semibold text-foreground leading-tight">{title}</p>
        <p className="font-body text-[11px] text-muted-foreground mt-0.5 truncate">{desc}</p>
      </div>
    </div>
  );
}

function Feature({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="font-body text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-display text-sm font-bold text-foreground mt-1">{value}</p>
      <p className="font-body text-[10px] text-muted-foreground mt-0.5">{hint}</p>
    </div>
  );
}

function LiveStat({
  label, value, trend, good,
}: {
  label: string;
  value: string;
  trend: number;
  good: "up" | "down";
}) {
  const isGood = good === "up" ? trend > 0 : trend < 0;
  const Arrow = good === "up" ? TrendingUp : TrendingDown;
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="font-body text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex items-baseline justify-between gap-1 mt-1">
        <p className="font-display text-lg font-bold text-foreground tabular-nums">{value}</p>
        {Math.abs(trend) > 0.0001 && (
          <span
            className={`inline-flex items-center gap-0.5 font-body text-[10px] ${
              isGood ? "text-success" : "text-destructive"
            }`}
          >
            <Arrow className="h-3 w-3" />
          </span>
        )}
      </div>
    </div>
  );
}

function Metric({
  label, value, tone, desc,
}: {
  label: string;
  value: string;
  tone: "primary" | "accent" | "success" | "muted";
  desc?: string;
}) {
  const toneCls = {
    primary: "bg-primary-soft text-primary border-primary/20",
    accent: "bg-accent-soft text-accent border-accent/20",
    success: "bg-success/10 text-success border-success/20",
    muted: "bg-muted text-foreground border-border",
  }[tone];
  return (
    <div className={`rounded-lg border p-3 ${toneCls}`}>
      <p className="font-body text-[10px] uppercase tracking-wide opacity-80">{label}</p>
      <p className="font-display text-2xl font-bold mt-0.5">{value}</p>
      {desc && <p className="font-body text-[10px] opacity-75 mt-0.5">{desc}</p>}
    </div>
  );
}

function RowStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between font-body text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground tabular-nums">{value}</span>
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-lg bg-muted/40 border border-border px-3 py-2 flex items-start gap-2">
      <Info className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
      <p className="font-body text-[11px] text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}

function ConfusionMatrixView({ result }: { result: TrainingResult }) {
  const { tp, tn, fp, fn } = result.confusion;
  const max = Math.max(tp, tn, fp, fn, 1);
  const cell = (val: number, label: string, good: boolean, sub: string) => {
    const intensity = val / max;
    return (
      <div
        className={`rounded-lg p-4 border ${
          good ? "border-success/40" : "border-destructive/40"
        }`}
        style={{
          backgroundColor: good
            ? `hsl(var(--success) / ${0.1 + intensity * 0.3})`
            : `hsl(var(--destructive) / ${0.1 + intensity * 0.3})`,
        }}
      >
        <div className="flex items-center gap-1.5 mb-1">
          {good ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-destructive" />
          )}
          <span className="font-body text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
            {label}
          </span>
        </div>
        <p className="font-display text-3xl font-bold text-foreground tabular-nums leading-none">
          {val}
        </p>
        <p className="font-body text-[11px] text-muted-foreground mt-1.5">{sub}</p>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-[auto_1fr_1fr] gap-2">
      <div />
      <div className="text-center font-body text-[10px] uppercase tracking-wide text-muted-foreground self-end pb-1">
        Predicción: <strong className="text-foreground">Realizada</strong>
      </div>
      <div className="text-center font-body text-[10px] uppercase tracking-wide text-muted-foreground self-end pb-1">
        Predicción: <strong className="text-foreground">No realizada</strong>
      </div>

      <div className="font-body text-[10px] uppercase tracking-wide text-muted-foreground self-center text-right pr-1">
        Real:<br /><strong className="text-foreground">Sí</strong>
      </div>
      {cell(tp, "Verdadero positivo", true, "Acertó: era realizada")}
      {cell(fn, "Falso negativo", false, "Falló: era realizada")}

      <div className="font-body text-[10px] uppercase tracking-wide text-muted-foreground self-center text-right pr-1">
        Real:<br /><strong className="text-foreground">No</strong>
      </div>
      {cell(fp, "Falso positivo", false, "Falló: no fue realizada")}
      {cell(tn, "Verdadero negativo", true, "Acertó: no fue realizada")}
    </div>
  );
}

/* ---------- Predicción individual por estudiante ---------- */

import type * as tf from "@tensorflow/tfjs";

type StudentLite = { user_id: string; display_name: string | null; pendientes: number };
type PendingActivity = {
  activity_id: string;
  title: string;
  subject_name: string | null;
  priority: "baja" | "media" | "alta";
  due_date: string | null;
  active_load: number;
  history_pct: number;
};

function StudentPrediction({ model }: { model: tf.LayersModel }) {
  const [studentId, setStudentId] = useState<string>("");

  const studentsQ = useQuery({
    queryKey: ["admin", "students-for-prediction"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_student_overview");
      if (error) throw error;
      return ((data ?? []) as Array<{ user_id: string; display_name: string | null; pendientes: number }>)
        .filter((s) => s.pendientes > 0)
        .map((s) => ({
          user_id: s.user_id,
          display_name: s.display_name,
          pendientes: s.pendientes,
        })) as StudentLite[];
    },
  });

  const pendingQ = useQuery({
    queryKey: ["admin", "student-pending", studentId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_student_pending_activities", {
        p_user_id: studentId,
      });
      if (error) throw error;
      return (data ?? []) as PendingActivity[];
    },
    enabled: !!studentId,
  });

  const predictions = useMemo(() => {
    if (!pendingQ.data) return [];
    return pendingQ.data.map((act) => {
      const features = buildFeaturesForPending({
        due_date: act.due_date,
        priority: act.priority,
        active_load: act.active_load,
        history_pct: Number(act.history_pct),
      });
      const prob = predictWithModel(model, features);
      return { ...act, prob };
    });
  }, [pendingQ.data, model]);

  const selected = studentsQ.data?.find((s) => s.user_id === studentId);

  return (
    <Section
      title="Predicción individual por estudiante"
      subtitle="Usa el modelo entrenado para estimar si un estudiante específico entregará cada actividad pendiente"
      icon={<UserSearch className="h-4 w-4 text-primary" />}
    >
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
          <div className="flex-1">
            <label className="font-body text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5 block">
              Estudiante
            </label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger className="font-body">
                <SelectValue placeholder="Selecciona un estudiante con actividades pendientes…" />
              </SelectTrigger>
              <SelectContent>
                {studentsQ.isLoading && (
                  <div className="px-2 py-3 text-xs font-body text-muted-foreground">Cargando…</div>
                )}
                {!studentsQ.isLoading && (studentsQ.data ?? []).length === 0 && (
                  <div className="px-2 py-3 text-xs font-body text-muted-foreground">
                    No hay estudiantes con actividades pendientes.
                  </div>
                )}
                {(studentsQ.data ?? []).map((s) => (
                  <SelectItem key={s.user_id} value={s.user_id}>
                    {s.display_name || "Estudiante"} · {s.pendientes} pendientes
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selected && predictions.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <p className="font-body text-[10px] uppercase tracking-wide text-muted-foreground">
                Promedio estudiante
              </p>
              <p className="font-display text-xl font-bold text-foreground tabular-nums">
                {(
                  (predictions.reduce((acc, p) => acc + p.prob, 0) / predictions.length) *
                  100
                ).toFixed(0)}
                %
              </p>
            </div>
          )}
        </div>

        {!studentId && (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
            <UserSearch className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="font-body text-sm text-muted-foreground">
              Selecciona un estudiante para ver la predicción de cada una de sus actividades pendientes.
            </p>
          </div>
        )}

        {studentId && pendingQ.isLoading && (
          <p className="font-body text-xs text-muted-foreground">Calculando predicciones…</p>
        )}

        {studentId && !pendingQ.isLoading && predictions.length === 0 && (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
            <p className="font-body text-sm text-muted-foreground">
              Este estudiante no tiene actividades pendientes.
            </p>
          </div>
        )}

        {predictions.length > 0 && (
          <div className="space-y-2">
            {predictions
              .sort((a, b) => a.prob - b.prob)
              .map((p) => (
                <PredictionRow key={p.activity_id} item={p} />
              ))}
          </div>
        )}

        <Hint>
          Esta predicción usa el mismo modelo recién entrenado y se calcula 100% en tu navegador. La
          probabilidad combina los días que faltan, prioridad, carga actual del estudiante e
          historial previo de cumplimiento.
        </Hint>
      </div>
    </Section>
  );
}

function PredictionRow({ item }: { item: PendingActivity & { prob: number } }) {
  const pct = Math.round(item.prob * 100);
  const tone =
    pct >= 70
      ? { bg: "bg-success/10", text: "text-success", border: "border-success/30", label: "Probable entrega" }
      : pct >= 40
        ? { bg: "bg-accent/10", text: "text-accent", border: "border-accent/30", label: "Riesgo medio" }
        : { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/30", label: "Alto riesgo" };

  const dueLabel = item.due_date
    ? new Date(item.due_date).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })
    : "Sin fecha";
  const isOverdue = item.due_date && new Date(item.due_date).getTime() < Date.now();

  return (
    <div className={`rounded-lg border ${tone.border} ${tone.bg} p-3 flex items-center gap-3`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-body text-sm font-semibold text-foreground truncate">{item.title}</p>
          {isOverdue && (
            <span className="inline-flex items-center gap-1 text-[10px] font-body uppercase tracking-wide text-destructive">
              <AlertTriangle className="h-3 w-3" /> Vencida
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 font-body text-[11px] text-muted-foreground">
          <span className="truncate">{item.subject_name || "Sin materia"}</span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" /> {dueLabel}
          </span>
          <span className="capitalize">Prioridad {item.priority}</span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className={`font-display text-2xl font-bold tabular-nums ${tone.text}`}>{pct}%</p>
        <p className={`font-body text-[10px] uppercase tracking-wide ${tone.text}`}>{tone.label}</p>
      </div>
    </div>
  );
}
