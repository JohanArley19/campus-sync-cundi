// Edge function: batch-prioritize
// Analiza TODAS las actividades pendientes del usuario en una sola llamada y
// devuelve sugerencias de prioridad + un plan de hoy y de la semana.
// Devuelve sugerencias para que el usuario las acepte/rechace en la UI.

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
          .select("id, title, description, status, priority, due_date, subject_id")
          .eq("status", "pendiente"),
        supa
          .from("completion_history")
          .select("new_status")
          .order("recorded_at", { ascending: false })
          .limit(30),
      ]);

    if (!activities || activities.length === 0) {
      return new Response(
        JSON.stringify({
          suggestions: [],
          today_plan: "No tienes actividades pendientes. ¡Buen trabajo!",
          week_plan: "",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const finished = (history ?? []).filter(
      (h) => h.new_status === "realizada" || h.new_status === "no_realizada",
    );
    const cumplimientoPct =
      finished.length > 0
        ? Math.round(
            (finished.filter((h) => h.new_status === "realizada").length /
              finished.length) *
              100,
          )
        : 50;

    const subjectMap = new Map((subjects ?? []).map((s) => [s.id, s.name]));
    const today = new Date().toISOString().slice(0, 10);

    const activitiesPayload = activities.map((a) => ({
      id: a.id,
      title: a.title,
      subject: subjectMap.get(a.subject_id) ?? "Sin materia",
      due_date: a.due_date
        ? new Date(a.due_date).toISOString().slice(0, 10)
        : null,
      current_priority: a.priority,
      description: a.description?.slice(0, 120) ?? null,
    }));

    const systemPrompt = `Eres un planificador académico experto. Analizas la carga total de un estudiante universitario y produces:
1. Sugerencias de prioridad (alta/media/baja) por cada actividad pendiente, considerando fecha de entrega, peso académico (parciales > tareas), carga total y cumplimiento histórico.
2. Un plan para HOY (3-5 bloques cortos en lista markdown).
3. Un plan para LA SEMANA (resumen breve de 4-6 líneas en markdown).

Devuelve SOLO JSON válido, sin markdown, sin texto extra. Estructura exacta:
{
  "suggestions": [
    { "id": "uuid", "priority": "alta"|"media"|"baja", "reasoning": "frase corta en español" }
  ],
  "today_plan": "string en markdown",
  "week_plan": "string en markdown"
}

Contexto:
- Hoy: ${today}
- Cumplimiento histórico del estudiante: ${cumplimientoPct}%
- Total de actividades pendientes: ${activities.length}`;

    const userPrompt = `Actividades pendientes:
${JSON.stringify(activitiesPayload, null, 2)}

Genera la respuesta JSON ahora.`;

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
        JSON.stringify({ error: "Límite de uso alcanzado. Intenta más tarde." }),
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
      const match = content.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : {};
    }

    const validIds = new Set(activities.map((a) => a.id));
    const validPriorities = new Set(["alta", "media", "baja"]);
    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions.filter(
          (s: any) =>
            s &&
            validIds.has(s.id) &&
            validPriorities.has(s.priority),
        )
      : [];

    // Persistir como sugerencias (no aplicar). El usuario decide en la UI.
    await Promise.all(
      suggestions.map((s: any) =>
        supa
          .from("activities")
          .update({
            ai_suggested_priority: s.priority,
            ai_reasoning: s.reasoning ?? null,
            ai_analyzed_at: new Date().toISOString(),
          })
          .eq("id", s.id),
      ),
    );

    return new Response(
      JSON.stringify({
        suggestions,
        today_plan: parsed.today_plan ?? "",
        week_plan: parsed.week_plan ?? "",
        analyzed_count: suggestions.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("batch-prioritize error:", err);
    return new Response(
      JSON.stringify({ error: "Error interno. Intenta más tarde." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
