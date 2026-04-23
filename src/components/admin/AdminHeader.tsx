import { GraduationCap, Calendar, ShieldCheck } from "lucide-react";

export function AdminHeader() {
  const today = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border shadow-sm">
      {/* Banda gradiente verde -> dorado */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(115deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 55%, hsl(var(--accent)) 100%)",
        }}
      />
      {/* Sutil patrón */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "radial-gradient(hsl(var(--primary-foreground)) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />
      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 sm:p-6 text-primary-foreground">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary-foreground/15 backdrop-blur-sm ring-1 ring-primary-foreground/30 flex items-center justify-center shrink-0">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="font-body text-[11px] uppercase tracking-[0.18em] opacity-80 flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3" /> Panel administrador
            </p>
            <h1 className="font-display text-xl sm:text-2xl font-bold leading-tight">
              CampusSync · U. de Cundinamarca
            </h1>
            <p className="font-body text-xs opacity-90 mt-0.5">
              Visión global del rendimiento estudiantil
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="rounded-lg bg-primary-foreground/15 backdrop-blur-sm ring-1 ring-primary-foreground/30 px-3 py-2 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="font-body text-xs capitalize">{today}</span>
          </div>
        </div>
      </div>
      {/* línea inferior dorada */}
      <div className="relative h-1 bg-accent" />
    </div>
  );
}
