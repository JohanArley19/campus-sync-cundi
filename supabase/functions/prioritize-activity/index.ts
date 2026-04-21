// Edge function: prioritize-activity
// Usa Lovable AI Gateway (Gemini) para sugerir prioridad de una actividad académica
// con base en las 4 variables del documento del proyecto.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PrioritizeRequest {
  tiempo_restante_dias: number;
  tareas_activas: number;
  historial_cumplimiento_pct: number;
  estado: string;
  titulo?: string;
  descripcion?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Auth check ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "No autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const token = authHeader.replace("Bearer ", "");
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claimsData, error: claimsErr } = await supa.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Sesión inválida" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = (await req.json()) as PrioritizeRequest;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY no está configurada");
    }

    const systemPrompt = `Eres un asistente académico que ayuda a estudiantes universitarios a priorizar sus actividades.
Analizas 4 variables principales:
1. Tiempo restante hasta la fecha de entrega (en días, puede ser negativo si está vencida)
2. Número de tareas activas (carga actual)
3. Porcentaje histórico de cumplimiento del estudiante
4. Estado actual de la actividad

Tu tarea: clasificar la prioridad como "alta", "media" o "baja".

Reglas guía:
- Tiempo <= 2 días o vencida → tiende a alta
- Tiempo 3-7 días con muchas tareas activas (>5) → alta o media
- Cumplimiento histórico bajo (<60%) aumenta la prioridad
- Tiempo >14 días con pocas tareas → baja
- Considera el contexto del título/descripción (parcial > tarea pequeña)

Responde SIEMPRE en JSON estricto, sin markdown ni texto adicional, con esta forma exacta:
{"priority": "alta" | "media" | "baja", "reasoning": "una frase breve en español explicando por qué"}`;

    const userPrompt = `Datos:
- Tiempo restante: ${body.tiempo_restante_dias} días
- Tareas activas: ${body.tareas_activas}
- Cumplimiento histórico: ${body.historial_cumplimiento_pct}%
- Estado: ${body.estado}
- Título: ${body.titulo ?? "(sin título)"}
- Descripción: ${body.descripcion ?? "(sin descripción)"}

Devuelve solo el JSON con priority y reasoning.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
    });

    if (aiResponse.status === 429) {
      return new Response(
        JSON.stringify({ error: "Límite de uso alcanzado. Intenta más tarde." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (aiResponse.status === 402) {
      return new Response(
        JSON.stringify({ error: "Se requiere agregar créditos al workspace de Lovable AI." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      throw new Error(`AI Gateway error: ${aiResponse.status} ${text}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData?.choices?.[0]?.message?.content ?? "{}";
    let parsed: { priority?: string; reasoning?: string };
    try {
      parsed = JSON.parse(content);
    } catch {
      // fallback: intentar extraer
      const match = content.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : {};
    }

    const validPriorities = ["alta", "media", "baja"];
    const priority = validPriorities.includes(parsed.priority ?? "")
      ? (parsed.priority as string)
      : "media";

    return new Response(
      JSON.stringify({
        priority,
        reasoning: parsed.reasoning ?? "Análisis basado en fecha, carga y cumplimiento histórico.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("prioritize-activity error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
