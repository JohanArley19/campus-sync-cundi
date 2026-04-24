import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Clock,
  Flame,
} from "lucide-react";

type DayKey = "lun" | "mar" | "mie" | "jue" | "vie";

interface DayData {
  label: string;
  fullLabel: string;
  mood: string;
  pending: number;
  done: number;
  overdue: number;
  streak: number;
  completion: number;
  highlight: {
    title: string;
    subject: string;
    priority: "alta" | "media" | "baja";
    aiReason: string;
  };
  insight: string;
  insightTone: "warning" | "success" | "info";
}

const DAYS: Record<DayKey, DayData> = {
  lun: {
    label: "Lun",
    fullLabel: "Lunes",
    mood: "Arranca la semana",
    pending: 7,
    done: 0,
    overdue: 1,
    streak: 0,
    completion: 0,
    highlight: {
      title: "Parcial Cálculo Multivariable",
      subject: "Cálculo III",
      priority: "alta",
      aiReason: "Examen en 4 días con peso del 35% del corte. Empieza hoy.",
    },
    insight: "Tienes 1 actividad vencida. Resuélvela antes de las 6 PM para no acumular carga.",
    insightTone: "warning",
  },
  mar: {
    label: "Mar",
    fullLabel: "Martes",
    mood: "Tomando ritmo",
    pending: 6,
    done: 1,
    overdue: 0,
    streak: 1,
    completion: 50,
    highlight: {
      title: "Taller de Algoritmos Genéticos",
      subject: "IA Aplicada",
      priority: "alta",
      aiReason: "Entrega mañana. Bloque de 90 min sugerido entre 4-6 PM.",
    },
    insight: "Día limpio: cero vencidas. Mantén el enfoque en lo que vence mañana.",
    insightTone: "info",
  },
  mie: {
    label: "Mié",
    fullLabel: "Miércoles",
    mood: "Foco profundo",
    pending: 4,
    done: 3,
    overdue: 0,
    streak: 3,
    completion: 75,
    highlight: {
      title: "Documentación PGC corregida",
      subject: "Proyecto de Grado",
      priority: "media",
      aiReason: "Tu tutor pidió cambios. Mejor cerrarlo antes del parcial del viernes.",
    },
    insight: "Llevas 3 días seguidos cumpliendo. ¡Estás en racha!",
    insightTone: "success",
  },
  jue: {
    label: "Jue",
    fullLabel: "Jueves",
    mood: "Sprint final",
    pending: 3,
    done: 5,
    overdue: 0,
    streak: 4,
    completion: 83,
    highlight: {
      title: "Repaso integrales triples",
      subject: "Cálculo III",
      priority: "alta",
      aiReason: "Mañana es el parcial. Última sesión de práctica recomendada.",
    },
    insight: "Vas 83% de cumplimiento esta semana. Por encima de tu promedio.",
    insightTone: "success",
  },
  vie: {
    label: "Vie",
    fullLabel: "Viernes",
    mood: "Cierre de semana",
    pending: 1,
    done: 8,
    overdue: 0,
    streak: 5,
    completion: 92,
    highlight: {
      title: "Subir notas de la semana",
      subject: "Hábitos",
      priority: "baja",
      aiReason: "Reflexionar sobre la semana mejora tu aprendizaje 27% (estudio Nature).",
    },
    insight: "Semana cerrada con 92%. Compártelo con tu equipo.",
    insightTone: "success",
  },
};

const DAY_KEYS: DayKey[] = ["lun", "mar", "mie", "jue", "vie"];

const PRIORITY_STYLES = {
  alta: "bg-destructive/10 text-destructive border-destructive/30",
  media: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  baja: "bg-muted text-muted-foreground border-border",
};

const INSIGHT_STYLES = {
  warning: "bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-200",
  success: "bg-primary-soft border-primary/30 text-primary",
  info: "bg-secondary border-border text-foreground",
};

