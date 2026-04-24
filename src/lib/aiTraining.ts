// Entrenamiento de un modelo real (TensorFlow.js) en el navegador.
// Predice si una actividad será "realizada" (1) o "no_realizada" (0)
// a partir de 5 features numéricas normalizadas.
//
// Features:
//   0 - days_to_due (clamped -30..60, normalizado /60)
//   1 - priority (0=baja, 0.5=media, 1=alta)
//   2 - active_load (#actividades pendientes del usuario, /20)
//   3 - student_history_pct (0..1)
//   4 - is_overdue (0/1)

import * as tf from "@tensorflow/tfjs";

export type Sample = {
  features: number[]; // length 5
  label: number; // 0 | 1
};

export type EpochLog = {
  epoch: number;
  loss: number;
  acc: number;
  val_loss: number;
  val_acc: number;
};

export type ConfusionMatrix = {
  tp: number; // realizadas predichas como realizadas
  tn: number;
  fp: number;
  fn: number;
};

export type TrainingResult = {
  history: EpochLog[];
  confusion: ConfusionMatrix;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  totalSamples: number;
  realCount: number;
  syntheticCount: number;
  trainCount: number;
  testCount: number;
  durationMs: number;
  epochs: number;
};

// ---------- Generación de dataset sintético ----------

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

/**
 * Genera muestras sintéticas con una regla "razonable":
 * - Más probable de cumplirse si historial alto, prioridad alta y no está vencida.
 * - Carga muy alta y poco tiempo reducen probabilidad.
 */
export function generateSynthetic(n: number): Sample[] {
  const out: Sample[] = [];
  for (let i = 0; i < n; i++) {
    const days = Math.round(rand(-15, 45));
    const prio = [0, 0.5, 1][Math.floor(Math.random() * 3)];
    const load = Math.round(rand(0, 18));
    const history = rand(0.2, 0.95);
    const overdue = days < 0 ? 1 : 0;

    // probabilidad base
    let p = 0.5;
    p += (history - 0.5) * 0.6; // historial alto ayuda mucho
    p += (prio - 0.5) * 0.25; // prioridad alta ayuda
    p -= overdue * 0.35; // vencida penaliza fuerte
    p -= Math.min(load, 15) / 15 * 0.25; // mucha carga penaliza
    p += Math.max(0, Math.min(days, 14)) / 14 * 0.15; // tiempo razonable ayuda
    p += rand(-0.08, 0.08); // ruido
    p = Math.max(0.02, Math.min(0.98, p));

    const label = Math.random() < p ? 1 : 0;
    out.push({
      features: [
        Math.max(-30, Math.min(60, days)) / 60,
        prio,
        Math.min(load, 20) / 20,
        history,
        overdue,
      ],
      label,
    });
  }
  return out;
}

// ---------- Construcción a partir de datos reales ----------

export type RealActivity = {
  status: "pendiente" | "realizada" | "no_realizada";
  priority: "baja" | "media" | "alta";
  due_date: string | null;
  user_id: string;
};

export type RealHistoryRow = {
  user_id: string;
  new_status: "realizada" | "no_realizada" | "pendiente";
  recorded_at: string;
};

const PRIO_MAP: Record<string, number> = { baja: 0, media: 0.5, alta: 1 };

export function buildRealSamples(
  activities: RealActivity[],
  history: RealHistoryRow[],
): Sample[] {
  // historial por usuario
  const byUser = new Map<string, { done: number; total: number }>();
  for (const h of history) {
    if (h.new_status !== "realizada" && h.new_status !== "no_realizada") continue;
    const cur = byUser.get(h.user_id) ?? { done: 0, total: 0 };
    cur.total += 1;
    if (h.new_status === "realizada") cur.done += 1;
    byUser.set(h.user_id, cur);
  }

  const userPct = (uid: string) => {
    const r = byUser.get(uid);
    return r && r.total > 0 ? r.done / r.total : 0.5;
  };

  // carga (pendientes) por usuario
  const loadByUser = new Map<string, number>();
  for (const a of activities) {
    if (a.status === "pendiente") {
      loadByUser.set(a.user_id, (loadByUser.get(a.user_id) ?? 0) + 1);
    }
  }

  const now = Date.now();
  const samples: Sample[] = [];
  for (const a of activities) {
    if (a.status === "pendiente") continue; // sólo casos resueltos
    const days = a.due_date
      ? Math.round((new Date(a.due_date).getTime() - now) / 86400000)
      : 7;
    const overdue = a.due_date && new Date(a.due_date).getTime() < now ? 1 : 0;
    samples.push({
      features: [
        Math.max(-30, Math.min(60, days)) / 60,
        PRIO_MAP[a.priority] ?? 0.5,
        Math.min(loadByUser.get(a.user_id) ?? 0, 20) / 20,
        userPct(a.user_id),
        overdue,
      ],
      label: a.status === "realizada" ? 1 : 0,
    });
  }
  return samples;
}

