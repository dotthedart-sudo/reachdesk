-- Migration: Create ai_usage_log table for Groq AI rate limiting
-- Tracks per-user AI requests to enforce 20 req/hour limit in groq-chat edge function.

create table if not exists public.ai_usage_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  mode       text not null check (mode in ('draft-reply', 'support')),
  created_at timestamptz not null default now()
);

-- Index to make the rate-limit count query fast:
-- WHERE user_id = $1 AND created_at >= $windowStart
create index if not exists ai_usage_log_user_created_idx
  on public.ai_usage_log (user_id, created_at desc);

-- RLS: users cannot read/write this table directly — only the service role key
-- used inside the edge function may insert rows.
alter table public.ai_usage_log enable row level security;

-- No public policies are granted; the service-role client in the edge function
-- bypasses RLS entirely, which is the intended access pattern.
