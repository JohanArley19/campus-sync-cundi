-- Fix admin_subject_distribution to use proper LEFT JOIN aggregation
CREATE OR REPLACE FUNCTION public.admin_subject_distribution()
 RETURNS TABLE(subject_name text, students_count bigint, total_activities bigint, completion_pct numeric)
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
    s.name AS subject_name,
    COUNT(DISTINCT s.user_id)::bigint AS students_count,
    COUNT(a.id)::bigint AS total_activities,
    COALESCE(ROUND(
      100.0 * COUNT(a.id) FILTER (WHERE a.status = 'realizada')::numeric
      / NULLIF(COUNT(a.id) FILTER (WHERE a.status IN ('realizada','no_realizada'))::numeric, 0)
    , 1), 0) AS completion_pct
  FROM public.subjects s
  LEFT JOIN public.activities a ON a.subject_id = s.id
  GROUP BY s.name
  ORDER BY total_activities DESC
  LIMIT 12;
END;
$function$;

-- Function to list pending activities of a specific student for AI prediction
CREATE OR REPLACE FUNCTION public.admin_student_pending_activities(p_user_id uuid)
 RETURNS TABLE(
   activity_id uuid,
   title text,
   subject_name text,
   priority activity_priority,
   due_date timestamptz,
   active_load int,
   history_pct numeric
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_load int;
  v_pct numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT COUNT(*) INTO v_load
  FROM public.activities WHERE user_id = p_user_id AND status = 'pendiente';

  SELECT COALESCE(
    COUNT(*) FILTER (WHERE new_status = 'realizada')::numeric
    / NULLIF(COUNT(*) FILTER (WHERE new_status IN ('realizada','no_realizada'))::numeric, 0)
  , 0.5)
  INTO v_pct
  FROM public.completion_history WHERE user_id = p_user_id;

  RETURN QUERY
  SELECT
    a.id AS activity_id,
    a.title,
    (SELECT s.name FROM public.subjects s WHERE s.id = a.subject_id) AS subject_name,
    a.priority,
    a.due_date,
    v_load AS active_load,
    v_pct AS history_pct
  FROM public.activities a
  WHERE a.user_id = p_user_id AND a.status = 'pendiente'
  ORDER BY a.due_date NULLS LAST;
END;
$function$;