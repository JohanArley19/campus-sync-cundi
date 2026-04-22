
-- Tabla notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('due_soon','overdue','ai_daily','info')),
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
  due_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Clave para dedupe diaria
  dedupe_key TEXT NOT NULL,
  UNIQUE (user_id, dedupe_key)
);

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RPC: detalle por estudiante (solo admin)
CREATE OR REPLACE FUNCTION public.admin_student_detail(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
        'vencidas', COUNT(*) FILTER (WHERE status = 'pendiente' AND due_date IS NOT NULL AND due_date < now()),
        'completion_pct', COALESCE(ROUND(
          100.0 * COUNT(*) FILTER (WHERE status = 'realizada')
          / NULLIF(COUNT(*) FILTER (WHERE status IN ('realizada','no_realizada')), 0)
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
$$;

-- RPC: generar notificaciones de vencimiento para el usuario actual (idempotente por día)
CREATE OR REPLACE FUNCTION public.generate_due_notifications_for_me()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid;
  inserted_count int := 0;
  today_str text;
  rec record;
  days_left int;
  ntype text;
  ntitle text;
  nbody text;
  ndedupe text;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  today_str := to_char(now(), 'YYYY-MM-DD');

  FOR rec IN
    SELECT a.id, a.title, a.due_date,
           (SELECT name FROM public.subjects s WHERE s.id = a.subject_id) AS subject_name
    FROM public.activities a
    WHERE a.user_id = uid
      AND a.status = 'pendiente'
      AND a.due_date IS NOT NULL
      AND a.due_date <= now() + interval '7 days'
  LOOP
    days_left := EXTRACT(DAY FROM (rec.due_date - now()))::int;

    IF rec.due_date < now() THEN
      ntype := 'overdue';
      ntitle := 'Entrega vencida';
      nbody := rec.title || ' (' || COALESCE(rec.subject_name, 'sin materia') || ') ya pasó su fecha de entrega.';
    ELSIF days_left <= 1 THEN
      ntype := 'due_soon';
      ntitle := CASE WHEN days_left = 0 THEN 'Vence hoy' ELSE 'Vence mañana' END;
      nbody := rec.title || ' — ' || COALESCE(rec.subject_name, 'sin materia');
    ELSIF days_left <= 3 THEN
      ntype := 'due_soon';
      ntitle := 'Vence en ' || days_left || ' días';
      nbody := rec.title || ' — ' || COALESCE(rec.subject_name, 'sin materia');
    ELSE
      CONTINUE; -- entre 4-7 días: no notificar aún
    END IF;

    ndedupe := 'due:' || rec.id::text || ':' || ntype || ':' || today_str;

    BEGIN
      INSERT INTO public.notifications (user_id, type, title, body, link, activity_id, due_at, dedupe_key)
      VALUES (uid, ntype, ntitle, nbody, '/app/actividades', rec.id, rec.due_date, ndedupe);
      inserted_count := inserted_count + 1;
    EXCEPTION WHEN unique_violation THEN
      -- ya existe la de hoy
      NULL;
    END;
  END LOOP;

  RETURN inserted_count;
END;
$$;

-- Verifica si el usuario ya tiene la sugerencia IA del día
CREATE OR REPLACE FUNCTION public.has_ai_daily_today()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = auth.uid()
      AND type = 'ai_daily'
      AND dedupe_key = 'ai_daily:' || to_char(now(), 'YYYY-MM-DD')
  );
$$;
