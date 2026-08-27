-- ══════════════════════════════════════════════════════════════════════
-- Content Intake Portal — Consolidated Bootstrap Schema
-- Generated 2026-07-29 by introspecting the LIVE production database
-- (project izhfetvnortpjimfwnad) via the Supabase Management API.
--
-- This file supersedes the 17 incremental files previously in this repo
-- (supabase-schema.sql, rls-migration.sql, tasks-migration.sql,
-- sql/01–11, settings-migration.sql, image-refs-migration.sql,
-- design-images-migration.sql). Those files are INCOMPLETE — the live
-- schema accumulated many columns, RLS policies, and role values
-- directly in the Supabase SQL Editor that were never committed to any
-- tracked file. This file is the first fully authoritative snapshot.
--
-- Run this top-to-bottom on a fresh Postgres instance (e.g. self-hosted
-- Supabase in the RHEL 9 VM) to reproduce the current production schema
-- exactly. Safe to re-run (idempotent: CREATE TABLE IF NOT EXISTS,
-- CREATE OR REPLACE FUNCTION, ON CONFLICT DO NOTHING on policies via
-- DROP POLICY IF EXISTS + CREATE).
--
-- Requires: pgcrypto extension (for gen_random_uuid()) — enabled by
-- default in Supabase projects; self-hosted stacks must run
-- `CREATE EXTENSION IF NOT EXISTS pgcrypto;` first (included below).
--
-- Verified: parsed error-free by Postgres's own SQL grammar (libpg_query
-- via the `pglast` parser) — 113/113 statements syntactically valid.
-- Not yet applied to a live/branch database — do that before trusting it
-- against a real self-hosted instance.
-- ══════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ══════════════════════════════════════════════════════════════════════
-- 1. TABLES
-- ══════════════════════════════════════════════════════════════════════

-- ── users ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  role         TEXT NOT NULL CHECK (role = ANY (ARRAY[
                 'super_admin','admin','pending','stakeholder',
                 'editorial_team','brand_team','seo_team','design_team',
                 'web_team','editorial_qa','design_qa'
               ])),
  department   TEXT,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  auth_id      UUID UNIQUE REFERENCES auth.users(id),
  can_assign   BOOLEAN DEFAULT false
);

