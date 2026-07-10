-- ══════════════════════════════════════════════════════════════════════
-- Content Intake Portal — v2 Schema Additions
-- Run in Supabase SQL Editor AFTER the existing root-level migrations:
--   supabase-schema.sql → rls-migration.sql → tasks-migration.sql
-- All statements use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS so this
-- file is safe to re-run.
-- ══════════════════════════════════════════════════════════════════════


-- ── 1. Extend users role constraint to include v2 roles ──────────────
-- The original schema only allows old v1 roles; we need to expand it.
DO $$
BEGIN
  -- Drop the old inline check constraint (Postgres auto-names it users_role_check)
  ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN (
    -- v2 roles
    'super_admin', 'admin', 'pending', 'stakeholder',
    'editorial_team', 'brand_team', 'seo_team', 'design_team', 'web_team',
    -- v1 legacy roles (kept so existing users are not broken)
    'editorial_qa', 'design_qa'
  ));


-- ── 2. Extend requests table ─────────────────────────────────────────
-- overall_status, needs_brand, admin_reviewed_by/at,
-- stakeholder_approved_brand/design are already added by tasks-migration.sql.
-- We add only the columns that are genuinely new here.
ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS priority               TEXT    DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  ADD COLUMN IF NOT EXISTS priority_override_reason TEXT,
  ADD COLUMN IF NOT EXISTS due_date               DATE,
  ADD COLUMN IF NOT EXISTS published_at           TIMESTAMPTZ;

-- These columns were in the spec but may already exist from tasks-migration.sql.
-- ADD COLUMN IF NOT EXISTS is a no-op if the column is already present.
ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS overall_status              TEXT,
  ADD COLUMN IF NOT EXISTS needs_brand                 BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS admin_reviewed_by           UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS admin_reviewed_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stakeholder_approved_brand  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stakeholder_approved_design BOOLEAN DEFAULT FALSE;


-- ── 3. Extend tasks table ────────────────────────────────────────────
-- The base tasks table was created by tasks-migration.sql with fewer columns.
-- We add the missing columns here.
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS question_asked_by    UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS answer_given_by      UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS brand_files_note     TEXT,
  ADD COLUMN IF NOT EXISTS pending_action_note  TEXT,
  ADD COLUMN IF NOT EXISTS pending_action_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pending_action_by    UUID REFERENCES public.users(id);

-- Add team_role CHECK constraint (safe to add; DB was cleaned before v2 start)
DO $$
BEGIN
  ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_team_role_check
    CHECK (team_role IN (
      'editorial_team', 'brand_team', 'seo_team', 'design_team', 'web_team'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add status CHECK constraint
DO $$
BEGIN
  ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_status_check
    CHECK (status IN (
      'locked', 'pending', 'in_progress', 'waiting_for_brand',
      'needs_info', 'pending_approval', 'pending_action', 'completed'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add UNIQUE constraint: one task row per (request, team)
DO $$
BEGIN
  ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_request_team_unique
    UNIQUE (request_id, team_role);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ── 4. Create notifications table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  message     TEXT,
  request_id  UUID        REFERENCES public.requests(id) ON DELETE CASCADE,
  task_id     UUID        REFERENCES public.tasks(id)    ON DELETE SET NULL,
  action_url  TEXT,
  is_read     BOOLEAN     DEFAULT FALSE,
  email_sent  BOOLEAN     DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ── 5. Create audit_log table (immutable) ────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
  id                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp          TIMESTAMPTZ DEFAULT NOW(),
  user_id            UUID        REFERENCES public.users(id),
  user_role          TEXT,
  user_email         TEXT,
  user_department    TEXT,
  impersonating_role TEXT,
  action             TEXT        NOT NULL,
  entity_type        TEXT,
  entity_id          UUID,
  field_name         TEXT,
  old_value          TEXT,
  new_value          TEXT,
  ip_address         TEXT,
  session_id         TEXT
);


-- ── 6. Indexes ────────────────────────────────────────────────────────

-- tasks (idx_tasks_request_id may already exist as tasks_request_id_idx)
CREATE INDEX IF NOT EXISTS idx_tasks_request_id  ON public.tasks(request_id);
CREATE INDEX IF NOT EXISTS idx_tasks_team_role   ON public.tasks(team_role);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status      ON public.tasks(status);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notif_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_unread  ON public.notifications(user_id, is_read);

-- audit_log
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON public.audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user_id   ON public.audit_log(user_id);


-- ── 7. Realtime ────────────────────────────────────────────────────────
-- tasks may already be in the publication from tasks-migration.sql; both
-- ALTER statements are idempotent (Supabase ignores duplicate additions).
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;


-- ══════════════════════════════════════════════════════════════════════
-- Verify:
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'requests' ORDER BY ordinal_position;
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'tasks'    ORDER BY ordinal_position;
-- \d public.notifications
-- \d public.audit_log
-- ══════════════════════════════════════════════════════════════════════
