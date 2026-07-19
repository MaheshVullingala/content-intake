-- ══════════════════════════════════════════════════════════════════════
-- Content Intake Portal — Web Team "Request Changes" cross-task RLS
-- Run in Supabase SQL Editor (safe to re-run — DROP POLICY IF EXISTS first)
--
-- The existing tasks_update policy (sql/02-rls.sql) only lets a team
-- member update rows where team_role = get_user_role(), so web_team's
-- "Request Changes" flow (TaskPanel.js handleRequestChanges) setting
-- another team's task to pending_action was blocked with a 403. This
-- adds a second PERMISSIVE policy — Postgres OR's multiple permissive
-- policies together for the same command, so this only ever WIDENS
-- access beyond the existing policy, never narrows it.
-- ══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "tasks_update_web_team_request_changes" ON public.tasks;

CREATE POLICY "tasks_update_web_team_request_changes"
ON public.tasks FOR UPDATE
USING (
  public.get_user_role() = 'web_team'
  AND EXISTS (
    SELECT 1 FROM public.tasks wt
    WHERE wt.request_id = tasks.request_id
    AND wt.team_role = 'web_team'
  )
)
WITH CHECK (
  public.get_user_role() = 'web_team'
  AND EXISTS (
    SELECT 1 FROM public.tasks wt
    WHERE wt.request_id = tasks.request_id
    AND wt.team_role = 'web_team'
  )
);

-- ══════════════════════════════════════════════════════════════════════
-- Verify:
-- SELECT policyname, cmd FROM pg_policies
--   WHERE tablename = 'tasks' AND schemaname = 'public';
-- ══════════════════════════════════════════════════════════════════════
