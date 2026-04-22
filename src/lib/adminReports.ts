import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const BRAND = {
  primary: [31, 107, 71] as [number, number, number], // verde institucional
  accent: [199, 154, 38] as [number, number, number], // dorado
  text: [20, 20, 20] as [number, number, number],
  muted: [110, 110, 110] as [number, number, number],
};

function header(doc: jsPDF, title: string, subtitle?: string) {
  // banda superior
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("CampusSync · Universidad de Cundinamarca", 14, 14);

  doc.setTextColor(...BRAND.text);
  doc.setFontSize(16);
  doc.text(title, 14, 32);
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...BRAND.muted);
    doc.text(subtitle, 14, 38);
  }
}

function footer(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...BRAND.accent);
    doc.setLineWidth(0.4);
    doc.line(14, h - 14, w - 14, h - 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.muted);
    doc.text(`Generado: ${new Date().toLocaleString("es-CO")}`, 14, h - 8);
    doc.text(`Página ${i} de ${pageCount}`, w - 14, h - 8, { align: "right" });
  }
}

function kpiGrid(
  doc: jsPDF,
  startY: number,
  items: { label: string; value: string }[],
) {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const cols = 4;
  const gap = 4;
  const cellW = (pageW - margin * 2 - gap * (cols - 1)) / cols;
  const cellH = 18;

  items.forEach((it, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = margin + col * (cellW + gap);
    const y = startY + row * (cellH + gap);

    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(x, y, cellW, cellH, 2, 2, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.muted);
    doc.text(it.label.toUpperCase(), x + 3, y + 6);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...BRAND.text);
    doc.text(it.value, x + 3, y + 14);
  });

  const rows = Math.ceil(items.length / cols);
  return startY + rows * (cellH + gap);
}

export type GlobalReportData = {
  metrics: {
    total_students: number;
    active_students_7d: number;
    new_students_30d: number;
    total_subjects: number;
    total_activities: number;
    pendientes: number;
    realizadas: number;
    no_realizadas: number;
    vencidas: number;
    global_completion_pct: number;
    ai_analyzed_pct: number;
  };
  students: Array<{
    display_name: string | null;
    subjects_count: number;
    total_activities: number;
    pendientes: number;
    realizadas: number;
    vencidas: number;
    completion_pct: number;
  }>;
  weekly: Array<{
    week_start: string;
    realizadas: number;
    no_realizadas: number;
    creadas: number;
  }>;
  subjects: Array<{
    subject_name: string;
    students_count: number;
    total_activities: number;
    completion_pct: number;
  }>;
};

