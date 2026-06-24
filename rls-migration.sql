-- ══════════════════════════════════════════════════════════════════
-- Content Intake Portal — Row Level Security (RLS) Migration
-- Option A: JWT token passed from client, policies enforce access
-- Run this in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════

-- ── Helper function: get current user's role from users table ──────
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE auth_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Helper function: get current user's row id ─────────────────────
CREATE OR REPLACE FUNCTION get_user_id()
RETURNS UUID AS $$
  SELECT id FROM public.users WHERE auth_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ══════════════════════════════════════════════════════════════════
-- 1. REQUESTS TABLE
-- ══════════════════════════════════════════════════════════════════
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- DROP existing policies if re-running
DROP POLICY IF EXISTS "requests_select" ON public.requests;
DROP POLICY IF EXISTS "requests_insert" ON public.requests;
DROP POLICY IF EXISTS "requests_update" ON public.requests;
DROP POLICY IF EXISTS "requests_delete" ON public.requests;

-- SELECT: each role sees what they need
CREATE POLICY "requests_select" ON public.requests
  FOR SELECT USING (
    get_user_role() = 'admin'
    OR (get_user_role() = 'stakeholder' AND created_by = get_user_id())
    OR get_user_role() IN ('editorial_qa', 'design_qa', 'web_team', 'brand_team', 'seo_team')
  );

-- INSERT: only stakeholders can create requests
CREATE POLICY "requests_insert" ON public.requests
  FOR INSERT WITH CHECK (
    get_user_role() IN ('stakeholder', 'admin')
    AND created_by = get_user_id()
  );

-- UPDATE: stakeholders edit own drafts; ops edit at their stage or parallel task; admin edits all
CREATE POLICY "requests_update" ON public.requests
  FOR UPDATE USING (
    get_user_role() = 'admin'
    OR (get_user_role() = 'stakeholder' AND created_by = get_user_id())
    OR (get_user_role() = 'editorial_qa' AND (status = 'editorial_qa' OR overall_status IS NOT NULL))
    OR (get_user_role() = 'design_qa'    AND (status = 'design_qa'    OR overall_status IS NOT NULL))
    OR (get_user_role() = 'web_team'     AND (status = 'web_team'     OR overall_status IS NOT NULL))
    OR (get_user_role() IN ('brand_team', 'seo_team') AND overall_status IS NOT NULL)
  );

-- DELETE: only admin and stakeholder can delete their own drafts
CREATE POLICY "requests_delete" ON public.requests
  FOR DELETE USING (
    get_user_role() = 'admin'
    OR (get_user_role() = 'stakeholder' AND created_by = get_user_id() AND status = 'draft')
  );

-- ══════════════════════════════════════════════════════════════════
-- 2. COMMENTS TABLE
-- ══════════════════════════════════════════════════════════════════
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_select" ON public.comments;
DROP POLICY IF EXISTS "comments_insert" ON public.comments;
DROP POLICY IF EXISTS "comments_delete" ON public.comments;

-- SELECT: can see comments on requests you can see
CREATE POLICY "comments_select" ON public.comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id
      AND (
        get_user_role() = 'admin'
        OR (get_user_role() = 'stakeholder' AND r.created_by = get_user_id())
        OR get_user_role() IN ('editorial_qa', 'design_qa', 'web_team', 'brand_team', 'seo_team')
      )
    )
  );

-- INSERT: authenticated users can comment on requests they can see
CREATE POLICY "comments_insert" ON public.comments
  FOR INSERT WITH CHECK (
    user_id = get_user_id()
    AND EXISTS (
      SELECT 1 FROM public.requests r WHERE r.id = request_id
    )
  );

-- DELETE: only admin or comment owner
CREATE POLICY "comments_delete" ON public.comments
  FOR DELETE USING (
    get_user_role() = 'admin'
    OR user_id = get_user_id()
  );

-- ══════════════════════════════════════════════════════════════════
-- 3. ATTACHMENTS TABLE
-- ══════════════════════════════════════════════════════════════════
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attachments_select" ON public.attachments;
DROP POLICY IF EXISTS "attachments_insert" ON public.attachments;
DROP POLICY IF EXISTS "attachments_delete" ON public.attachments;

CREATE POLICY "attachments_select" ON public.attachments
  FOR SELECT USING (
    get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id
      AND (
        (get_user_role() = 'stakeholder' AND r.created_by = get_user_id())
        OR get_user_role() IN ('editorial_qa', 'design_qa', 'web_team', 'brand_team', 'seo_team')
      )
    )
  );

CREATE POLICY "attachments_insert" ON public.attachments
  FOR INSERT WITH CHECK (
    user_id = get_user_id()
  );

CREATE POLICY "attachments_delete" ON public.attachments
  FOR DELETE USING (
    get_user_role() = 'admin'
    OR user_id = get_user_id()
  );

-- ══════════════════════════════════════════════════════════════════
-- 4. STATUS_HISTORY TABLE
-- ══════════════════════════════════════════════════════════════════
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "status_history_select" ON public.status_history;
DROP POLICY IF EXISTS "status_history_insert" ON public.status_history;

-- All authenticated users can read history (transparency)
CREATE POLICY "status_history_select" ON public.status_history
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only system inserts via service role (or authenticated users)
CREATE POLICY "status_history_insert" ON public.status_history
  FOR INSERT WITH CHECK (
    user_id = get_user_id()
  );

-- ══════════════════════════════════════════════════════════════════
-- 5. USERS TABLE
-- ══════════════════════════════════════════════════════════════════
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select" ON public.users;
DROP POLICY IF EXISTS "users_update" ON public.users;

-- All authenticated users can read users table (needed for assignment dropdowns)
CREATE POLICY "users_select" ON public.users
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can only update their own profile; admin can update all
CREATE POLICY "users_update" ON public.users
  FOR UPDATE USING (
    auth_id = auth.uid()
    OR get_user_role() = 'admin'
  );

-- ══════════════════════════════════════════════════════════════════
-- 6. SETTINGS TABLE
-- ══════════════════════════════════════════════════════════════════
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_select" ON public.settings;
DROP POLICY IF EXISTS "settings_update" ON public.settings;

-- All authenticated users can read settings (timeout, char limits)
CREATE POLICY "settings_select" ON public.settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admin can modify settings
CREATE POLICY "settings_update" ON public.settings
  FOR ALL USING (get_user_role() = 'admin');

-- ══════════════════════════════════════════════════════════════════
-- 7. TASKS TABLE
-- ══════════════════════════════════════════════════════════════════
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update" ON public.tasks;

-- SELECT: any authenticated user can see tasks for requests they can access
CREATE POLICY "tasks_select" ON public.tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id
      AND (
        get_user_role() = 'admin'
        OR (get_user_role() = 'stakeholder' AND r.created_by = get_user_id())
        OR get_user_role() IN ('editorial_qa', 'design_qa', 'web_team', 'brand_team', 'seo_team')
      )
    )
  );

-- INSERT: only admin (via createTasksForRequest)
CREATE POLICY "tasks_insert" ON public.tasks
  FOR INSERT WITH CHECK (get_user_role() = 'admin');

-- UPDATE: team members update their own team_role task; admin updates any
CREATE POLICY "tasks_update" ON public.tasks
  FOR UPDATE USING (
    get_user_role() = 'admin'
    OR get_user_role() = 'stakeholder'
    OR team_role = get_user_role()
  );

-- ══════════════════════════════════════════════════════════════════
-- DONE — verify with:
-- SELECT schemaname, tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public';
-- ══════════════════════════════════════════════════════════════════
