type Cell = { dow: number; hour: number; count: number };

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// Agrupa horas en 6 bloques de 4h para que el heatmap quepa bien
const BLOCKS = [
  { label: "00–03", from: 0, to: 3 },
  { label: "04–07", from: 4, to: 7 },
  { label: "08–11", from: 8, to: 11 },
  { label: "12–15", from: 12, to: 15 },
  { label: "16–19", from: 16, to: 19 },
  { label: "20–23", from: 20, to: 23 },
];

export function ActivityHeatmap({ data }: { data: Cell[] }) {
  // Construir matriz 7 (dow) x 6 (bloques)
  const matrix: number[][] = Array.from({ length: 7 }, () => Array(6).fill(0));
  for (const c of data) {
    const blockIdx = BLOCKS.findIndex((b) => c.hour >= b.from && c.hour <= b.to);
    if (blockIdx >= 0 && c.dow >= 0 && c.dow < 7) {
      matrix[c.dow][blockIdx] += Number(c.count);
    }
  }
  const max = Math.max(1, ...matrix.flat());

  const tone = (v: number) => {
    if (v === 0) return "bg-muted/40";
    const intensity = v / max; // 0..1
    if (intensity < 0.2) return "bg-primary/15";
    if (intensity < 0.4) return "bg-primary/30";
    if (intensity < 0.6) return "bg-primary/50";
    if (intensity < 0.8) return "bg-primary/70";
    return "bg-primary";
  };

  if (data.length === 0) {
    return (
      <p className="font-body text-xs text-muted-foreground py-8 text-center">
        Aún no hay actividad suficiente para construir el mapa de calor.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="w-10 shrink-0" />
        <div className="grid grid-cols-6 gap-1 flex-1">
          {BLOCKS.map((b) => (
            <span
              key={b.label}
              className="font-body text-[10px] text-muted-foreground text-center"
            >
              {b.label}
            </span>
          ))}
        </div>
      </div>
      {DAYS.map((day, dow) => (
        <div key={day} className="flex gap-2 items-center">
          <span className="w-10 shrink-0 font-body text-[11px] text-muted-foreground">
            {day}
          </span>
          <div className="grid grid-cols-6 gap-1 flex-1">
            {matrix[dow].map((v, i) => (
              <div
                key={i}
                title={`${day} · ${BLOCKS[i].label} → ${v} acciones`}
                className={`h-7 rounded ${tone(v)} transition-colors hover:ring-2 hover:ring-accent/50`}
              />
            ))}
          </div>
        </div>
      ))}
      <div className="flex items-center justify-end gap-2 pt-2">
        <span className="font-body text-[10px] text-muted-foreground">Menos</span>
        {["bg-muted/40", "bg-primary/15", "bg-primary/30", "bg-primary/50", "bg-primary/70", "bg-primary"].map(
          (c) => (
            <span key={c} className={`h-3 w-4 rounded ${c}`} />
          ),
        )}
        <span className="font-body text-[10px] text-muted-foreground">Más</span>
      </div>
    </div>
  );
}
