-- User-planned cold outreach / tasks by date (Calendar Plan view)

CREATE TABLE IF NOT EXISTS public.planned_outreach_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  planned_at timestamptz NOT NULL,
  task_type text NOT NULL DEFAULT 'call'
    CHECK (task_type IN ('call', 'email', 'follow_up', 'other')),
  title text,
  note text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'done', 'missed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_planned_outreach_tasks_user_planned
  ON public.planned_outreach_tasks(user_id, planned_at);

CREATE INDEX IF NOT EXISTS idx_planned_outreach_tasks_user_status
  ON public.planned_outreach_tasks(user_id, status);

ALTER TABLE public.planned_outreach_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planned_outreach_tasks_select_own ON public.planned_outreach_tasks;
CREATE POLICY planned_outreach_tasks_select_own
  ON public.planned_outreach_tasks FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS planned_outreach_tasks_insert_own ON public.planned_outreach_tasks;
CREATE POLICY planned_outreach_tasks_insert_own
  ON public.planned_outreach_tasks FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS planned_outreach_tasks_update_own ON public.planned_outreach_tasks;
CREATE POLICY planned_outreach_tasks_update_own
  ON public.planned_outreach_tasks FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS planned_outreach_tasks_delete_own ON public.planned_outreach_tasks;
CREATE POLICY planned_outreach_tasks_delete_own
  ON public.planned_outreach_tasks FOR DELETE TO authenticated
  USING (user_id = auth.uid());

GRANT ALL ON public.planned_outreach_tasks TO authenticated;
GRANT ALL ON public.planned_outreach_tasks TO service_role;
