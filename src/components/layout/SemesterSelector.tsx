import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useSemester } from "@/contexts/SemesterContext";
import { formatSemester, generateSemesterOptions, currentSemester } from "@/lib/semester";
import { CalendarRange, Plus } from "lucide-react";
import { toast } from "sonner";

const START_NEW = "__start_new__";

export function SemesterSelector() {
  const { selected, setSelected, semesters, startSemester } = useSemester();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newSemester, setNewSemester] = useState<string>(currentSemester());

  // Opciones que aún no se han iniciado.
  const candidateOptions = generateSemesterOptions().filter((o) => !semesters.includes(o));

  const handleChange = (value: string) => {
    if (value === START_NEW) {
      setNewSemester(candidateOptions[0] ?? currentSemester());
      setDialogOpen(true);
      return;
    }
    setSelected(value);
  };

  const handleStart = () => {
    if (semesters.includes(newSemester)) {
      setSelected(newSemester);
    } else {
      startSemester(newSemester);
      toast.success(`Nuevo semestre iniciado: ${formatSemester(newSemester)}`);
    }
    setDialogOpen(false);
  };

  return (
    <>
      <Select value={selected ?? undefined} onValueChange={handleChange}>
        <SelectTrigger className="h-9 w-auto min-w-[150px] gap-2 font-body text-sm">
          <CalendarRange className="h-4 w-4 text-muted-foreground shrink-0" />
          <SelectValue placeholder="Iniciar semestre" />
        </SelectTrigger>
        <SelectContent align="end">
          {semesters.map((s) => (
            <SelectItem key={s} value={s}>
              {formatSemester(s)}
            </SelectItem>
          ))}
          {semesters.length > 0 && <SelectSeparator />}
          <SelectItem value={START_NEW} className="text-primary font-medium">
            <span className="flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Iniciar nuevo semestre
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Iniciar nuevo semestre</DialogTitle>
            <DialogDescription className="font-body">
              Selecciona el periodo. Quedará activo para que agregues tus materias y actividades.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <Label className="font-body">Periodo</Label>
            <Select value={newSemester} onValueChange={setNewSemester}>
              <SelectTrigger className="font-body">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(candidateOptions.length > 0 ? candidateOptions : generateSemesterOptions()).map((o) => (
                  <SelectItem key={o} value={o}>
                    {formatSemester(o)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" className="font-body" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button className="font-body" onClick={handleStart}>
              Iniciar semestre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
