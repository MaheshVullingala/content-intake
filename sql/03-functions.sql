-- ══════════════════════════════════════════════════════════════════════
-- Content Intake Portal — v2 Helper Functions
-- Run AFTER sql/01-schema.sql and sql/02-rls.sql
-- All functions use CREATE OR REPLACE so this file is safe to re-run.
-- ══════════════════════════════════════════════════════════════════════


-- ── 1. get_user_role() ────────────────────────────────────────────────
-- Already exists from rls-migration.sql. Recreated here as the canonical
-- v2 definition so this file is self-contained.
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM public.users WHERE auth_id = auth.uid()
$$;


-- ── 2. get_user_id() ─────────────────────────────────────────────────
-- Returns the public.users.id (not auth.uid()) for the current user.
-- Used in RLS policies that compare against created_by / user_id columns.
CREATE OR REPLACE FUNCTION public.get_user_id()
RETURNS UUID
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT id FROM public.users WHERE auth_id = auth.uid()
$$;


-- ── 3. check_web_team_unlock(p_request_id) ───────────────────────────
-- Returns TRUE when all required non-web-team tasks for a request are
-- completed, meaning the web_team task can be unlocked.
--
-- Called by AdminTaskSetup and TaskBoard before flipping the web_team
-- task from 'locked' to 'pending'.
CREATE OR REPLACE FUNCTION public.check_web_team_unlock(p_request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  blocking_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO blocking_count
  FROM public.tasks
  WHERE request_id = p_request_id
    AND team_role  <> 'web_team'
    AND is_required = TRUE
    AND status      <> 'completed';

  RETURN blocking_count = 0;
END;
$$;


-- ══════════════════════════════════════════════════════════════════════
-- Quick smoke-test (run after applying):
--
-- SELECT public.get_user_role();           -- returns your role
-- SELECT public.get_user_id();             -- returns your users.id UUID
-- SELECT public.check_web_team_unlock(    -- returns true/false
--   '<any request UUID>'
-- );
-- ══════════════════════════════════════════════════════════════════════
