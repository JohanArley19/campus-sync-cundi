import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSubjects } from "@/hooks/useSubjects";
import { availableSemesters, compareSemesters, currentSemester } from "@/lib/semester";

interface SemesterContextValue {
  /** Semestre seleccionado actualmente (clave). */
  selected: string | null;
  setSelected: (value: string) => void;
  /** Semestres disponibles según las materias del usuario + los iniciados manualmente. */
  semesters: string[];
  /** Inicia un nuevo semestre (aunque aún no tenga materias) y lo deja seleccionado. */
  startSemester: (value: string) => void;
  isLoading: boolean;
}

const SemesterContext = createContext<SemesterContextValue | undefined>(undefined);

const STORAGE_KEY = "campussync.selectedSemester";
const MANUAL_KEY = "campussync.manualSemesters";

function readManual(): string[] {
  try {
    const raw = localStorage.getItem(MANUAL_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function SemesterProvider({ children }: { children: ReactNode }) {
  const { data: subjects = [], isLoading } = useSubjects();
  const [selected, setSelectedState] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY);
  });
  // Semestres iniciados manualmente que aún no tienen materias asociadas.
  const [manual, setManual] = useState<string[]>(() => readManual());

  const semesters = useMemo(() => {
    const fromSubjects = availableSemesters(subjects);
    const merged = new Set([...fromSubjects, ...manual]);
    return Array.from(merged).sort(compareSemesters);
  }, [subjects, manual]);

  // Asegura que el seleccionado sea válido; si no, elige el más reciente
  // (o el semestre actual si está disponible).
  useEffect(() => {
    if (semesters.length === 0) return;
    if (selected && semesters.includes(selected)) return;
    const current = currentSemester();
    const preferred = semesters.includes(current)
      ? current
      : [...semesters].sort(compareSemesters)[0];
    setSelectedState(preferred);
  }, [semesters, selected]);

  const setSelected = (value: string) => {
    setSelectedState(value);
    localStorage.setItem(STORAGE_KEY, value);
  };

  const startSemester = (value: string) => {
    setManual((prev) => {
      if (prev.includes(value)) return prev;
      const next = [...prev, value];
      localStorage.setItem(MANUAL_KEY, JSON.stringify(next));
      return next;
    });
    setSelected(value);
  };

  const value = useMemo<SemesterContextValue>(
    () => ({ selected, setSelected, semesters, startSemester, isLoading }),
    [selected, semesters, isLoading],
  );

  return <SemesterContext.Provider value={value}>{children}</SemesterContext.Provider>;
}

export function useSemester() {
  const ctx = useContext(SemesterContext);
  if (!ctx) throw new Error("useSemester debe usarse dentro de SemesterProvider");
  return ctx;
}
