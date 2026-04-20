import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSubjects, useCreateSubject, useUpdateSubject, useDeleteSubject, type Subject } from "@/hooks/useSubjects";
import { useActivities } from "@/hooks/useActivities";
import { SUBJECT_COLORS } from "@/lib/academic";
import { Plus, BookOpen, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";

export default function Subjects() {
  const { data: subjects = [], isLoading } = useSubjects();
  const { data: activities = [] } = useActivities();
  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();
  const deleteSubject = useDeleteSubject();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [semester, setSemester] = useState("");
  const [color, setColor] = useState(SUBJECT_COLORS[0]);

  const openNew = () => {
    setEditing(null);
    setName("");
    setCode("");
    setSemester("");
    setColor(SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length]);
    setDialogOpen(true);
  };

  const openEdit = (s: Subject) => {
    setEditing(s);
    setName(s.name);
    setCode(s.code ?? "");
    setSemester(s.semester ?? "");
    setColor(s.color);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    try {
      if (editing) {
        await updateSubject.mutateAsync({
          id: editing.id,
          name: name.trim(),
          code: code.trim() || null,
          semester: semester.trim() || null,
          color,
        });
        toast.success("Materia actualizada");
      } else {
        await createSubject.mutateAsync({
          name: name.trim(),
          code: code.trim() || null,
          semester: semester.trim() || null,
          color,
        });
        toast.success("Materia creada");
      }
      setDialogOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Error al guardar");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSubject.mutateAsync(deleteTarget.id);
      toast.success("Materia eliminada");
      setDeleteTarget(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Error al eliminar");
    }
  };

  return (
    <AppShell
      title="Materias"
      subtitle="Gestiona las materias de tu semestre"
      actions={
        <Button size="sm" onClick={openNew} className="font-body shadow-sm">
          <Plus className="h-4 w-4 mr-1" />
          Nueva materia
        </Button>
      }
    >
      <SEOHead title="Materias — Sistema Académico" />

      <div className="p-4 sm:p-6 max-w-6xl mx-auto animate-fade-in">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-12 font-body text-sm">Cargando…</p>
        ) : subjects.length === 0 ? (
          <EmptySubjects onAdd={openNew} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((s) => {
              const count = activities.filter((a) => a.subject_id === s.id).length;
              const pendingCount = activities.filter((a) => a.subject_id === s.id && a.status === "pendiente").length;
              return (
                <div
                  key={s.id}
                  className="group rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: s.color }}
                    >
                      <BookOpen className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-base font-bold text-foreground truncate">{s.name}</h3>
                      {s.code && (
                        <p className="font-body text-xs text-muted-foreground">{s.code}</p>
                      )}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(s)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(s)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs font-body">
                    <span className="text-muted-foreground">
                      {s.semester ?? "Sin semestre"}
                    </span>
                    <span className="text-foreground">
                      {count} {count === 1 ? "actividad" : "actividades"}
                      {pendingCount > 0 && (
                        <span className="text-accent font-semibold"> · {pendingCount} pend.</span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">
              {editing ? "Editar materia" : "Nueva materia"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="font-body text-xs">Nombre *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Cálculo Diferencial" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="font-body text-xs">Código</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="MAT-101" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-body text-xs">Semestre</Label>
                <Input value={semester} onChange={(e) => setSemester(e.target.value)} placeholder="2026-1" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-body text-xs">Color</Label>
              <div className="flex gap-2 flex-wrap">
                {SUBJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-8 w-8 rounded-lg border-2 transition-all ${
                      color === c ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="font-body">
              Cancelar
            </Button>
            <Button onClick={handleSave} className="font-body" disabled={createSubject.isPending || updateSubject.isPending}>
              {editing ? "Guardar cambios" : "Crear materia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminación */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Eliminar materia</AlertDialogTitle>
            <AlertDialogDescription className="font-body">
              Vas a eliminar <strong>{deleteTarget?.name}</strong> y todas sus actividades asociadas.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-body">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="font-body bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function EmptySubjects({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center max-w-xl mx-auto">
      <div className="h-14 w-14 rounded-full gradient-hero mx-auto flex items-center justify-center shadow-emerald mb-5">
        <BookOpen className="h-7 w-7 text-primary-foreground" />
      </div>
      <h2 className="font-display text-2xl font-bold text-foreground mb-2">
        Aún no tienes materias
      </h2>
      <p className="text-muted-foreground mb-6">
        Empieza creando las materias de tu semestre. Después podrás registrar sus actividades.
      </p>
      <Button size="lg" onClick={onAdd} className="font-body shadow-emerald">
        <Plus className="h-4 w-4 mr-1.5" />
        Crear primera materia
      </Button>
    </div>
  );
}