-- ── requests ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.requests (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_type                   TEXT NOT NULL CHECK (page_type = ANY (ARRAY[
                                 'Product','Solutions','Glossary','On-demand Webinar'
                               ])),
  status                      TEXT NOT NULL DEFAULT 'editorial_qa',
  created_by                  UUID REFERENCES public.users(id),
  created_at                  TIMESTAMPTZ DEFAULT now(),
  updated_at                  TIMESTAMPTZ DEFAULT now(),

  -- banner
  page_title                  TEXT,
  sub_title                   TEXT,
  cta1_label                  TEXT,
  cta1_link                   TEXT,
  cta2_label                  TEXT,
  cta2_link                   TEXT,
  banner_image                TEXT,
  banner_image_note           TEXT,
  banner_image_ref            JSONB,
  notes                       TEXT,

  -- overview
  overview_label               TEXT,
  overview_impact              TEXT,
  overview_description         TEXT,
  overview_media_url           TEXT,
  overview_media_type          TEXT,
  overview_media_note          TEXT,
  overview_media_ref           JSONB,
  overview_media_alt           TEXT, -- accessibility alt text; only meaningful when overview_media_type is image/diagram

  -- assignment
  assigned_to                 UUID REFERENCES public.users(id),
  assigned_by                 UUID REFERENCES public.users(id),
  assigned_at                 TIMESTAMPTZ,

  -- key_benefits
  kb_label                    TEXT,
  kb_impact                   TEXT,
  kb_description               TEXT,
  kb_cards                    JSONB DEFAULT '[]'::jsonb,

  -- features_apps
  fa_label                    TEXT,
  fa_impact                   TEXT,
  fa_description               TEXT,
  fa_view_type                 TEXT,
  fa_tab_orientation           TEXT,
  fa_items                    JSONB DEFAULT '[]'::jsonb,
  fa_columns                  JSONB DEFAULT '[]'::jsonb,
  fa_rows                     JSONB DEFAULT '[]'::jsonb,

  -- applications (split from features_apps — see sql/24-applications-section.sql)
  app_label                   TEXT,
  app_impact                  TEXT,
  app_description              TEXT,
  app_view_type                TEXT,
  app_items                   JSONB DEFAULT '[]'::jsonb,

  -- customer_stories
  cs_label                    TEXT,
  cs_impact                   TEXT,
  cs_items                    JSONB DEFAULT '[]'::jsonb,

  -- promo_section
  promo_bg_image               TEXT,
  promo_bg_note                 TEXT,
  promo_bg_image_ref           JSONB,
  promo_label                  TEXT,
  promo_title                  TEXT,
  promo_description             TEXT,
  promo_btn_label               TEXT,
  promo_btn_link                TEXT,

  -- related_content
  rc_label                    TEXT,
  rc_impact                   TEXT,
  rc_cards                    JSONB DEFAULT '[]'::jsonb,

  -- resources
  res_label                   TEXT,
  res_impact                  TEXT,
  res_selected                JSONB DEFAULT '[]'::jsonb,
  res_video_carousel          JSONB DEFAULT '{}'::jsonb,
  res_mixed_carousel          JSONB DEFAULT '{}'::jsonb,
  res_resources                JSONB DEFAULT '[]'::jsonb,
  res_news                    JSONB DEFAULT '{}'::jsonb,
  res_blogs                   JSONB DEFAULT '{}'::jsonb,

  -- related_products
  rp_label                    TEXT,
  rp_impact                   TEXT,
  rp_description               TEXT,
  rp_cards                    JSONB DEFAULT '[]'::jsonb,

  -- training_support
  ts_label                    TEXT DEFAULT 'TRAINING AND SUPPORT',
  ts_impact                   TEXT DEFAULT 'Need Help?',
  ts_card1_icon                TEXT DEFAULT 'Training icon - person with checklist',
  ts_card1_title                TEXT DEFAULT 'Training',
  ts_card1_description          TEXT DEFAULT 'The Training Learning Maps help you get a comprehensive visual overview of learning opportunities. Training News - Subscribe',
  ts_card1_cta_label            TEXT DEFAULT 'BROWSE TRAINING',
  ts_card1_cta_link             TEXT,
  ts_card2_icon                TEXT DEFAULT 'Cloud with question mark - online support',
  ts_card2_title                TEXT DEFAULT 'Online Support',
  ts_card2_description          TEXT DEFAULT 'The Cadence ASK system fields our entire library of accessible materials for self-study and step-by-step instruction.',
  ts_card2_cta_label            TEXT DEFAULT 'REQUEST SUPPORT',
  ts_card2_cta_link             TEXT,
  ts_card3_icon                TEXT DEFAULT 'People group icon - technical forums',
  ts_card3_title                TEXT DEFAULT 'Technical Forums',
  ts_card3_description          TEXT DEFAULT 'Find community on the technical forums to discuss and elaborate on your design ideas.',
  ts_card3_cta_label            TEXT DEFAULT 'FIND ANSWERS',
  ts_card3_cta_link             TEXT,

  -- seo
  seo_page_location            TEXT,
  seo_meta_title               TEXT,
  seo_meta_description          TEXT,
  seo_meta_keywords            TEXT,
  seo_og_title                 TEXT,
  seo_og_description            TEXT,

  -- design QA flags (per-section "needs design attention")
  design_flag_banner           BOOLEAN DEFAULT false,
  design_flag_overview         BOOLEAN DEFAULT false,
  design_flag_kb               BOOLEAN DEFAULT false,
  design_flag_fa               BOOLEAN DEFAULT false,
  design_flag_app              BOOLEAN DEFAULT false,
  design_flag_cs               BOOLEAN DEFAULT false,
  design_flag_rc               BOOLEAN DEFAULT false,
  design_flag_promo            BOOLEAN DEFAULT false,
  design_flag_rp               BOOLEAN DEFAULT false,
  design_flag_ts               BOOLEAN DEFAULT false,

  -- v2 workflow
  overall_status               TEXT,
  needs_brand                  BOOLEAN DEFAULT false,
  admin_reviewed_by             UUID REFERENCES public.users(id),
  admin_reviewed_at             TIMESTAMPTZ,
  stakeholder_approved_brand    BOOLEAN DEFAULT false,
  stakeholder_approved_design   BOOLEAN DEFAULT false,
  priority                     TEXT DEFAULT 'normal' CHECK (priority = ANY (ARRAY['low','normal','high','urgent'])),
  priority_override_reason      TEXT,
  stakeholder_priority_reason   TEXT,
  due_date                     DATE,
  published_at                 TIMESTAMPTZ,

  CONSTRAINT requests_status_check CHECK (
    status = ANY (ARRAY['draft','editorial_qa','design_qa','pending_approval','web_team','published'])
    OR overall_status IS NOT NULL
  )
);

