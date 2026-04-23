-- 1) Crear el trigger que faltaba para auto-crear profile en cada signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2) Backfill: crear profile para todos los usuarios existentes que no lo tengan
INSERT INTO public.profiles (user_id, display_name)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1))
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.id IS NULL;

-- 3) Actualizar admin_student_overview para EXCLUIR a los administradores de la lista de estudiantes
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
    COALESCE((SELECT COUNT(*) FROM public.activities a
              WHERE a.user_id = p.user_id
                AND a.status = 'pendiente'
                AND a.due_date IS NOT NULL
                AND a.due_date < now()), 0) AS vencidas,
    COALESCE((
      SELECT ROUND(
        100.0 * COUNT(*) FILTER (WHERE a.status = 'realizada')
        / NULLIF(COUNT(*) FILTER (WHERE a.status IN ('realizada','no_realizada')), 0)
      , 1)
      FROM public.activities a WHERE a.user_id = p.user_id
    ), 0) AS completion_pct,
    (SELECT MAX(a.updated_at) FROM public.activities a WHERE a.user_id = p.user_id) AS last_activity_at
  FROM public.profiles p
  WHERE NOT public.has_role(p.user_id, 'admin'::app_role) -- excluir admins
  ORDER BY p.created_at DESC;
END;
$function$;

-- 4) Actualizar admin_global_metrics para que cuente solo estudiantes (no admins)
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
      WHERE status = 'pendiente' AND due_date IS NOT NULL AND due_date < now()
    ),
    'global_completion_pct', (
      SELECT COALESCE(ROUND(
        100.0 * COUNT(*) FILTER (WHERE status = 'realizada')
        / NULLIF(COUNT(*) FILTER (WHERE status IN ('realizada','no_realizada')), 0)
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