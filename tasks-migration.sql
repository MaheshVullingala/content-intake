-- ══════════════════════════════════════════════════════════════════
-- Content Intake Portal — Parallel Task Workflow Migration
-- Run in Supabase SQL Editor AFTER rls-migration.sql
-- ══════════════════════════════════════════════════════════════════

-- ── 1. Extend requests table ────────────────────────────────────────
ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS overall_status              TEXT,
  ADD COLUMN IF NOT EXISTS needs_brand                 BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS admin_reviewed_by           UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS admin_reviewed_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stakeholder_approved_brand  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stakeholder_approved_design BOOLEAN DEFAULT FALSE;

-- Note: existing rows keep overall_status = NULL (legacy linear workflow).
-- New requests set overall_status = 'pending_admin' on submit.

-- ── 2. Create tasks table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id    UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  team_role     TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  is_required   BOOLEAN DEFAULT TRUE,
  assigned_to   UUID REFERENCES public.users(id),
  assigned_by   UUID REFERENCES public.users(id),
  question      TEXT,
  question_at   TIMESTAMPTZ,
  answer        TEXT,
  answer_at     TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  unlocked_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tasks_request_id_idx ON public.tasks(request_id);

-- ── 3. RLS for tasks table ──────────────────────────────────────────
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update" ON public.tasks;

CREATE POLICY "tasks_select" ON public.tasks
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "tasks_insert" ON public.tasks
  FOR INSERT WITH CHECK (get_user_role() = 'admin');

-- Team members update own task; stakeholders update for approvals; admin updates all
CREATE POLICY "tasks_update" ON public.tasks
  FOR UPDATE USING (
    get_user_role() = 'admin'
    OR get_user_role() = 'stakeholder'
    OR team_role = get_user_role()
  );

-- ── 4. Update requests SELECT policy to include new roles ───────────
DROP POLICY IF EXISTS "requests_select" ON public.requests;
CREATE POLICY "requests_select" ON public.requests
  FOR SELECT USING (
    get_user_role() = 'admin'
    OR (get_user_role() = 'stakeholder' AND created_by = get_user_id())
    OR get_user_role() IN ('editorial_qa', 'design_qa', 'web_team', 'brand_team', 'seo_team')
  );

-- ── 5. Update requests UPDATE policy to include new roles ───────────
DROP POLICY IF EXISTS "requests_update" ON public.requests;
CREATE POLICY "requests_update" ON public.requests
  FOR UPDATE USING (
    get_user_role() = 'admin'
    OR (get_user_role() = 'stakeholder' AND created_by = get_user_id())
    OR (get_user_role() = 'editorial_qa' AND (status = 'editorial_qa' OR overall_status IS NOT NULL))
    OR (get_user_role() = 'design_qa'    AND (status = 'design_qa'    OR overall_status IS NOT NULL))
    OR (get_user_role() = 'web_team'     AND (status = 'web_team'     OR overall_status IS NOT NULL))
    OR (get_user_role() IN ('brand_team', 'seo_team') AND overall_status IS NOT NULL)
  );

-- ── 6. Update comments SELECT policy to include new roles ──────────
DROP POLICY IF EXISTS "comments_select" ON public.comments;
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

-- ── 7. Update attachments SELECT policy to include new roles ────────
DROP POLICY IF EXISTS "attachments_select" ON public.attachments;
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

-- ══════════════════════════════════════════════════════════════════
-- Verify:
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public';
-- ══════════════════════════════════════════════════════════════════