-- ── comments ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID REFERENCES public.requests(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES public.users(id),
  user_name   TEXT NOT NULL,
  user_role   TEXT NOT NULL,
  text        TEXT NOT NULL,
  is_return   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── attachments ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attachments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    UUID REFERENCES public.requests(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES public.users(id),
  user_name     TEXT NOT NULL,
  file_name     TEXT NOT NULL,
  file_type     TEXT NOT NULL,
  file_size     INTEGER NOT NULL,
  storage_path  TEXT NOT NULL,
  public_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  section_key   TEXT DEFAULT NULL  -- dead code as of 2026-07-29: no references in src/
);

-- ── status_history ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.status_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID REFERENCES public.requests(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES public.users(id),
  user_name   TEXT NOT NULL,
  from_status TEXT,
  to_status   TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── settings ─────────────────────────────────────────────────────────
-- Singleton row (id='global'). Char-limit overrides live in their own
-- proper key-value table, char_limit_overrides, below — not here.
CREATE TABLE IF NOT EXISTS public.settings (
  id                            TEXT PRIMARY KEY DEFAULT 'global',
  timeout_mins                  INTEGER DEFAULT 5,
  updated_at                    TIMESTAMPTZ DEFAULT now(),
  updated_by                    TEXT,
  email_notifications_enabled   BOOLEAN DEFAULT false,
  password_login_enabled        BOOLEAN DEFAULT true,
  test_data_enabled             BOOLEAN DEFAULT true,
  placeholder_check_enabled     BOOLEAN DEFAULT true
);

-- ── tasks ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id            UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  team_role             TEXT NOT NULL CHECK (team_role = ANY (ARRAY[
                          'editorial_team','brand_team','seo_team','design_team','web_team'
                        ])),
  status                TEXT NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY[
                          'locked','pending','in_progress','waiting_for_brand',
                          'needs_info','pending_approval','pending_action','completed'
                        ])),
  is_required           BOOLEAN DEFAULT true,
  assigned_to           UUID REFERENCES public.users(id),
  assigned_by           UUID REFERENCES public.users(id),
  question              TEXT,
  question_at           TIMESTAMPTZ,
  question_asked_by     UUID REFERENCES public.users(id),
  answer                TEXT,
  answer_at             TIMESTAMPTZ,
  answer_given_by       UUID REFERENCES public.users(id),
  completed_at          TIMESTAMPTZ,
  unlocked_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  brand_files_note       TEXT,
  pending_action_note     TEXT,
  pending_action_at      TIMESTAMPTZ,
  pending_action_by      UUID REFERENCES public.users(id),
  -- mid-flight content change notification (see content_change_requests below)
  content_update_note    TEXT,
  content_update_at      TIMESTAMPTZ,
  content_update_read    BOOLEAN DEFAULT true,

  CONSTRAINT tasks_request_team_unique UNIQUE (request_id, team_role)
);

