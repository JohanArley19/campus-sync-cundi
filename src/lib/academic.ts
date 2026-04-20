import type { Activity, ActivityStatus, ActivityPriority } from "@/hooks/useActivities";

export const STATUS_LABELS: Record<ActivityStatus, string> = {
  pendiente: "Pendiente",
  realizada: "Realizada",
  no_realizada: "No realizada",
};

export const PRIORITY_LABELS: Record<ActivityPriority, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

export const SUBJECT_COLORS = [
  "#1F6B47", // verde institucional
  "#C49B2D", // dorado
  "#1F4E79", // azul profundo
  "#7A2E2E", // vinotinto
  "#4B3B70", // morado
  "#2D6E7E", // teal
  "#8B4513", // marrón
  "#5C5C5C", // gris carbón
];

export function daysUntil(dateString: string | null): number | null {
  if (!dateString) return null;
  const due = new Date(dateString).getTime();
  const now = Date.now();
  return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
}

export function completionRate(activities: Activity[]): number {
  const finished = activities.filter(
    (a) => a.status === "realizada" || a.status === "no_realizada"
  );
  if (finished.length === 0) return 0;
  const done = finished.filter((a) => a.status === "realizada").length;
  return Math.round((done / finished.length) * 100);
}

export function formatDate(dateString: string | null): string {
  if (!dateString) return "Sin fecha";
  return new Date(dateString).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
