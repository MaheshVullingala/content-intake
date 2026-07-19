-- ══════════════════════════════════════════════════════════════════════
-- Content Intake Portal — Task assignment visibility (Parts 1 & 2)
-- Run in Supabase SQL Editor (safe to re-run — DROP POLICY IF EXISTS first)
--
-- Corrections made from the original draft:
--   1. auth.uid() is the Supabase Auth UUID, NOT public.users.id — this
--      schema always maps through get_user_id() / auth_id for that
--      reason (see get_user_id()'s own comment in sql/03-functions.sql).
--      Every direct auth.uid() comparison against assigned_to/created_by/
--      users.id below has been changed to go through get_user_id() /
--      auth_id, matching the existing convention.
--   2. The live policies are named "tasks_select" and "requests_select"
--      (confirmed via grep — NOT "tasks_select_team"/"requests_select_team").
--      This file replaces those exact policies in place. Creating
--      differently-named policies would have stacked on top of the
--      existing permissive ones instead of replacing them — Postgres
--      ORs multiple permissive policies together, so the old unrestricted
--      access would have remained in effect for every team role.
--   3. requests_select_team's draft dropped the admin/stakeholder clauses
--      entirely. Folded them back in below — the replacement is a full,
--      correct policy, not an additive restriction.
-- ══════════════════════════════════════════════════════════════════════


-- ── Helper function ──────────────────────────────────────────────────
-- COALESCE to false so a NULL can_assign (e.g. never explicitly set)
-- falls into the "member" branch rather than matching neither OR-branch
-- in the policies below and silently seeing nothing.
CREATE OR REPLACE FUNCTION public.get_user_can_assign()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(can_assign, false) FROM public.users WHERE auth_id = auth.uid()
$$;


-- ── PART 1: tasks SELECT ─────────────────────────────────────────────
DROP POLICY IF EXISTS "tasks_select" ON public.tasks;

CREATE POLICY "tasks_select" ON public.tasks
FOR SELECT USING (
  -- Admin and super_admin see all
  public.get_user_role() IN ('admin','super_admin')
  OR
  -- Stakeholder sees tasks on their own requests
  (public.get_user_role() = 'stakeholder'
  AND EXISTS (
    SELECT 1 FROM public.requests r
    WHERE r.id = tasks.request_id
    AND r.created_by = public.get_user_id()
  ))
  OR
  -- Leads see all tasks for their team
  (public.get_user_role() IN (
    'editorial_team','brand_team','seo_team',
    'design_team','web_team'
  ) AND public.get_user_can_assign() = true)
  OR
  -- Members only see tasks assigned to them
  (public.get_user_role() IN (
    'editorial_team','brand_team','seo_team',
    'design_team','web_team'
  ) AND public.get_user_can_assign() = false
  AND assigned_to = public.get_user_id())
);


-- ── PART 2: requests SELECT ──────────────────────────────────────────
DROP POLICY IF EXISTS "requests_select" ON public.requests;

CREATE POLICY "requests_select" ON public.requests
FOR SELECT USING (
  -- Admin and super_admin see all
  public.get_user_role() IN ('admin','super_admin')
  OR
  -- Stakeholder sees their own requests
  (public.get_user_role() = 'stakeholder'
  AND created_by = public.get_user_id())
  OR
  -- Leads see all requests their team has a task on
  (public.get_user_role() IN (
    'editorial_team','brand_team','seo_team',
    'design_team','web_team'
  ) AND public.get_user_can_assign() = true
  AND EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.request_id = requests.id
    AND t.team_role = public.get_user_role()
  ))
  OR
  -- Members only see requests where task is assigned to them
  (public.get_user_role() IN (
    'editorial_team','brand_team','seo_team',
    'design_team','web_team'
  ) AND public.get_user_can_assign() = false
  AND EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.request_id = requests.id
    AND t.team_role = public.get_user_role()
    AND t.assigned_to = public.get_user_id()
  ))
);

-- ══════════════════════════════════════════════════════════════════════
-- Verify:
-- SELECT policyname, cmd FROM pg_policies
--   WHERE tablename IN ('tasks','requests') AND schemaname = 'public';
-- ══════════════════════════════════════════════════════════════════════