-- ── notifications ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id),
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT,
  request_id  UUID REFERENCES public.requests(id),
  task_id     UUID REFERENCES public.tasks(id),
  action_url  TEXT,
  is_read     BOOLEAN DEFAULT false,
  email_sent  BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── audit_log ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp           TIMESTAMPTZ DEFAULT now(),
  user_id             UUID REFERENCES public.users(id),
  user_role           TEXT,
  user_email          TEXT,
  user_department     TEXT,
  impersonating_role  TEXT,
  action              TEXT NOT NULL,
  entity_type         TEXT,
  entity_id           UUID,
  field_name          TEXT,
  old_value           TEXT,
  new_value           TEXT,
  ip_address          TEXT,
  session_id          TEXT
);

-- ── task_attachments ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  request_id    UUID REFERENCES public.requests(id) ON DELETE CASCADE,
  uploaded_by   UUID REFERENCES public.users(id),
  file_name     TEXT NOT NULL,
  file_type     TEXT,
  file_size     INTEGER,
  storage_path  TEXT NOT NULL,
  public_url    TEXT,
  section_tag   TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── content_change_requests ──────────────────────────────────────────
-- Mid-flight content change proposals (stakeholder edits while teams
-- are actively working a request). See CONTEXT.md "Gap 7" / content
-- change feature notes for the full workflow.
CREATE TABLE IF NOT EXISTS public.content_change_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id        UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  submitted_by      UUID REFERENCES public.users(id),
  reason            TEXT NOT NULL,
  changed_fields    JSONB NOT NULL,   -- [{section,key,label,old_value,new_value}], native types
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending','approved','rejected'])),
  reviewed_by       UUID REFERENCES public.users(id),
  reviewed_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ── char_limit_overrides ─────────────────────────────────────────────
-- Admin-configurable character limits, read by useCharLimits()
-- (src/lib/charLimits.js) and merged over the static defaults in
-- constants.js (CHAR_LIMITS) / EditSectionModal.js (ITEM_LIMITS).
CREATE TABLE IF NOT EXISTS public.char_limit_overrides (
  key         TEXT PRIMARY KEY,
  value       INTEGER NOT NULL CHECK (value > 0),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  updated_by  TEXT
);