export default function InteractiveDemo() {
  const [active, setActive] = useState<DayKey>("mie");
  const data = DAYS[active];

  return (
    <section className="px-6 py-20 sm:py-24 bg-gradient-to-b from-background to-secondary/30">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-10 max-w-2xl mx-auto">
          <span className="font-body text-xs uppercase tracking-widest text-accent font-semibold">
            Una semana con CampusSync
          </span>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-foreground text-balance">
            Mira cómo cambia tu semana, día a día
          </h2>
          <p className="mt-3 text-muted-foreground text-balance">
            Selecciona un día y descubre qué te muestra el sistema, qué prioriza la IA
            y cómo evoluciona tu cumplimiento.
          </p>
        </div>

        {/* Selector de días */}
        <div className="flex justify-center mb-8">
          <div
            role="tablist"
            aria-label="Días de la semana"
            className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1.5 shadow-sm"
          >
            {DAY_KEYS.map((k) => {
              const isActive = active === k;
              return (
                <button
                  key={k}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActive(k)}
                  className={`relative px-4 py-2 text-sm font-body font-semibold rounded-full transition-colors ${
                    isActive
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="day-pill"
                      className="absolute inset-0 bg-primary rounded-full shadow-emerald"
                      transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
                    />
                  )}
                  <span className="relative">{DAYS[k].label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mockup interactivo */}
        <div className="rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
          {/* Barra superior estilo navegador */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/40">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            </div>
            <div className="flex-1 mx-4 px-3 py-1 rounded-md bg-card border border-border text-[11px] text-muted-foreground font-mono">
              campussync.app/dashboard — {data.fullLabel}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="p-5 sm:p-7 grid gap-5 lg:grid-cols-3"
            >
              {/* Columna 1: KPIs */}
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  {data.mood}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <KPI
                    icon={Clock}
                    label="Pendientes"
                    value={data.pending}
                    tone="neutral"
                  />
                  <KPI
                    icon={CheckCircle2}
                    label="Realizadas"
                    value={data.done}
                    tone="success"
                  />
                  <KPI
                    icon={AlertTriangle}
                    label="Vencidas"
                    value={data.overdue}
                    tone={data.overdue > 0 ? "danger" : "neutral"}
                  />
                  <KPI
                    icon={Flame}
                    label="Racha"
                    value={`${data.streak}d`}
                    tone={data.streak >= 3 ? "success" : "neutral"}
                  />
                </div>

                {/* Barra de cumplimiento */}
                <div className="rounded-lg border border-border bg-background p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-body font-medium text-muted-foreground">
                      Cumplimiento semanal
                    </span>
                    <span className="text-sm font-display font-bold text-foreground tabular-nums">
                      {data.completion}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      key={`bar-${active}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${data.completion}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                </div>
              </div>

              {/* Columna 2-3: Tarjeta IA */}
              <div className="lg:col-span-2 space-y-3">
                <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary-soft to-card p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 shrink-0 rounded-lg bg-primary flex items-center justify-center shadow-emerald">
                      <Sparkles className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-primary">
                          Sugerencia de la IA
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${PRIORITY_STYLES[data.highlight.priority]}`}
                        >
                          {data.highlight.priority}
                        </span>
                      </div>
                      <h3 className="font-display text-lg font-bold text-foreground leading-tight">
                        {data.highlight.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                        {data.highlight.subject}
                      </p>
                      <p className="text-sm text-foreground leading-relaxed">
                        {data.highlight.aiReason}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Insight del día */}
                <div
                  className={`rounded-xl border p-4 flex items-start gap-3 ${INSIGHT_STYLES[data.insightTone]}`}
                >
                  {data.insightTone === "success" ? (
                    <TrendingUp className="h-4 w-4 mt-0.5 shrink-0" />
                  ) : data.insightTone === "warning" ? (
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  ) : (
                    <CalendarDays className="h-4 w-4 mt-0.5 shrink-0" />
                  )}
                  <p className="text-sm font-body leading-relaxed">{data.insight}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4 font-body">
          ✦ Datos de demostración. Tu experiencia real se construye con tus propias actividades.
        </p>
      </div>
    </section>
  );
}

function KPI({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  tone: "neutral" | "success" | "danger";
}) {
  const toneStyles = {
    neutral: "text-foreground",
    success: "text-primary",
    danger: "text-destructive",
  }[tone];

  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`h-3.5 w-3.5 ${toneStyles}`} />
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          {label}
        </span>
      </div>
      <p className={`font-display text-2xl font-black tabular-nums ${toneStyles}`}>
        {value}
      </p>
    </div>
  );
}
