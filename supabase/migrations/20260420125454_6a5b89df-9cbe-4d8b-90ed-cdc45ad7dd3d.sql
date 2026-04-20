-- ============================================================
-- LIMPIEZA: eliminar tablas del proyecto Roadmapper anterior
-- ============================================================
DROP TABLE IF EXISTS public.activity_log CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.roadmap_items CASCADE;
DROP TABLE IF EXISTS public.roadmaps CASCADE;
DROP TABLE IF EXISTS public.workspace_invitations CASCADE;
DROP TABLE IF EXISTS public.workspace_members CASCADE;
DROP TABLE IF EXISTS public.workspaces CASCADE;

DROP FUNCTION IF EXISTS public.is_roadmap_editor(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_roadmap_member(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_workspace_member(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_workspace_co_member(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_comment_editor(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_comment_member(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_invitation_recipient(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_workspace() CASCADE;

DROP TYPE IF EXISTS public.item_status CASCADE;
DROP TYPE IF EXISTS public.item_priority CASCADE;

-- ============================================================
-- ENUMS para el dominio académico
-- ============================================================
CREATE TYPE public.activity_status AS ENUM ('pendiente', 'realizada', 'no_realizada');
CREATE TYPE public.activity_priority AS ENUM ('baja', 'media', 'alta');

-- ============================================================
-- TABLA: subjects (materias)
-- ============================================================
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  color TEXT NOT NULL DEFAULT '#1F6B47',
  semester TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subjects"
  ON public.subjects FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subjects"
  ON public.subjects FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subjects"
  ON public.subjects FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subjects"
  ON public.subjects FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER subjects_updated_at
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_subjects_user_id ON public.subjects(user_id);

-- ============================================================
-- TABLA: activities (actividades académicas)
-- ============================================================
CREATE TABLE public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  status public.activity_status NOT NULL DEFAULT 'pendiente',
  priority public.activity_priority NOT NULL DEFAULT 'media',
  ai_suggested_priority public.activity_priority,
  ai_reasoning TEXT,
  ai_analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activities"
  ON public.activities FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own activities"
  ON public.activities FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activities"
  ON public.activities FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own activities"
  ON public.activities FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER activities_updated_at
  BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_activities_user_id ON public.activities(user_id);
CREATE INDEX idx_activities_subject_id ON public.activities(subject_id);
CREATE INDEX idx_activities_status ON public.activities(status);
CREATE INDEX idx_activities_due_date ON public.activities(due_date);

-- ============================================================
-- TABLA: completion_history (historial para alimentar la IA)
-- ============================================================
CREATE TABLE public.completion_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_id UUID REFERENCES public.activities(id) ON DELETE SET NULL,
  previous_status public.activity_status,
  new_status public.activity_status NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.completion_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own history"
  ON public.completion_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own history"
  ON public.completion_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_completion_history_user_id ON public.completion_history(user_id);
CREATE INDEX idx_completion_history_activity_id ON public.completion_history(activity_id);

-- ============================================================
-- TRIGGER: registra automáticamente cambios de estado en historial
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_activity_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.completion_history (user_id, activity_id, previous_status, new_status)
    VALUES (NEW.user_id, NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER activities_status_change_log
  AFTER UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.log_activity_status_change();