-- ══════════════════════════════════════════════════════════════════════
-- 2. INDEXES
-- ══════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_attachments_slot ON public.attachments(request_id, section_key) WHERE section_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON public.audit_log("timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user_id   ON public.audit_log(user_id);

CREATE INDEX IF NOT EXISTS idx_content_change_requests_request_id ON public.content_change_requests(request_id);
CREATE INDEX IF NOT EXISTS idx_content_change_requests_status     ON public.content_change_requests(status);

CREATE INDEX IF NOT EXISTS idx_notif_unread  ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notif_user_id ON public.notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_task_attachments_request_id ON public.task_attachments(request_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id    ON public.task_attachments(task_id);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_request_id  ON public.tasks(request_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status      ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_team_role   ON public.tasks(team_role);
-- NOTE: tasks_request_id_idx duplicates idx_tasks_request_id in production
-- (harmless leftover from an earlier migration attempt) — intentionally
-- not recreated here to avoid perpetuating the duplicate.


-- ══════════════════════════════════════════════════════════════════════
-- 3. HELPER FUNCTIONS (SECURITY DEFINER — used throughout RLS policies)
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM public.users WHERE auth_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_id()
RETURNS UUID
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT id FROM public.users WHERE auth_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_can_assign()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(can_assign, false) FROM public.users WHERE auth_id = auth.uid();
$$;

-- Narrow, safe RLS bypass for first-time auth_id linking (see
-- sql/16-fix-auth-id-linking.sql for the full bug writeup). users_update's
-- own RLS policy requires auth_id = auth.uid() to already be true, which a
-- row needing its FIRST link can never satisfy — a plain client-side
-- .update() here always silently affects 0 rows. This function bypasses
-- RLS only to link a row whose auth_id IS NULL to the caller's own
-- verified email (read server-side from auth.users, never client-supplied)
-- — cannot hijack an already-linked row or a different email.
CREATE OR REPLACE FUNCTION public.link_auth_id_by_email()
RETURNS public.users
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_email TEXT;
  v_row   public.users;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'No authenticated user';
  END IF;

  UPDATE public.users
  SET auth_id = auth.uid()
  WHERE lower(email) = lower(v_email) AND auth_id IS NULL
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    SELECT * INTO v_row FROM public.users WHERE auth_id = auth.uid();
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_auth_id_by_email() TO authenticated;

-- Narrow, safe RLS bypass so the (unauthenticated) Login screen can check
-- whether an admin has turned off password login, without needing broad
-- anon SELECT access to the rest of settings (timeout_mins,
-- email_notifications_enabled, etc., which are not this page's business).
-- Defaults to TRUE (fail open) if the settings row doesn't exist yet, so
-- a fresh/uninitialized deployment never accidentally hides the only
-- working login method. See CONTEXT.md "Okta SSO: dual login" — the
-- actual lockout guardrail (ignore this flag entirely if Okta isn't
-- configured) lives in application code (src/lib/authConfig.js), not
-- here, since Postgres has no visibility into whether Okta/SAML is
-- actually wired up.
CREATE OR REPLACE FUNCTION public.get_password_login_enabled()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(
    (SELECT password_login_enabled FROM public.settings WHERE id = 'global'),
    true
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_password_login_enabled() TO anon, authenticated;

-- "Invite User": lets an admin pre-provision a public.users row (email +
-- role + department, auth_id left NULL) before the person has ever
-- logged in. public.users has no INSERT policy at all (the only other
-- writer is handle_new_user()), so this has to be a SECURITY DEFINER RPC
-- rather than a client .insert() — narrow and self-checking: verifies
-- the caller is an admin, validates the email domain and role
-- server-side, and refuses to duplicate an existing row. See
-- sql/20-invite-user.sql.
CREATE OR REPLACE FUNCTION public.invite_user(
  p_email      TEXT,
  p_name       TEXT,
  p_department TEXT,
  p_role       TEXT,
  p_can_assign BOOLEAN DEFAULT false
)
RETURNS public.users
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_email TEXT := lower(trim(p_email));
  v_row   public.users;
BEGIN
  IF get_user_role() NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Only admins can invite users.' USING ERRCODE = '42501';
  END IF;

  IF v_email IS NULL OR v_email = '' OR v_email NOT LIKE '%@cadence.com' THEN
    RAISE EXCEPTION 'Invites are limited to @cadence.com email addresses.' USING ERRCODE = 'P0001';
  END IF;

  IF p_role NOT IN ('stakeholder','editorial_qa','brand_team','seo_team','design_qa','web_team','admin') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (SELECT 1 FROM public.users WHERE lower(email) = v_email) THEN
    RAISE EXCEPTION 'A user with this email already exists.' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.users (email, name, department, role, can_assign, created_at)
  VALUES (
    v_email,
    COALESCE(NULLIF(trim(p_name), ''), split_part(v_email, '@', 1)),
    COALESCE(p_department, ''),
    p_role,
    COALESCE(p_can_assign, false),
    NOW()
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.invite_user(TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;

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

-- Auto-provisions a public.users row whenever a new auth.users row is
-- created. Self-serve: a signup that explicitly requested the stakeholder
-- role (Register.js sends role_request: "stakeholder" in signUp's
-- options.data) gets it immediately, no admin approval — stakeholder is
-- the only role safe to self-grant, since every requests_insert/update/
-- delete policy already requires created_by = self. Team roles
-- (editorial/brand/seo/design/web) and admin still always fall through to
-- 'pending' and require a human to assign. Strict allowlist of exactly
-- one literal value — never trust raw_user_meta_data for anything more
-- privileged.
--
-- Okta/SSO admin-provisioning case: an admin can create a public.users
-- row ahead of time (auth_id IS NULL, role already assigned) before the
-- person has ever logged in. If we blindly INSERT here, that person's
-- first Okta login creates a SECOND row keyed on the new auth_id, and
-- getUserProfile()'s auth_id lookup finds that new 'pending' row and
-- never falls through to check email — the admin's pre-assigned role is
-- silently orphaned forever. So: check for an existing auth_id-IS-NULL
-- row matching this email first and link it (UPDATE), only falling back
-- to INSERT for a genuinely new person. See sql/18-fix-handle-new-user-
-- email-link.sql.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  linked_id uuid;
BEGIN
  UPDATE public.users
  SET auth_id = NEW.id
  WHERE auth_id IS NULL AND lower(email) = lower(NEW.email)
  RETURNING id INTO linked_id;

  IF linked_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.users (auth_id, email, name, department, role, can_assign, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'department', ''),
    CASE WHEN NEW.raw_user_meta_data->>'role_request' = 'stakeholder'
         THEN 'stakeholder' ELSE 'pending' END,
    false,
    NOW()
  )
  ON CONFLICT (auth_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ══════════════════════════════════════════════════════════════════════
-- 4. ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE public.users                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_history           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_change_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.char_limit_overrides     ENABLE ROW LEVEL SECURITY;

-- ── users ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS users_select ON public.users;
CREATE POLICY users_select ON public.users
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS users_update ON public.users;
CREATE POLICY users_update ON public.users
  FOR UPDATE USING (auth_id = auth.uid() OR get_user_role() IN ('admin', 'super_admin'));

-- ── requests ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS requests_select ON public.requests;
CREATE POLICY requests_select ON public.requests
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS requests_insert ON public.requests;
CREATE POLICY requests_insert ON public.requests
  FOR INSERT WITH CHECK (
    get_user_role() IN ('stakeholder', 'admin', 'super_admin')
    AND created_by = get_user_id()
  );

DROP POLICY IF EXISTS requests_update ON public.requests;
CREATE POLICY requests_update ON public.requests
  FOR UPDATE USING (
    get_user_role() IN ('admin', 'super_admin')
    OR (get_user_role() = 'stakeholder' AND created_by = get_user_id())
    OR (get_user_role() IN ('editorial_team','brand_team','seo_team','design_team','web_team') AND overall_status IS NOT NULL)
  );

DROP POLICY IF EXISTS requests_delete ON public.requests;
CREATE POLICY requests_delete ON public.requests
  FOR DELETE USING (
    get_user_role() IN ('admin', 'super_admin')
    OR (get_user_role() = 'stakeholder' AND created_by = get_user_id() AND status = 'draft')
  );

-- ── comments ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS comments_select ON public.comments;
CREATE POLICY comments_select ON public.comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = comments.request_id
        AND (
          get_user_role() IN ('admin', 'super_admin')
          OR (get_user_role() = 'stakeholder' AND r.created_by = get_user_id())
          OR get_user_role() IN ('editorial_qa','design_qa','web_team','brand_team','seo_team')
        )
    )
  );

DROP POLICY IF EXISTS comments_insert ON public.comments;
CREATE POLICY comments_insert ON public.comments
  FOR INSERT WITH CHECK (
    user_id = get_user_id()
    AND EXISTS (SELECT 1 FROM public.requests r WHERE r.id = comments.request_id)
  );

DROP POLICY IF EXISTS comments_delete ON public.comments;
CREATE POLICY comments_delete ON public.comments
  FOR DELETE USING (get_user_role() IN ('admin', 'super_admin') OR user_id = get_user_id());

-- ── attachments ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS attachments_select ON public.attachments;
CREATE POLICY attachments_select ON public.attachments
  FOR SELECT USING (
    get_user_role() IN ('admin', 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = attachments.request_id
        AND (
          (get_user_role() = 'stakeholder' AND r.created_by = get_user_id())
          OR get_user_role() IN ('editorial_qa','design_qa','web_team','brand_team','seo_team')
        )
    )
  );

DROP POLICY IF EXISTS attachments_insert ON public.attachments;
CREATE POLICY attachments_insert ON public.attachments
  FOR INSERT WITH CHECK (user_id = get_user_id());

DROP POLICY IF EXISTS attachments_delete ON public.attachments;
CREATE POLICY attachments_delete ON public.attachments
  FOR DELETE USING (get_user_role() IN ('admin', 'super_admin') OR user_id = get_user_id());

-- ── status_history ───────────────────────────────────────────────────
-- NOTE: production has BOTH an old pair (history_select/history_insert)
-- and a newer pair (status_history_select/status_history_insert) left
-- active simultaneously — PERMISSIVE policies OR together so this is
-- functionally harmless, but it's redundant. Consolidated here into a
-- single pair; drop the legacy-named ones if they exist from old files.
DROP POLICY IF EXISTS history_select ON public.status_history;
DROP POLICY IF EXISTS history_insert ON public.status_history;
DROP POLICY IF EXISTS status_history_select ON public.status_history;
CREATE POLICY status_history_select ON public.status_history
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS status_history_insert ON public.status_history;
CREATE POLICY status_history_insert ON public.status_history
  FOR INSERT WITH CHECK (user_id = get_user_id());

-- ── settings ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS settings_select ON public.settings;
CREATE POLICY settings_select ON public.settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS settings_update ON public.settings;
CREATE POLICY settings_update ON public.settings
  FOR ALL USING (get_user_role() IN ('admin', 'super_admin'));

-- ── tasks ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS tasks_select ON public.tasks;
CREATE POLICY tasks_select ON public.tasks
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS tasks_insert ON public.tasks;
CREATE POLICY tasks_insert ON public.tasks
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT u.auth_id FROM public.users u WHERE u.role IN ('super_admin','admin'))
  );

-- Stakeholder clause is ownership-scoped (EXISTS against requests.created_by)
-- — a bare `get_user_role() = 'stakeholder'` would let ANY stakeholder
-- update ANY task row in the system, not just tasks on their own requests.
-- Matches the pattern already used in comments_select / attachments_select /
-- content_change_requests_select.
DROP POLICY IF EXISTS tasks_update ON public.tasks;
CREATE POLICY tasks_update ON public.tasks
  FOR UPDATE USING (
    get_user_role() IN ('admin', 'super_admin')
    OR (
      get_user_role() = 'stakeholder'
      AND EXISTS (
        SELECT 1 FROM public.requests r
        WHERE r.id = tasks.request_id AND r.created_by = get_user_id()
      )
    )
    OR team_role = get_user_role()
  );

-- Lets the web_team edit ANY task on a request once web_team's own task
-- exists, e.g. to record "request changes" against another team's task.
DROP POLICY IF EXISTS tasks_update_web_team_request_changes ON public.tasks;
CREATE POLICY tasks_update_web_team_request_changes ON public.tasks
  FOR UPDATE USING (
    get_user_role() = 'web_team'
    AND EXISTS (SELECT 1 FROM public.tasks wt WHERE wt.request_id = tasks.request_id AND wt.team_role = 'web_team')
  )
  WITH CHECK (
    get_user_role() = 'web_team'
    AND EXISTS (SELECT 1 FROM public.tasks wt WHERE wt.request_id = tasks.request_id AND wt.team_role = 'web_team')
  );

-- ── notifications ────────────────────────────────────────────────────
DROP POLICY IF EXISTS notifications_select ON public.notifications;
CREATE POLICY notifications_select ON public.notifications
  FOR SELECT USING (user_id = get_user_id());

DROP POLICY IF EXISTS notifications_insert ON public.notifications;
CREATE POLICY notifications_insert ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS notifications_update ON public.notifications;
CREATE POLICY notifications_update ON public.notifications
  FOR UPDATE USING (user_id = get_user_id()) WITH CHECK (user_id = get_user_id());

-- ── audit_log ────────────────────────────────────────────────────────
-- write path uses the service role (no insert policy needed client-side)
DROP POLICY IF EXISTS audit_log_select ON public.audit_log;
CREATE POLICY audit_log_select ON public.audit_log
  FOR SELECT USING (get_user_role() IN ('admin', 'super_admin'));

-- ── task_attachments ─────────────────────────────────────────────────
DROP POLICY IF EXISTS task_attachments_select ON public.task_attachments;
CREATE POLICY task_attachments_select ON public.task_attachments
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS task_attachments_insert ON public.task_attachments;
CREATE POLICY task_attachments_insert ON public.task_attachments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS task_attachments_delete ON public.task_attachments;
CREATE POLICY task_attachments_delete ON public.task_attachments
  FOR DELETE USING (
    auth.uid() IN (SELECT users.auth_id FROM public.users WHERE users.id = task_attachments.uploaded_by)
  );

-- ── content_change_requests ──────────────────────────────────────────
DROP POLICY IF EXISTS content_change_requests_select ON public.content_change_requests;
CREATE POLICY content_change_requests_select ON public.content_change_requests
  FOR SELECT USING (
    get_user_role() IN ('admin', 'super_admin')
    OR EXISTS (SELECT 1 FROM public.requests r WHERE r.id = content_change_requests.request_id AND r.created_by = get_user_id())
  );

DROP POLICY IF EXISTS content_change_requests_insert ON public.content_change_requests;
CREATE POLICY content_change_requests_insert ON public.content_change_requests
  FOR INSERT WITH CHECK (
    submitted_by = get_user_id()
    AND (
      get_user_role() IN ('admin', 'super_admin')
      OR (
        get_user_role() = 'stakeholder'
        AND EXISTS (SELECT 1 FROM public.requests r WHERE r.id = content_change_requests.request_id AND r.created_by = get_user_id())
      )
    )
  );

DROP POLICY IF EXISTS content_change_requests_update ON public.content_change_requests;
CREATE POLICY content_change_requests_update ON public.content_change_requests
  FOR UPDATE USING (get_user_role() IN ('admin', 'super_admin'));


-- ── char_limit_overrides ─────────────────────────────────────────────
DROP POLICY IF EXISTS char_limit_overrides_select ON public.char_limit_overrides;
CREATE POLICY char_limit_overrides_select ON public.char_limit_overrides
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS char_limit_overrides_write ON public.char_limit_overrides;
CREATE POLICY char_limit_overrides_write ON public.char_limit_overrides
  FOR ALL USING (get_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (get_user_role() IN ('admin', 'super_admin'));


-- ══════════════════════════════════════════════════════════════════════
-- 5. STORAGE (buckets + policies)
-- ══════════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

-- Policies exist only for the 'attachments' bucket in production; the
-- 'assets' bucket is public-read with no explicit RLS policy rows
-- (relies on the bucket's public flag for reads, service role for writes).
DROP POLICY IF EXISTS storage_select ON storage.objects;
CREATE POLICY storage_select ON storage.objects
  FOR SELECT USING (bucket_id = 'attachments' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS storage_insert ON storage.objects;
CREATE POLICY storage_insert ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'attachments' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS storage_delete ON storage.objects;
CREATE POLICY storage_delete ON storage.objects
  FOR DELETE USING (bucket_id = 'attachments' AND auth.uid() IS NOT NULL);


-- ══════════════════════════════════════════════════════════════════════
-- 6. KNOWN DEAD CODE / LOOSE ENDS (kept for fidelity, flagged for cleanup)
-- ══════════════════════════════════════════════════════════════════════
-- - attachments.section_key + idx_attachments_slot: zero references in
--   src/ as of 2026-07-29. Superseded by task_attachments.section_tag.
-- - public.design_images table: referenced in an old migration file but
--   does not exist in production and is not used by any src/ file —
--   intentionally NOT created by this script.
-- - tasks_request_id_idx (duplicate of idx_tasks_request_id): exists in
--   production, not recreated here.
-- - requests_status_check allows either the legacy v1 status enum OR any
--   value when overall_status is set (v2 requests always set
--   overall_status, so `status` becomes mostly vestigial post-v2).
-- ══════════════════════════════════════════════════════════════════════
