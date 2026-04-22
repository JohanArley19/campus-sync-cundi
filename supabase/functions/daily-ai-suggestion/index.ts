// Edge function: daily-ai-suggestion
// Genera (si aún no existe hoy) una notificación con una sugerencia corta
// de IA para el estudiante autenticado.
//
// Se llama desde el cliente al abrir la app. La RPC `has_ai_daily_today`
// indica si ya hay una; si no, generamos una y la insertamos como
// notificación tipo 'ai_daily'.

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

    const { data: userData, error: userErr } = await supa.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Sesión inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // ¿Ya hay sugerencia hoy?
    const { data: hasToday } = await supa.rpc("has_ai_daily_today");
    if (hasToday === true) {
      return new Response(
        JSON.stringify({ created: false, reason: "already_today" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Snapshot ligero
    const today = new Date();
    const in7 = new Date(today.getTime() + 7 * 86400000);

    const [{ data: pending }, { data: history }] = await Promise.all([
      supa
        .from("activities")
        .select("title, due_date, priority, ai_suggested_priority, subject_id")
        .eq("status", "pendiente")
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(20),
      supa
        .from("completion_history")
        .select("new_status")
        .order("recorded_at", { ascending: false })
        .limit(20),
    ]);

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

    const dueSoon = (pending ?? []).filter((a) => {
      if (!a.due_date) return false;
      const d = new Date(a.due_date);
      return d <= in7;
    }).length;

    // Si no hay nada pendiente, mensaje fijo (no gastamos crédito IA)
    let title = "Sugerencia del día";
    let body = "";

    if (!pending || pending.length === 0) {
      body = "No tienes pendientes. Aprovecha para revisar apuntes o adelantar lectura.";
    } else {
      const topItems = (pending ?? [])
        .slice(0, 8)
        .map((a) => ({
          title: a.title,
          due: a.due_date ? new Date(a.due_date).toISOString().slice(0, 10) : null,
          priority: a.ai_suggested_priority ?? a.priority,
        }));

      const systemPrompt = `Eres un coach académico breve. Devuelves SOLO JSON con dos campos: "title" (máx 60 chars) y "body" (máx 220 chars, en español, tono cercano y accionable). Da UNA sola sugerencia concreta para hoy basada en los pendientes y el cumplimiento histórico. Sin markdown, sin emojis excesivos.`;

      const userPrompt = `Pendientes (top): ${JSON.stringify(topItems)}
Vencen en 7 días: ${dueSoon}
Cumplimiento histórico: ${cumplimientoPct}%
Genera el JSON.`;

      const aiRes = await fetch(
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

      if (aiRes.status === 429 || aiRes.status === 402) {
        // Fallback sin gastar más
        body = `Tienes ${pending.length} pendientes. Empieza por la de mayor prioridad: "${pending[0].title}".`;
      } else if (!aiRes.ok) {
        body = `Tienes ${pending.length} pendientes. Empieza por "${pending[0].title}".`;
      } else {
        const aiData = await aiRes.json();
        const content = aiData?.choices?.[0]?.message?.content ?? "{}";
        try {
          const parsed = JSON.parse(content);
          if (typeof parsed.title === "string" && parsed.title.trim()) {
            title = parsed.title.slice(0, 80);
          }
          if (typeof parsed.body === "string" && parsed.body.trim()) {
            body = parsed.body.slice(0, 280);
          } else {
            body = `Empieza por "${pending[0].title}".`;
          }
        } catch {
          body = `Tienes ${pending.length} pendientes. Empieza por "${pending[0].title}".`;
        }
      }
    }

    const dedupe = `ai_daily:${today.toISOString().slice(0, 10)}`;
    const { error: insErr } = await supa.from("notifications").insert({
      user_id: userId,
      type: "ai_daily",
      title,
      body,
      link: "/app/actividades",
      dedupe_key: dedupe,
    });

    if (insErr) {
      // Si hubo carrera y ya existe, no es error real.
      if (!String(insErr.message).toLowerCase().includes("duplicate")) {
        throw insErr;
      }
      return new Response(
        JSON.stringify({ created: false, reason: "duplicate" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ created: true, title, body }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("daily-ai-suggestion error:", err);
    return new Response(
      JSON.stringify({ error: "Error interno. Intenta más tarde." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
