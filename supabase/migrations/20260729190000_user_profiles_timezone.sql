-- User-preferred IANA timezone for calendar display and scheduling (null = use browser)

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS timezone text;

COMMENT ON COLUMN public.user_profiles.timezone IS
  'IANA timezone e.g. America/New_York. NULL = use browser timezone in the app.';
