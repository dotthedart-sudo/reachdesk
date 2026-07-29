-- Track Google Calendar meeting confirmation emails to avoid duplicate sends

CREATE TABLE IF NOT EXISTS public.calendar_meeting_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  google_event_id text NOT NULL,
  attendee_email text NOT NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calendar_meeting_confirmations_event_attendee_key
    UNIQUE (google_event_id, attendee_email)
);

CREATE INDEX IF NOT EXISTS idx_calendar_meeting_confirmations_user
  ON public.calendar_meeting_confirmations(user_id);

ALTER TABLE public.calendar_meeting_confirmations ENABLE ROW LEVEL SECURITY;

-- Service role (webhook) writes these; owners can read their own rows
DROP POLICY IF EXISTS calendar_confirmations_select_own ON public.calendar_meeting_confirmations;
CREATE POLICY calendar_confirmations_select_own
  ON public.calendar_meeting_confirmations FOR SELECT TO authenticated
  USING (user_id = auth.uid());
