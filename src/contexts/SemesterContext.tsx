import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSubjects } from "@/hooks/useSubjects";
import { availableSemesters, compareSemesters, currentSemester } from "@/lib/semester";

interface SemesterContextValue {
  /** Semestre seleccionado actualmente (clave). */
  selected: string | null;
  setSelected: (value: string) => void;
  /** Semestres disponibles según las materias del usuario. */
  semesters: string[];
  isLoading: boolean;
}

const SemesterContext = createContext<SemesterContextValue | undefined>(undefined);

const STORAGE_KEY = "campussync.selectedSemester";

export function SemesterProvider({ children }: { children: ReactNode }) {
  const { data: subjects = [], isLoading } = useSubjects();
  const [selected, setSelectedState] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY);
  });

  const semesters = useMemo(() => availableSemesters(subjects), [subjects]);

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

  const value = useMemo<SemesterContextValue>(
    () => ({ selected, setSelected, semesters, isLoading }),
    [selected, semesters, isLoading],
  );

  return <SemesterContext.Provider value={value}>{children}</SemesterContext.Provider>;
}

export function useSemester() {
  const ctx = useContext(SemesterContext);
  if (!ctx) throw new Error("useSemester debe usarse dentro de SemesterProvider");
  return ctx;
}
