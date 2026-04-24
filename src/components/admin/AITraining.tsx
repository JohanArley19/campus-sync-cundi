import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Brain, Cpu, Database, Play, Activity, Target, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  buildRealSamples,
  trainModel,
  type EpochLog,
  type TrainingResult,
  type RealActivity,
  type RealHistoryRow,
} from "@/lib/aiTraining";
import { toast } from "sonner";

export function AITraining() {
  const [running, setRunning] = useState(false);
  const [epochs, setEpochs] = useState<EpochLog[]>([]);
  const [result, setResult] = useState<TrainingResult | null>(null);
  const [progress, setProgress] = useState(0);
  const totalEpochs = 30;
  const cancelRef = useRef(false);

  // Carga datos reales para el entrenamiento (requiere admin RLS)
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
        syntheticTarget: 600,
        epochs: totalEpochs,
        onEpochEnd: (log) => {
          setEpochs((prev) => [...prev, log]);
          setProgress(Math.round((log.epoch / totalEpochs) * 100));
        },
      });
      setResult(res);
      toast.success(`Entrenamiento completo · accuracy ${(res.accuracy * 100).toFixed(1)}%`);
    } catch (e) {
      console.error(e);
      toast.error("Error durante el entrenamiento");
    } finally {
      setRunning(false);
    }
  };

  const realCount = dataQ.data?.samples.length ?? 0;
  const chartData = epochs.map((e) => ({
    epoch: e.epoch,
    "Loss (train)": Number(e.loss.toFixed(4)),
    "Loss (val)": Number(e.val_loss.toFixed(4)),
    "Accuracy (train)": Number((e.acc * 100).toFixed(2)),
    "Accuracy (val)": Number((e.val_acc * 100).toFixed(2)),
  }));

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary-soft/40 via-card to-card p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md shrink-0">
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">
                Entrenamiento de modelo IA
              </h2>
              <p className="font-body text-sm text-muted-foreground mt-1 max-w-2xl">
                Red neuronal feed-forward (5 → 16 → 8 → 1) entrenada en tu navegador con
                TensorFlow.js sobre datos reales del aplicativo + dataset sintético. Predice si una
                actividad será <strong>realizada</strong> o <strong>no realizada</strong>.
              </p>
            </div>
          </div>
          <Button
            size="lg"
            onClick={handleTrain}
            disabled={running || dataQ.isLoading}
            className="font-body shrink-0"
          >
            <Play className="h-4 w-4 mr-2" />
            {running ? `Entrenando… ${progress}%` : "Iniciar entrenamiento"}
          </Button>
        </div>

        {/* Stats dataset */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <DatasetStat icon={<Database className="h-4 w-4" />} label="Muestras reales" value={realCount} />
          <DatasetStat icon={<Cpu className="h-4 w-4" />} label="Sintéticas" value={Math.max(0, 600 - realCount)} />
          <DatasetStat icon={<Activity className="h-4 w-4" />} label="Épocas" value={totalEpochs} />
          <DatasetStat icon={<Target className="h-4 w-4" />} label="Arquitectura" value="5→16→8→1" small />
        </div>

        {/* Barra de progreso */}
        {running && (
          <div className="mt-5">
            <div className="flex justify-between font-body text-xs text-muted-foreground mb-1.5">
              <span>Época {epochs.length} / {totalEpochs}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Gráficas */}
      <div className="grid lg:grid-cols-2 gap-4">
        <ChartPanel
          title="Curva de aprendizaje (Loss)"
          subtitle="Binary cross-entropy · menor es mejor"
        >
          {chartData.length === 0 ? (
            <EmptyChart message="Inicia el entrenamiento para ver la curva." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="epoch" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
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
                <Line type="monotone" dataKey="Loss (train)" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="Loss (val)" stroke="hsl(var(--destructive))" strokeWidth={2} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartPanel>

        <ChartPanel
          title="Curva de aprendizaje (Accuracy)"
          subtitle="Porcentaje de aciertos · mayor es mejor"
        >
          {chartData.length === 0 ? (
            <EmptyChart message="Inicia el entrenamiento para ver la curva." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="epoch" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
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
                <Line type="monotone" dataKey="Accuracy (train)" stroke="hsl(var(--success))" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="Accuracy (val)" stroke="hsl(var(--accent))" strokeWidth={2} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartPanel>
      </div>

      {/* Resultado final */}
      {result && (
        <div className="grid lg:grid-cols-2 gap-4">
          <ChartPanel title="Matriz de confusión" subtitle={`Sobre ${result.testCount} muestras de test`}>
            <ConfusionMatrixView result={result} />
          </ChartPanel>

          <ChartPanel title="Métricas finales" subtitle="Calculadas sobre el conjunto de validación">
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Accuracy" value={`${(result.accuracy * 100).toFixed(1)}%`} tone="success" />
              <Metric label="Precision" value={`${(result.precision * 100).toFixed(1)}%`} tone="primary" />
              <Metric label="Recall" value={`${(result.recall * 100).toFixed(1)}%`} tone="primary" />
              <Metric label="F1-score" value={`${(result.f1 * 100).toFixed(1)}%`} tone="accent" />
              <Metric label="Tiempo" value={`${(result.durationMs / 1000).toFixed(1)}s`} tone="muted" />
              <Metric label="Épocas" value={String(result.epochs)} tone="muted" />
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <p className="font-body text-xs text-muted-foreground mb-2">Composición del dataset</p>
              <div className="flex items-center gap-2 text-xs font-body">
                <Badge variant="outline" className="font-body">
                  {result.realCount} reales
                </Badge>
                <Badge variant="outline" className="font-body">
                  {result.syntheticCount} sintéticas
                </Badge>
                <Badge variant="outline" className="font-body">
                  {result.trainCount} train / {result.testCount} test
                </Badge>
              </div>
            </div>
          </ChartPanel>
        </div>
      )}

      {/* Tabla de épocas */}
      {epochs.length > 0 && (
        <ChartPanel title="Log de épocas" subtitle="Detalle por iteración">
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-sm font-body">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-xs uppercase text-muted-foreground">Época</th>
                  <th className="text-right py-2 px-2 text-xs uppercase text-muted-foreground">Loss</th>
                  <th className="text-right py-2 px-2 text-xs uppercase text-muted-foreground">Acc</th>
                  <th className="text-right py-2 px-2 text-xs uppercase text-muted-foreground">Val loss</th>
                  <th className="text-right py-2 px-2 text-xs uppercase text-muted-foreground">Val acc</th>
                </tr>
              </thead>
              <tbody>
                {epochs.map((e) => (
                  <tr key={e.epoch} className="border-b border-border/50">
                    <td className="py-1.5 px-2 font-semibold">{e.epoch}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{e.loss.toFixed(4)}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{(e.acc * 100).toFixed(2)}%</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{e.val_loss.toFixed(4)}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{(e.val_acc * 100).toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartPanel>
      )}
    </div>
  );
}

/* ---------- Subcomponentes ---------- */

function DatasetStat({
  icon, label, value, small,
}: { icon: React.ReactNode; label: string; value: number | string; small?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card/60 p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        {icon}
        <span className="font-body text-[10px] uppercase tracking-wide">{label}</span>
      </div>
      <p className={`font-display font-bold text-foreground ${small ? "text-base" : "text-xl"}`}>{value}</p>
    </div>
  );
}

function ChartPanel({
  title, subtitle, children,
}: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3">
        <h3 className="font-display text-base font-bold text-foreground">{title}</h3>
        {subtitle && <p className="font-body text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="h-64">{children}</div>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-full flex items-center justify-center">
      <p className="font-body text-xs text-muted-foreground text-center max-w-xs">{message}</p>
    </div>
  );
}

function Metric({
  label, value, tone,
}: {
  label: string;
  value: string;
  tone: "primary" | "accent" | "success" | "muted";
}) {
  const toneCls = {
    primary: "bg-primary-soft text-primary",
    accent: "bg-accent-soft text-accent",
    success: "bg-success/10 text-success",
    muted: "bg-muted text-foreground",
  }[tone];
  return (
    <div className={`rounded-lg p-3 ${toneCls}`}>
      <p className="font-body text-[10px] uppercase tracking-wide opacity-80">{label}</p>
      <p className="font-display text-xl font-bold mt-0.5">{value}</p>
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
        className={`rounded-lg p-3 flex flex-col justify-between border ${
          good ? "border-success/40" : "border-destructive/40"
        }`}
        style={{
          backgroundColor: good
            ? `hsl(var(--success) / ${0.08 + intensity * 0.25})`
            : `hsl(var(--destructive) / ${0.08 + intensity * 0.25})`,
        }}
      >
        <div className="flex items-center gap-1.5">
          {good ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-destructive" />
          )}
          <span className="font-body text-[10px] uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
        </div>
        <p className="font-display text-2xl font-bold text-foreground">{val}</p>
        <p className="font-body text-[10px] text-muted-foreground">{sub}</p>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="grid grid-cols-[auto_1fr_1fr] gap-2 flex-1">
        <div />
        <div className="text-center font-body text-[10px] uppercase tracking-wide text-muted-foreground self-center">
          Pred: Realizada
        </div>
        <div className="text-center font-body text-[10px] uppercase tracking-wide text-muted-foreground self-center">
          Pred: No realizada
        </div>

        <div className="font-body text-[10px] uppercase tracking-wide text-muted-foreground self-center [writing-mode:vertical-rl] rotate-180 text-center">
          Real: Sí
        </div>
        {cell(tp, "TP", true, "Acertó realizada")}
        {cell(fn, "FN", false, "Dijo que no, era sí")}

        <div className="font-body text-[10px] uppercase tracking-wide text-muted-foreground self-center [writing-mode:vertical-rl] rotate-180 text-center">
          Real: No
        </div>
        {cell(fp, "FP", false, "Dijo sí, era no")}
        {cell(tn, "TN", true, "Acertó no realizada")}
      </div>
    </div>
  );
}
