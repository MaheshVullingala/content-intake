-- ══════════════════════════════════════════════════════════════════════
-- Content Intake Portal — v2 RLS Policies
-- Run AFTER sql/01-schema.sql
-- Covers only the 3 new/updated tables: tasks, notifications, audit_log.
-- Does NOT touch RLS on requests, users, comments, attachments,
-- status_history, or settings.
-- ══════════════════════════════════════════════════════════════════════


-- ── 1. tasks ──────────────────────────────────────────────────────────
-- RLS was enabled by tasks-migration.sql; this file replaces the
-- policies with tighter, v2-role-aware rules.

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete" ON public.tasks;

-- SELECT: admins see all; stakeholders see tasks for their own requests;
-- team members see all tasks on any request where their team has a task.
CREATE POLICY "tasks_select" ON public.tasks
  FOR SELECT USING (
    -- Admins always have access
    get_user_role() IN ('admin', 'super_admin')

    -- Stakeholders see tasks on requests they submitted
    OR (
      get_user_role() = 'stakeholder'
      AND EXISTS (
        SELECT 1 FROM public.requests r
        WHERE r.id = request_id
          AND r.created_by = get_user_id()
      )
    )

    -- Team members see all tasks for a request where their team is assigned
    -- (they need the full board view, not just their own row)
    OR EXISTS (
      SELECT 1 FROM public.tasks t2
      WHERE t2.request_id = tasks.request_id
        AND t2.team_role = get_user_role()
    )
  );

-- INSERT: admin and super_admin only (task creation is an admin action)
CREATE POLICY "tasks_insert" ON public.tasks
  FOR INSERT WITH CHECK (
    get_user_role() IN ('admin', 'super_admin')
  );

-- UPDATE:
--   • admins/super_admins can update any task (status overrides, assignments, etc.)
--   • team members can update the task whose team_role matches their own role
--   • stakeholders can update any task on their own request (for brand/design approvals)
CREATE POLICY "tasks_update" ON public.tasks
  FOR UPDATE USING (
    get_user_role() IN ('admin', 'super_admin')

    OR team_role = get_user_role()

    OR (
      get_user_role() = 'stakeholder'
      AND EXISTS (
        SELECT 1 FROM public.requests r
        WHERE r.id = request_id
          AND r.created_by = get_user_id()
      )
    )
  );

-- No client-side DELETE on tasks (admin deletes via service role if ever needed)
-- (No DELETE policy = all deletes are denied for authenticated clients)


-- ── 2. notifications ──────────────────────────────────────────────────

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;

-- SELECT: users can only read their own notifications
CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT USING (
    user_id = get_user_id()
  );

-- UPDATE: users can only update their own notifications (mark as read)
CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE USING (
    user_id = get_user_id()
  )
  WITH CHECK (
    user_id = get_user_id()
  );

-- INSERT: blocked for authenticated clients — notifications are created
-- server-side via service_role key only (Next.js API routes).
-- No INSERT policy = all client inserts are denied.

-- No DELETE policy for notifications (service_role handles cleanup if needed)


-- ── 3. audit_log (immutable) ──────────────────────────────────────────

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log_select" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_insert" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_update" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_delete" ON public.audit_log;

-- SELECT: admins and super_admins only
CREATE POLICY "audit_log_select" ON public.audit_log
  FOR SELECT USING (
    get_user_role() IN ('admin', 'super_admin')
  );

-- INSERT: blocked for authenticated clients — audit rows are written
-- server-side via service_role key only (immutable audit trail).
-- No INSERT policy = all client inserts are denied.

-- No UPDATE policy — rows are immutable once written.
-- No DELETE policy — rows are immutable once written.


-- ══════════════════════════════════════════════════════════════════════
-- Verify:
-- SELECT schemaname, tablename, policyname, cmd, qual
--   FROM pg_policies
--   WHERE tablename IN ('tasks', 'notifications', 'audit_log')
--   ORDER BY tablename, cmd;
-- ══════════════════════════════════════════════════════════════════════