export function downloadGlobalReportPdf(data: GlobalReportData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const today = new Date().toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  header(doc, "Reporte global del aplicativo", `Corte: ${today}`);

  let y = kpiGrid(doc, 46, [
    { label: "Estudiantes", value: String(data.metrics.total_students) },
    { label: "Activos 7d", value: String(data.metrics.active_students_7d) },
    { label: "Nuevos 30d", value: String(data.metrics.new_students_30d) },
    { label: "Cumplimiento", value: `${data.metrics.global_completion_pct}%` },
    { label: "Materias", value: String(data.metrics.total_subjects) },
    { label: "Actividades", value: String(data.metrics.total_activities) },
    { label: "Vencidas", value: String(data.metrics.vencidas) },
    { label: "Analizadas IA", value: `${data.metrics.ai_analyzed_pct}%` },
  ]);

  // Tendencia semanal
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.text);
  doc.text("Tendencia semanal (últimas 8 semanas)", 14, y + 6);

  autoTable(doc, {
    startY: y + 9,
    head: [["Semana", "Realizadas", "No realizadas", "Creadas"]],
    body: data.weekly.map((w) => [
      new Date(w.week_start).toLocaleDateString("es-CO", { day: "2-digit", month: "short" }),
      w.realizadas,
      w.no_realizadas,
      w.creadas,
    ]),
    theme: "striped",
    headStyles: { fillColor: BRAND.primary, textColor: 255, fontSize: 9 },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // Materias más usadas
  doc.setFont("helvetica", "bold");
  doc.text("Materias más usadas", 14, y + 4);
  autoTable(doc, {
    startY: y + 7,
    head: [["Materia", "Estudiantes", "Actividades", "Cumplimiento"]],
    body: data.subjects.map((s) => [
      s.subject_name,
      s.students_count,
      s.total_activities,
      `${s.completion_pct}%`,
    ]),
    theme: "striped",
    headStyles: { fillColor: BRAND.primary, textColor: 255, fontSize: 9 },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  // Tabla de estudiantes (nueva página si hace falta)
  doc.addPage();
  header(doc, "Estudiantes registrados", `${data.students.length} estudiantes · ${today}`);

  autoTable(doc, {
    startY: 46,
    head: [
      [
        "Estudiante",
        "Materias",
        "Actividades",
        "Pendientes",
        "Realizadas",
        "Vencidas",
        "Cumplim.",
      ],
    ],
    body: data.students.map((s) => [
      s.display_name || "—",
      s.subjects_count,
      s.total_activities,
      s.pendientes,
      s.realizadas,
      s.vencidas,
      `${s.completion_pct}%`,
    ]),
    theme: "grid",
    headStyles: { fillColor: BRAND.primary, textColor: 255, fontSize: 9 },
    styles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    margin: { left: 14, right: 14 },
  });

  footer(doc);
  doc.save(`campussync-reporte-global-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export type StudentReportData = {
  profile: { display_name: string | null; joined_at: string };
  metrics: {
    total_activities: number;
    pendientes: number;
    realizadas: number;
    no_realizadas: number;
    vencidas: number;
    completion_pct: number;
  };
  subjects: Array<{
    name: string;
    code: string | null;
    semester: string | null;
    total: number;
    pendientes: number;
    realizadas: number;
    no_realizadas: number;
  }>;
  activities: Array<{
    title: string;
    subject_name: string | null;
    status: string;
    priority: string;
    due_date: string | null;
  }>;
};

export function downloadStudentReportPdf(data: StudentReportData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const today = new Date().toLocaleDateString("es-CO");

  header(
    doc,
    `Reporte de ${data.profile.display_name || "estudiante"}`,
    `Registrado: ${new Date(data.profile.joined_at).toLocaleDateString("es-CO")} · Corte: ${today}`,
  );

  let y = kpiGrid(doc, 46, [
    { label: "Actividades", value: String(data.metrics.total_activities) },
    { label: "Pendientes", value: String(data.metrics.pendientes) },
    { label: "Realizadas", value: String(data.metrics.realizadas) },
    { label: "Cumplimiento", value: `${data.metrics.completion_pct}%` },
    { label: "No realizadas", value: String(data.metrics.no_realizadas) },
    { label: "Vencidas", value: String(data.metrics.vencidas) },
    { label: "Materias", value: String(data.subjects.length) },
    { label: "—", value: "" },
  ]);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Materias", 14, y + 4);
  autoTable(doc, {
    startY: y + 7,
    head: [["Materia", "Código", "Semestre", "Total", "Pend.", "Real.", "No real."]],
    body: data.subjects.map((s) => [
      s.name,
      s.code ?? "—",
      s.semester ?? "—",
      s.total,
      s.pendientes,
      s.realizadas,
      s.no_realizadas,
    ]),
    theme: "striped",
    headStyles: { fillColor: BRAND.primary, textColor: 255, fontSize: 9 },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  if ((doc as any).lastAutoTable.finalY > 240) {
    doc.addPage();
    y = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.text("Actividades", 14, y + 4);
  autoTable(doc, {
    startY: y + 7,
    head: [["Título", "Materia", "Estado", "Prioridad", "Vence"]],
    body: data.activities.map((a) => [
      a.title,
      a.subject_name ?? "—",
      a.status,
      a.priority,
      a.due_date ? new Date(a.due_date).toLocaleDateString("es-CO") : "—",
    ]),
    theme: "grid",
    headStyles: { fillColor: BRAND.primary, textColor: 255, fontSize: 9 },
    styles: { fontSize: 8.5 },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    margin: { left: 14, right: 14 },
  });

  footer(doc);
  doc.save(
    `campussync-reporte-${(data.profile.display_name || "estudiante").replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`,
  );
}
