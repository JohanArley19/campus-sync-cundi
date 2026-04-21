-- 1) Permitir a admins LEER todos los datos relevantes
CREATE POLICY "Admins can view all subjects"
ON public.subjects FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all activities"
ON public.activities FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all completion history"
ON public.completion_history FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2) Vista resumen por estudiante (sólo accesible vía función SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.admin_student_overview()
RETURNS TABLE (
  user_id uuid,
  display_name text,
  joined_at timestamptz,
  subjects_count bigint,
  total_activities bigint,
  pendientes bigint,
  realizadas bigint,
  no_realizadas bigint,
  vencidas bigint,
  completion_pct numeric,
  last_activity_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
  ORDER BY p.created_at DESC;
END;
$$;

-- 3) KPIs globales
CREATE OR REPLACE FUNCTION public.admin_global_metrics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT jsonb_build_object(
    'total_students', (SELECT COUNT(*) FROM public.profiles),
    'active_students_7d', (
      SELECT COUNT(DISTINCT user_id) FROM public.activities
      WHERE updated_at > now() - interval '7 days'
    ),
    'new_students_30d', (
      SELECT COUNT(*) FROM public.profiles WHERE created_at > now() - interval '30 days'
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
$$;

-- 4) Tendencia semanal (últimas 8 semanas)
CREATE OR REPLACE FUNCTION public.admin_weekly_trend()
RETURNS TABLE (
  week_start date,
  realizadas bigint,
  no_realizadas bigint,
  creadas bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  WITH weeks AS (
    SELECT generate_series(
      date_trunc('week', now() - interval '7 weeks')::date,
      date_trunc('week', now())::date,
      interval '1 week'
    )::date AS week_start
  )
  SELECT
    w.week_start,
    COALESCE((SELECT COUNT(*) FROM public.completion_history ch
              WHERE ch.new_status = 'realizada'
                AND ch.recorded_at >= w.week_start
                AND ch.recorded_at < w.week_start + interval '1 week'), 0) AS realizadas,
    COALESCE((SELECT COUNT(*) FROM public.completion_history ch
              WHERE ch.new_status = 'no_realizada'
                AND ch.recorded_at >= w.week_start
                AND ch.recorded_at < w.week_start + interval '1 week'), 0) AS no_realizadas,
    COALESCE((SELECT COUNT(*) FROM public.activities a
              WHERE a.created_at >= w.week_start
                AND a.created_at < w.week_start + interval '1 week'), 0) AS creadas
  FROM weeks w
  ORDER BY w.week_start;
END;
$$;

-- 5) Distribución por materia (top materias agregadas por nombre)
CREATE OR REPLACE FUNCTION public.admin_subject_distribution()
RETURNS TABLE (
  subject_name text,
  students_count bigint,
  total_activities bigint,
  completion_pct numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT
    s.name AS subject_name,
    COUNT(DISTINCT s.user_id) AS students_count,
    COALESCE(SUM((SELECT COUNT(*) FROM public.activities a WHERE a.subject_id = s.id)), 0) AS total_activities,
    COALESCE(ROUND(
      100.0 * SUM((SELECT COUNT(*) FROM public.activities a WHERE a.subject_id = s.id AND a.status = 'realizada'))
      / NULLIF(SUM((SELECT COUNT(*) FROM public.activities a WHERE a.subject_id = s.id AND a.status IN ('realizada','no_realizada'))), 0)
    , 1), 0) AS completion_pct
  FROM public.subjects s
  GROUP BY s.name
  ORDER BY total_activities DESC
  LIMIT 12;
END;
$$;

-- 6) Bootstrap admin: el primer usuario puede auto-promoverse
CREATE OR REPLACE FUNCTION public.bootstrap_first_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count int;
  uid uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT COUNT(*) INTO admin_count FROM public.user_roles WHERE role = 'admin';

  IF admin_count > 0 THEN
    -- Si ya existe admin, sólo otro admin puede otorgar el rol (no permitido aquí).
    RETURN false;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (uid, 'admin')
  ON CONFLICT DO NOTHING;

  RETURN true;
END;
$$;

-- 7) Indicador público: ¿existe ya un admin? (sin exponer detalles)
CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin');
$$;