-- Heatmap: actividad por día de semana (0=Dom..6=Sáb) y hora (0..23)
CREATE OR REPLACE FUNCTION public.admin_activity_heatmap()
 RETURNS TABLE(dow int, hour int, count bigint)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT
    EXTRACT(DOW FROM ch.recorded_at)::int AS dow,
    EXTRACT(HOUR FROM ch.recorded_at AT TIME ZONE 'America/Bogota')::int AS hour,
    COUNT(*)::bigint AS count
  FROM public.completion_history ch
  WHERE ch.recorded_at > now() - interval '60 days'
    AND NOT public.has_role(ch.user_id, 'admin'::app_role)
  GROUP BY 1, 2
  ORDER BY 1, 2;
END;
$function$;

-- Comparativa 30d vs 30d previos (impacto del aplicativo)
CREATE OR REPLACE FUNCTION public.admin_impact_comparison()
 RETURNS jsonb
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  WITH recent AS (
    SELECT
      COUNT(*) FILTER (WHERE new_status = 'realizada')::numeric AS realizadas,
      COUNT(*) FILTER (WHERE new_status IN ('realizada','no_realizada'))::numeric AS finalizadas,
      COUNT(DISTINCT user_id) AS active_students
    FROM public.completion_history ch
    WHERE ch.recorded_at >= now() - interval '30 days'
      AND NOT public.has_role(ch.user_id, 'admin'::app_role)
  ),
  prev AS (
    SELECT
      COUNT(*) FILTER (WHERE new_status = 'realizada')::numeric AS realizadas,
      COUNT(*) FILTER (WHERE new_status IN ('realizada','no_realizada'))::numeric AS finalizadas,
      COUNT(DISTINCT user_id) AS active_students
    FROM public.completion_history ch
    WHERE ch.recorded_at >= now() - interval '60 days'
      AND ch.recorded_at < now() - interval '30 days'
      AND NOT public.has_role(ch.user_id, 'admin'::app_role)
  )
  SELECT jsonb_build_object(
    'recent_completion_pct', COALESCE(ROUND(100.0 * (SELECT realizadas FROM recent) / NULLIF((SELECT finalizadas FROM recent), 0), 1), 0),
    'prev_completion_pct',   COALESCE(ROUND(100.0 * (SELECT realizadas FROM prev)   / NULLIF((SELECT finalizadas FROM prev),   0), 1), 0),
    'recent_realizadas',     COALESCE((SELECT realizadas FROM recent), 0),
    'prev_realizadas',       COALESCE((SELECT realizadas FROM prev), 0),
    'recent_active_students', COALESCE((SELECT active_students FROM recent), 0),
    'prev_active_students',   COALESCE((SELECT active_students FROM prev), 0)
  ) INTO result;
  RETURN result;
END;
$function$;

-- Rachas de constancia: días distintos consecutivos en los últimos 60 días
CREATE OR REPLACE FUNCTION public.admin_student_streaks()
 RETURNS TABLE(user_id uuid, display_name text, current_streak int, active_days_30d int)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  WITH days AS (
    SELECT DISTINCT
      ch.user_id,
      (ch.recorded_at AT TIME ZONE 'America/Bogota')::date AS d
    FROM public.completion_history ch
    WHERE ch.recorded_at > now() - interval '60 days'
      AND NOT public.has_role(ch.user_id, 'admin'::app_role)
  ),
  streak_calc AS (
    SELECT
      d.user_id,
      d.d,
      d.d - (ROW_NUMBER() OVER (PARTITION BY d.user_id ORDER BY d.d))::int AS grp
    FROM days d
  ),
  groups AS (
    SELECT user_id, grp, MAX(d) AS last_day, COUNT(*)::int AS len
    FROM streak_calc GROUP BY user_id, grp
  ),
  current AS (
    SELECT g.user_id, g.len AS current_streak
    FROM groups g
    WHERE g.last_day >= (now() AT TIME ZONE 'America/Bogota')::date - 1
  ),
  active30 AS (
    SELECT d.user_id, COUNT(*)::int AS active_days_30d
    FROM days d
    WHERE d.d >= (now() AT TIME ZONE 'America/Bogota')::date - 29
    GROUP BY d.user_id
  )
  SELECT
    p.user_id,
    p.display_name,
    COALESCE(c.current_streak, 0) AS current_streak,
    COALESCE(a.active_days_30d, 0) AS active_days_30d
  FROM public.profiles p
  LEFT JOIN current c ON c.user_id = p.user_id
  LEFT JOIN active30 a ON a.user_id = p.user_id
  WHERE NOT public.has_role(p.user_id, 'admin'::app_role)
  ORDER BY current_streak DESC, active_days_30d DESC;
END;
$function$;

-- Mini-tendencias 14d: completadas y nuevos estudiantes activos por día
CREATE OR REPLACE FUNCTION public.admin_sparklines_14d()
 RETURNS jsonb
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  WITH days AS (
    SELECT generate_series(
      (now() AT TIME ZONE 'America/Bogota')::date - 13,
      (now() AT TIME ZONE 'America/Bogota')::date,
      interval '1 day'
    )::date AS d
  )
  SELECT jsonb_build_object(
    'completed', COALESCE(jsonb_agg(jsonb_build_object('d', d.d, 'v', (
      SELECT COUNT(*) FROM public.completion_history ch
      WHERE ch.new_status = 'realizada'
        AND (ch.recorded_at AT TIME ZONE 'America/Bogota')::date = d.d
        AND NOT public.has_role(ch.user_id, 'admin'::app_role)
    )) ORDER BY d.d), '[]'::jsonb),
    'active', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('d', d2.d, 'v', (
        SELECT COUNT(DISTINCT a.user_id) FROM public.activities a
        WHERE (a.updated_at AT TIME ZONE 'America/Bogota')::date = d2.d
          AND NOT public.has_role(a.user_id, 'admin'::app_role)
      )) ORDER BY d2.d) FROM days d2
    ), '[]'::jsonb),
    'overdue', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('d', d3.d, 'v', (
        SELECT COUNT(*) FROM public.activities a
        WHERE a.status = 'pendiente' AND a.due_date IS NOT NULL
          AND (a.due_date AT TIME ZONE 'America/Bogota')::date = d3.d
          AND NOT public.has_role(a.user_id, 'admin'::app_role)
      )) ORDER BY d3.d) FROM days d3
    ), '[]'::jsonb)
  ) INTO result FROM days d;
  RETURN result;
END;
$function$;