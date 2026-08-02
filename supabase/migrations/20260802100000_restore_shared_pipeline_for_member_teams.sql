-- Restore shared pipeline for workspaces that already have members.
-- Migration 20260801170000 forced members_see_own_leads_only = true for ALL teams,
-- which made teammate leads disappear from member accounts (looked like deletion).
-- Data was never deleted — only SELECT visibility changed.
-- Keep hybrid=true as the DEFAULT for brand-new teams; only restore active multi-member workspaces.

UPDATE public.teams t
SET members_see_own_leads_only = false
WHERE t.members_see_own_leads_only = true
  AND EXISTS (
    SELECT 1
    FROM public.user_profiles m
    WHERE m.team_id = t.id
      AND lower(COALESCE(m.team_role, 'owner')) = 'member'
  );
