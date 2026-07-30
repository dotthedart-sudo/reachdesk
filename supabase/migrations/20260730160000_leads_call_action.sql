-- Call-specific next step (separate from message action_to_take)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS call_action text;
