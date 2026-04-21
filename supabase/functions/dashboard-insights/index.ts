// Edge function: dashboard-insights
// Genera un resumen semanal con riesgos, materias descuidadas, racha y alertas
// de sobrecarga. Devuelve markdown listo para mostrar en el dashboard.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY no configurada");

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "No autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supa = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData } = await supa.auth.getUser(token);
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Sesión inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: subjects }, { data: activities }, { data: history }] =
      await Promise.all([
        supa.from("subjects").select("id, name"),
        supa
          .from("activities")
          .select("title, status, priority, due_date, subject_id"),
        supa
          .from("completion_history")
          .select("new_status, recorded_at")
          .order("recorded_at", { ascending: false })
          .limit(50),
      ]);

    if (!activities || activities.length === 0) {
      return new Response(
        JSON.stringify({
          summary:
            "No tienes actividades aún. Crea materias y actividades para que el asistente pueda darte un resumen útil.",
          alerts: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Métricas locales para alimentar al modelo
    const subjectMap = new Map((subjects ?? []).map((s) => [s.id, s.name]));
    const now = Date.now();
    const day = 1000 * 60 * 60 * 24;

    let pendientes = 0;
    let altaProximas = 0; // alta prioridad en <=3 días
    let vencidas = 0;
    const perSubject: Record<string, { pend: number; done: number }> = {};

    for (const a of activities) {
      const subName = subjectMap.get(a.subject_id) ?? "Sin materia";
      perSubject[subName] = perSubject[subName] ?? { pend: 0, done: 0 };
      if (a.status === "pendiente") {
        pendientes++;
        perSubject[subName].pend++;
        if (a.due_date) {
          const diff = Math.ceil((new Date(a.due_date).getTime() - now) / day);
          if (diff < 0) vencidas++;
          if (diff >= 0 && diff <= 3 && a.priority === "alta") altaProximas++;
        }
      } else if (a.status === "realizada") {
        perSubject[subName].done++;
      }
    }

    const finished = (history ?? []).filter(
      (h) => h.new_status === "realizada" || h.new_status === "no_realizada",
    );
    const cumplimiento =
      finished.length > 0
        ? Math.round(
            (finished.filter((h) => h.new_status === "realizada").length /
              finished.length) *
              100,
          )
        : 0;

    // Racha: cuántos cambios consecutivos a "realizada" desde el más reciente
    let racha = 0;
    for (const h of history ?? []) {
      if (h.new_status === "realizada") racha++;
      else break;
    }

    const subjectStats = Object.entries(perSubject).map(([name, v]) => ({
      name,
      pendientes: v.pend,
      realizadas: v.done,
    }));

    const systemPrompt = `Eres un coach académico para estudiantes universitarios.
Analizas las métricas y devuelves un resumen breve y accionable en MARKDOWN.

Reglas:
- Máximo 6 líneas. Tono cercano y motivador.
- Usa **negritas** para destacar números clave.
- Incluye 1-2 acciones concretas para esta semana.
- Si hay >3 actividades alta-prioridad en 3 días o >0 vencidas, marca como riesgo claro.
- Si el cumplimiento es >=80% o la racha >=3, celebra brevemente.
- Si hay materias con muchas pendientes y 0 realizadas, márcalas como "descuidadas".

Devuelve SOLO JSON válido con esta estructura:
{
  "summary": "markdown con el resumen",
  "alerts": [
    { "level": "info"|"warning"|"danger", "text": "frase corta" }
  ]
}`;

    const userPrompt = `Métricas:
- Actividades pendientes: ${pendientes}
- Vencidas (sin marcar): ${vencidas}
- Alta prioridad en próximos 3 días: ${altaProximas}
- Cumplimiento histórico: ${cumplimiento}%
- Racha actual de "realizadas": ${racha}
- Por materia: ${JSON.stringify(subjectStats)}

Genera el JSON.`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
        }),
      },
    );

    if (aiResponse.status === 429) {
      return new Response(
        JSON.stringify({ error: "Límite de uso alcanzado." }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (aiResponse.status === 402) {
      return new Response(
        JSON.stringify({ error: "Créditos de Lovable AI agotados." }),
        {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (!aiResponse.ok) {
      const t = await aiResponse.text();
      throw new Error(`AI Gateway: ${aiResponse.status} ${t}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }

    const validLevels = new Set(["info", "warning", "danger"]);
    const alerts = Array.isArray(parsed.alerts)
      ? parsed.alerts.filter(
          (a: any) =>
            a && typeof a.text === "string" && validLevels.has(a.level),
        )
      : [];

    return new Response(
      JSON.stringify({
        summary: parsed.summary ?? "Sin resumen disponible.",
        alerts,
        metrics: {
          pendientes,
          vencidas,
          altaProximas,
          cumplimiento,
          racha,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("dashboard-insights error:", err);
    return new Response(
      JSON.stringify({ error: "Error interno. Intenta más tarde." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