// ---------- Entrenamiento ----------

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function trainModel(opts: {
  real: Sample[];
  syntheticTarget?: number; // total mínimo deseado
  epochs?: number;
  onEpochEnd?: (log: EpochLog) => void;
}): Promise<TrainingResult> {
  const targetTotal = opts.syntheticTarget ?? 500;
  const epochs = opts.epochs ?? 30;
  const realCount = opts.real.length;
  const syntheticCount = Math.max(0, targetTotal - realCount);
  const synthetic = generateSynthetic(syntheticCount);

  const all = shuffle([...opts.real, ...synthetic]);
  if (all.length < 20) {
    // mínimo de seguridad
    const extra = generateSynthetic(20 - all.length);
    all.push(...extra);
  }

  const split = Math.floor(all.length * 0.8);
  const train = all.slice(0, split);
  const test = all.slice(split);

  const xTrain = tf.tensor2d(train.map((s) => s.features));
  const yTrain = tf.tensor2d(train.map((s) => [s.label]));
  const xTest = tf.tensor2d(test.map((s) => s.features));
  const yTest = tf.tensor2d(test.map((s) => [s.label]));

  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [5], units: 16, activation: "relu" }));
  model.add(tf.layers.dense({ units: 8, activation: "relu" }));
  model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));
  model.compile({
    optimizer: tf.train.adam(0.01),
    loss: "binaryCrossentropy",
    metrics: ["accuracy"],
  });

  const history: EpochLog[] = [];
  const start = performance.now();

  await model.fit(xTrain, yTrain, {
    epochs,
    batchSize: 32,
    validationData: [xTest, yTest],
    shuffle: true,
    callbacks: {
      onEpochEnd: async (epoch, logs) => {
        // Permitir que el navegador respire entre épocas para que se vea el progreso
        await tf.nextFrame();
        const log: EpochLog = {
          epoch: epoch + 1,
          loss: Number(logs?.loss ?? 0),
          acc: Number(logs?.acc ?? logs?.accuracy ?? 0),
          val_loss: Number(logs?.val_loss ?? 0),
          val_acc: Number(logs?.val_acc ?? logs?.val_accuracy ?? 0),
        };
        history.push(log);
        opts.onEpochEnd?.(log);
      },
    },
  });

  const durationMs = performance.now() - start;

  // Matriz de confusión sobre test
  const preds = (model.predict(xTest) as tf.Tensor).dataSync();
  const labels = yTest.dataSync();
  let tp = 0,
    tn = 0,
    fp = 0,
    fn = 0;
  for (let i = 0; i < preds.length; i++) {
    const p = preds[i] >= 0.5 ? 1 : 0;
    const y = labels[i];
    if (p === 1 && y === 1) tp++;
    else if (p === 0 && y === 0) tn++;
    else if (p === 1 && y === 0) fp++;
    else fn++;
  }
  const accuracy = (tp + tn) / Math.max(1, preds.length);
  const precision = tp / Math.max(1, tp + fp);
  const recall = tp / Math.max(1, tp + fn);
  const f1 = (2 * precision * recall) / Math.max(1e-9, precision + recall);

  // limpieza
  xTrain.dispose();
  yTrain.dispose();
  xTest.dispose();
  yTest.dispose();
  model.dispose();

  return {
    history,
    confusion: { tp, tn, fp, fn },
    accuracy,
    precision,
    recall,
    f1,
    totalSamples: all.length,
    realCount,
    syntheticCount,
    trainCount: train.length,
    testCount: test.length,
    durationMs,
    epochs,
  };
}
