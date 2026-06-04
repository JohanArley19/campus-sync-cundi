import type { Subject } from "@/hooks/useSubjects";

// Valor centinela para materias sin semestre asignado.
export const NO_SEMESTER = "__none__";
export const NO_SEMESTER_LABEL = "Sin asignar";

/** Devuelve el semestre actual en formato "YYYY-N" (1 = ene-jun, 2 = jul-dic). */
export function currentSemester(date = new Date()): string {
  const year = date.getFullYear();
  const term = date.getMonth() < 6 ? 1 : 2;
  return `${year}-${term}`;
}

/** Genera opciones estructuradas de semestre desde 3 años atrás hasta el siguiente. */
export function generateSemesterOptions(date = new Date()): string[] {
  const year = date.getFullYear();
  const options: string[] = [];
  for (let y = year + 1; y >= year - 3; y--) {
    options.push(`${y}-2`);
    options.push(`${y}-1`);
  }
  return options;
}

/** Etiqueta legible para un semestre. */
export function formatSemester(value: string | null | undefined): string {
  if (!value || value === NO_SEMESTER) return NO_SEMESTER_LABEL;
  const m = value.match(/^(\d{4})-(\d)$/);
  if (m) {
    const term = m[2] === "1" ? "Primer periodo" : "Segundo periodo";
    return `${m[1]} · ${term}`;
  }
  return value;
}

/** Orden descendente: "YYYY-N" recientes primero, luego texto libre, luego "Sin asignar". */
export function compareSemesters(a: string, b: string): number {
  if (a === NO_SEMESTER) return 1;
  if (b === NO_SEMESTER) return -1;
  const ma = a.match(/^(\d{4})-(\d)$/);
  const mb = b.match(/^(\d{4})-(\d)$/);
  if (ma && mb) {
    const ya = Number(ma[1]) * 10 + Number(ma[2]);
    const yb = Number(mb[1]) * 10 + Number(mb[2]);
    return yb - ya;
  }
  if (ma) return -1;
  if (mb) return 1;
  return a.localeCompare(b);
}

/** Clave de semestre de una materia (null -> centinela). */
export function subjectSemesterKey(subject: Pick<Subject, "semester">): string {
  return subject.semester && subject.semester.trim() ? subject.semester : NO_SEMESTER;
}

/** Lista de semestres presentes en las materias, ordenados. */
export function availableSemesters(subjects: Pick<Subject, "semester">[]): string[] {
  const set = new Set<string>();
  subjects.forEach((s) => set.add(subjectSemesterKey(s)));
  return Array.from(set).sort(compareSemesters);
}
