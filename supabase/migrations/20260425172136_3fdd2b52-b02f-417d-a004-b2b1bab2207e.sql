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
      FROM public.activities
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