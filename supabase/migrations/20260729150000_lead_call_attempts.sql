-- Cold Outreach Tracker: per-user call attempt log

CREATE TABLE IF NOT EXISTS public.lead_call_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outcome text NOT NULL CHECK (outcome IN (
    'Answered',
    'No Answer',
    'Voicemail Left',
    'Busy',
    'Wrong Number',
    'Callback Requested',
    'Not Interested'
  )),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_call_attempts_user_id ON public.lead_call_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_call_attempts_lead_id ON public.lead_call_attempts(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_call_attempts_user_created ON public.lead_call_attempts(user_id, created_at DESC);

ALTER TABLE public.lead_call_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lead_call_attempts_select_own ON public.lead_call_attempts;
CREATE POLICY lead_call_attempts_select_own
  ON public.lead_call_attempts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS lead_call_attempts_insert_own ON public.lead_call_attempts;
CREATE POLICY lead_call_attempts_insert_own
  ON public.lead_call_attempts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS lead_call_attempts_update_own ON public.lead_call_attempts;
CREATE POLICY lead_call_attempts_update_own
  ON public.lead_call_attempts FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS lead_call_attempts_delete_own ON public.lead_call_attempts;
CREATE POLICY lead_call_attempts_delete_own
  ON public.lead_call_attempts FOR DELETE TO authenticated
  USING (user_id = auth.uid());
