-- ══════════════════════════════════════════════════════════════════════
-- Content Intake Portal — Editorial review workflow (Phase 1)
-- Run in Supabase SQL Editor (safe to re-run — ADD COLUMN IF NOT EXISTS,
-- CREATE POLICY guarded by DROP POLICY IF EXISTS)
--
-- Supports the revised post-demo flow:
--   Stakeholder submits -> Admin reviews, creates a Jira ticket referencing
--   the request -> Editorial claims review ("Start Review"), edits content,
--   discusses via open comments, marks complete -> rest handled in Jira.
--
-- See PHASE1-EDITORIAL-REVIEW-PLAN.md for the full design writeup. Two
-- corrections made here vs. that doc, based on what the v2 tasks system
-- already provides (see CONTEXT.md's parallel-task workflow):
--   1. No new "request_collaborators"/watchers table yet — comments open
--      to admin/super_admin, the owning stakeholder, and any of the
--      existing team roles (editorial_team, design_team, seo_team,
--      brand_team, web_team). Covers "stakeholder + editorial + other
--      users" without inventing per-request ad hoc access for people
--      with no account. Add a watchers table later if an external
--      reviewer (e.g. BA head) genuinely has no system role.
--   2. Editorial's "Start Review" claim reuses tasks.assigned_to (already
--      exists) — no new column needed. "Start Review" just means: set
--      assigned_to = self AND status = in_progress in one action, done
--      in application code (TaskPanel.js), not here.
-- ══════════════════════════════════════════════════════════════════════

-- ── Jira ticket reference on requests ────────────────────────────────
-- Manual v1: admin creates the ticket in Jira themselves (referencing
-- this request's id) and pastes the resulting id/url back here for
-- tracking. No Jira API integration in this phase.
ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS jira_ticket_id  TEXT,
  ADD COLUMN IF NOT EXISTS jira_ticket_url TEXT,
  ADD COLUMN IF NOT EXISTS jira_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS jira_created_by UUID REFERENCES public.users(id);

-- ── Section-scoped comments ──────────────────────────────────────────
-- Nullable: a comment can be tied to a specific section ("start a
-- conversation ... regarding a specific section") or left general
-- (section_key IS NULL) for a whole-request note.
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS section_key TEXT;

CREATE INDEX IF NOT EXISTS idx_comments_request_id   ON public.comments(request_id);
CREATE INDEX IF NOT EXISTS idx_comments_section_key  ON public.comments(request_id, section_key);

-- ── Fix comments RLS: was checking legacy role names ─────────────────
-- comments_select/attachments_select referenced 'editorial_qa'/'design_qa'
-- (v1 role names). tasks.team_role — and everyone actually working a v2
-- request — uses 'editorial_team'/'design_team' instead, so an
-- editorial_team user could not see comments on their own request at
-- all. Widened to cover both legacy and v2 name sets rather than
-- guessing which one is authoritative going forward.
DROP POLICY IF EXISTS comments_select ON public.comments;
CREATE POLICY comments_select ON public.comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = comments.request_id
        AND (
          get_user_role() IN ('admin', 'super_admin')
          OR (get_user_role() = 'stakeholder' AND r.created_by = get_user_id())
          OR get_user_role() IN (
               'editorial_qa','design_qa','web_team','brand_team','seo_team',
               'editorial_team','design_team'
             )
        )
    )
  );

-- Was previously unrestricted beyond "request exists" (no role check at
-- all). Tightened to match comments_select's access set, so anyone who
-- can read a request's comments is also who can post to it — not
-- literally anyone with a login and a request id.
DROP POLICY IF EXISTS comments_insert ON public.comments;
CREATE POLICY comments_insert ON public.comments
  FOR INSERT WITH CHECK (
    user_id = get_user_id()
    AND EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = comments.request_id
        AND (
          get_user_role() IN ('admin', 'super_admin')
          OR (get_user_role() = 'stakeholder' AND r.created_by = get_user_id())
          OR get_user_role() IN (
               'editorial_qa','design_qa','web_team','brand_team','seo_team',
               'editorial_team','design_team'
             )
        )
    )
  );
