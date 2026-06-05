import type { Activity } from "@/hooks/useActivities";
import type { Subject } from "@/hooks/useSubjects";

export const GRADE_MIN = 0;
export const GRADE_MAX = 5;
export const PASS_THRESHOLD = 3.0;

/** Actividades con calificación y peso válidos. */
function gradedActivities(activities: Activity[]) {
  return activities.filter(
    (a) =>
      a.grade !== null &&
      a.grade !== undefined &&
      a.weight !== null &&
      a.weight !== undefined &&
      Number(a.weight) > 0,
  );
}

export interface SubjectGrade {
  /** Promedio ponderado de lo calificado hasta ahora (sobre lo evaluado). */
  currentAverage: number | null;
  /** Nota ya asegurada (puntos acumulados sobre el total del 100%). */
  earned: number;
  /** Suma de pesos ya calificados (0–100+). */
  gradedWeight: number;
  /** Suma total de pesos registrados (calificados o no). */
  totalWeight: number;
  /** Proyección de nota final manteniendo el promedio actual. */
  projected: number | null;
  /** Si ya hay al menos una actividad calificada. */
  hasGrades: boolean;
}

export function subjectGrade(activities: Activity[]): SubjectGrade {
  const graded = gradedActivities(activities);
  const totalWeight = activities.reduce(
    (sum, a) => sum + (a.weight ? Number(a.weight) : 0),
    0,
  );
  const gradedWeight = graded.reduce((sum, a) => sum + Number(a.weight), 0);

  if (graded.length === 0 || gradedWeight === 0) {
    return {
      currentAverage: null,
      earned: 0,
      gradedWeight,
      totalWeight,
      projected: null,
      hasGrades: false,
    };
  }

  const weightedSum = graded.reduce(
    (sum, a) => sum + Number(a.grade) * Number(a.weight),
    0,
  );
  const currentAverage = weightedSum / gradedWeight;
  // Nota asegurada = puntos obtenidos sobre el 100% total.
  const earned = weightedSum / 100;
  // Proyección: mantiene el promedio actual en el peso restante (hasta 100%).
  const remaining = Math.max(0, 100 - gradedWeight);
  const projected = earned + (remaining * currentAverage) / 100;

  return {
    currentAverage: round1(currentAverage),
    earned: round1(earned),
    gradedWeight: round1(gradedWeight),
    totalWeight: round1(totalWeight),
    projected: round1(Math.min(GRADE_MAX, projected)),
    hasGrades: true,
  };
}

export interface SemesterGpa {
  /** Promedio ponderado por créditos de las notas proyectadas. */
  gpa: number | null;
  /** Créditos totales considerados (materias con nota y créditos). */
  credits: number;
}

export function semesterGpa(
  subjects: Subject[],
  activitiesBySubject: Map<string, Activity[]>,
): SemesterGpa {
  let weighted = 0;
  let credits = 0;
  subjects.forEach((s) => {
    const g = subjectGrade(activitiesBySubject.get(s.id) ?? []);
    const c = s.credits ?? 0;
    if (g.projected !== null && c > 0) {
      weighted += g.projected * c;
      credits += c;
    }
  });
  if (credits === 0) return { gpa: null, credits: 0 };
  return { gpa: round1(weighted / credits), credits };
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function gradeTone(grade: number | null): "success" | "warning" | "danger" | "muted" {
  if (grade === null) return "muted";
  if (grade >= PASS_THRESHOLD) return "success";
  if (grade >= PASS_THRESHOLD - 0.5) return "warning";
  return "danger";
}
