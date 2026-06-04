import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSemester } from "@/contexts/SemesterContext";
import { formatSemester } from "@/lib/semester";
import { CalendarRange } from "lucide-react";

export function SemesterSelector() {
  const { selected, setSelected, semesters } = useSemester();

  if (semesters.length === 0) return null;

  return (
    <Select value={selected ?? undefined} onValueChange={setSelected}>
      <SelectTrigger className="h-9 w-auto min-w-[150px] gap-2 font-body text-sm">
        <CalendarRange className="h-4 w-4 text-muted-foreground shrink-0" />
        <SelectValue placeholder="Semestre" />
      </SelectTrigger>
      <SelectContent align="end">
        {semesters.map((s) => (
          <SelectItem key={s} value={s}>
            {formatSemester(s)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
