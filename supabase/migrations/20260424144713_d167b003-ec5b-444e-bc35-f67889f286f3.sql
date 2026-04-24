-- Fix: vencidas y cumplimiento deben considerar pendientes vencidas y entregas perdidas
CREATE OR REPLACE FUNCTION public.admin_student_overview()
 RETURNS TABLE(user_id uuid, display_name text, joined_at timestamp with time zone, subjects_count bigint, total_activities bigint, pendientes bigint, realizadas bigint, no_realizadas bigint, vencidas bigint, completion_pct numeric, last_activity_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    p.display_name,
    p.created_at AS joined_at,
    COALESCE((SELECT COUNT(*) FROM public.subjects s WHERE s.user_id = p.user_id), 0) AS subjects_count,
    COALESCE((SELECT COUNT(*) FROM public.activities a WHERE a.user_id = p.user_id), 0) AS total_activities,
    COALESCE((SELECT COUNT(*) FROM public.activities a WHERE a.user_id = p.user_id AND a.status = 'pendiente'), 0) AS pendientes,
    COALESCE((SELECT COUNT(*) FROM public.activities a WHERE a.user_id = p.user_id AND a.status = 'realizada'), 0) AS realizadas,
    COALESCE((SELECT COUNT(*) FROM public.activities a WHERE a.user_id = p.user_id AND a.status = 'no_realizada'), 0) AS no_realizadas,
    -- vencidas: cualquier actividad con fecha pasada que NO fue completada (pendientes y no_realizadas con fecha pasada)
    COALESCE((SELECT COUNT(*) FROM public.activities a
              WHERE a.user_id = p.user_id
                AND a.status <> 'realizada'
                AND a.due_date IS NOT NULL
                AND a.due_date < now()), 0) AS vencidas,
    -- cumplimiento: realizadas / (realizadas + no_realizadas + pendientes vencidas)
    COALESCE((
      SELECT ROUND(
        100.0 * COUNT(*) FILTER (WHERE a.status = 'realizada')
        / NULLIF(
            COUNT(*) FILTER (
              WHERE a.status IN ('realizada','no_realizada')
                 OR (a.status = 'pendiente' AND a.due_date IS NOT NULL AND a.due_date < now())
            ), 0)
      , 1)
      FROM public.activities a WHERE a.user_id = p.user_id
    ), 0) AS completion_pct,
    (SELECT MAX(a.updated_at) FROM public.activities a WHERE a.user_id = p.user_id) AS last_activity_at
  FROM public.profiles p
  WHERE NOT public.has_role(p.user_id, 'admin'::app_role)
  ORDER BY p.created_at DESC;
END;
$function$;

-- Fix: métricas globales con la misma definición
CREATE OR REPLACE FUNCTION public.admin_global_metrics()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT jsonb_build_object(
    'total_students', (
      SELECT COUNT(*) FROM public.profiles p
      WHERE NOT public.has_role(p.user_id, 'admin'::app_role)
    ),
    'active_students_7d', (
      SELECT COUNT(DISTINCT a.user_id) FROM public.activities a
      WHERE a.updated_at > now() - interval '7 days'
        AND NOT public.has_role(a.user_id, 'admin'::app_role)
    ),
    'new_students_30d', (
      SELECT COUNT(*) FROM public.profiles p
      WHERE p.created_at > now() - interval '30 days'
        AND NOT public.has_role(p.user_id, 'admin'::app_role)
    ),
    'total_subjects', (SELECT COUNT(*) FROM public.subjects),
    'total_activities', (SELECT COUNT(*) FROM public.activities),
    'pendientes', (SELECT COUNT(*) FROM public.activities WHERE status = 'pendiente'),
    'realizadas', (SELECT COUNT(*) FROM public.activities WHERE status = 'realizada'),
    'no_realizadas', (SELECT COUNT(*) FROM public.activities WHERE status = 'no_realizada'),
    'vencidas', (
      SELECT COUNT(*) FROM public.activities
      WHERE status <> 'realizada' AND due_date IS NOT NULL AND due_date < now()
    ),
    'global_completion_pct', (
      SELECT COALESCE(ROUND(
        100.0 * COUNT(*) FILTER (WHERE status = 'realizada')
        / NULLIF(
            COUNT(*) FILTER (
              WHERE status IN ('realizada','no_realizada')
                 OR (status = 'pendiente' AND due_date IS NOT NULL AND due_date < now())
            ), 0)
      , 1), 0)
    ),
    'ai_analyzed_pct', (
      SELECT COALESCE(ROUND(
        100.0 * COUNT(*) FILTER (WHERE ai_analyzed_at IS NOT NULL)
        / NULLIF(COUNT(*), 0)
      , 1), 0)
      FROM public.activities
    )
  ) INTO result;

  RETURN result;
END;
$function$;

-- Fix: detalle por estudiante
CREATE OR REPLACE FUNCTION public.admin_student_detail(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT jsonb_build_object(
    'profile', (
      SELECT jsonb_build_object(
        'user_id', p.user_id,
        'display_name', p.display_name,
        'joined_at', p.created_at
      )
      FROM public.profiles p WHERE p.user_id = p_user_id
    ),
    'metrics', (
      SELECT jsonb_build_object(
        'total_activities', COUNT(*),
        'pendientes', COUNT(*) FILTER (WHERE status = 'pendiente'),
        'realizadas', COUNT(*) FILTER (WHERE status = 'realizada'),
        'no_realizadas', COUNT(*) FILTER (WHERE status = 'no_realizada'),
        'vencidas', COUNT(*) FILTER (WHERE status <> 'realizada' AND due_date IS NOT NULL AND due_date < now()),
        'completion_pct', COALESCE(ROUND(
          100.0 * COUNT(*) FILTER (WHERE status = 'realizada')
          / NULLIF(
              COUNT(*) FILTER (
                WHERE status IN ('realizada','no_realizada')
                   OR (status = 'pendiente' AND due_date IS NOT NULL AND due_date < now())
              ), 0)
        , 1), 0)
      )
      FROM public.activities WHERE user_id = p_user_id
    ),
    'subjects', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', s.id,
        'name', s.name,
        'code', s.code,
        'semester', s.semester,
        'color', s.color,
        'total', (SELECT COUNT(*) FROM public.activities a WHERE a.subject_id = s.id),
        'pendientes', (SELECT COUNT(*) FROM public.activities a WHERE a.subject_id = s.id AND a.status = 'pendiente'),
        'realizadas', (SELECT COUNT(*) FROM public.activities a WHERE a.subject_id = s.id AND a.status = 'realizada'),
        'no_realizadas', (SELECT COUNT(*) FROM public.activities a WHERE a.subject_id = s.id AND a.status = 'no_realizada')
      ) ORDER BY s.created_at)
      FROM public.subjects s WHERE s.user_id = p_user_id
    ), '[]'::jsonb),
    'activities', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', a.id,
        'title', a.title,
        'description', a.description,
        'status', a.status,
        'priority', a.priority,
        'ai_suggested_priority', a.ai_suggested_priority,
        'due_date', a.due_date,
        'subject_name', (SELECT name FROM public.subjects s WHERE s.id = a.subject_id),
        'subject_color', (SELECT color FROM public.subjects s WHERE s.id = a.subject_id),
        'created_at', a.created_at,
        'updated_at', a.updated_at
      ) ORDER BY a.due_date NULLS LAST, a.created_at DESC)
      FROM public.activities a WHERE a.user_id = p_user_id
    ), '[]'::jsonb),
    'weekly', COALESCE((
      WITH weeks AS (
        SELECT generate_series(
          date_trunc('week', now() - interval '7 weeks')::date,
          date_trunc('week', now())::date,
          interval '1 week'
        )::date AS week_start
      )
      SELECT jsonb_agg(jsonb_build_object(
        'week_start', w.week_start,
        'realizadas', (SELECT COUNT(*) FROM public.completion_history ch
                        WHERE ch.user_id = p_user_id
                          AND ch.new_status = 'realizada'
                          AND ch.recorded_at >= w.week_start
                          AND ch.recorded_at < w.week_start + interval '1 week'),
        'no_realizadas', (SELECT COUNT(*) FROM public.completion_history ch
                          WHERE ch.user_id = p_user_id
                            AND ch.new_status = 'no_realizada'
                            AND ch.recorded_at >= w.week_start
                            AND ch.recorded_at < w.week_start + interval '1 week')
      ) ORDER BY w.week_start)
      FROM weeks w
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$function$;