-- ══════════════════════════════════════════════════════════════════════
-- Content Intake Portal — Stakeholder mid-flight content change requests
-- Run in Supabase SQL Editor (safe to re-run — DROP POLICY IF EXISTS first)
--
-- Feature (2026-07-29): stakeholders can propose content edits while
-- teams are already working a request (overall_status IN progress/
-- pending_web). Changes are NOT applied immediately — they're staged
-- in content_change_requests as 'pending', admin reviews the diff, and
-- only on approval do the changes land in `requests` + get written as a
-- note on every task for that request (content_update_note/at/read).
-- This is deliberately separate from the existing needs_info
-- answer-by-editing flow (PagePreview ✎ buttons when a team asks a
-- question), which stays immediate-apply / no admin step — see
-- TaskBoard.js's handleStakeholderEditSaved, untouched by this file.
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. content_change_requests table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.content_change_requests (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id        UUID        NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  submitted_by      UUID        REFERENCES public.users(id),
  reason            TEXT        NOT NULL,
  changed_fields    JSONB       NOT NULL, -- [{ section, key, label, old_value, new_value }, ...]
  status            TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by       UUID        REFERENCES public.users(id),
  reviewed_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_change_requests_request_id ON public.content_change_requests(request_id);
CREATE INDEX IF NOT EXISTS idx_content_change_requests_status     ON public.content_change_requests(status);

-- ── 2. tasks table: per-task note surfaced once a change is approved ────
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS content_update_note TEXT,
  ADD COLUMN IF NOT EXISTS content_update_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS content_update_read BOOLEAN DEFAULT TRUE;
  -- Default TRUE so existing rows aren't retroactively flagged unread.
  -- Set to FALSE explicitly whenever a change is approved (see approve
  -- handler) so it shows up in TaskPanel until that task's owner
  -- dismisses it.

-- ── 3. RLS: content_change_requests ─────────────────────────────────────
ALTER TABLE public.content_change_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "content_change_requests_select" ON public.content_change_requests;
CREATE POLICY "content_change_requests_select" ON public.content_change_requests
  FOR SELECT USING (
    get_user_role() IN ('admin', 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = content_change_requests.request_id
      AND r.created_by = get_user_id()
    )
  );

DROP POLICY IF EXISTS "content_change_requests_insert" ON public.content_change_requests;
CREATE POLICY "content_change_requests_insert" ON public.content_change_requests
  FOR INSERT WITH CHECK (
    get_user_role() = 'stakeholder'
    AND submitted_by = get_user_id()
    AND EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id
      AND r.created_by = get_user_id()
    )
  );

DROP POLICY IF EXISTS "content_change_requests_update" ON public.content_change_requests;
CREATE POLICY "content_change_requests_update" ON public.content_change_requests
  FOR UPDATE USING (
    get_user_role() IN ('admin', 'super_admin')
  );

-- ── 4. Fix tasks_update: was missing 'super_admin' (same gap as
--    requests_insert/update/delete, fixed separately in
--    sql/09-fix-requests-insert-superadmin.sql). The approve handler for
--    this feature bulk-updates every task on a request, so a super_admin
--    approving would otherwise hit the same class of 42501 error. ──────
DROP POLICY IF EXISTS "tasks_update" ON public.tasks;
CREATE POLICY "tasks_update" ON public.tasks
  FOR UPDATE USING (
    get_user_role() IN ('admin', 'super_admin')
    OR get_user_role() = 'stakeholder'
    OR team_role = get_user_role()
  );
