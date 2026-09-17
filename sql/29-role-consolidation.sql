-- ══════════════════════════════════════════════════════════════════════
-- Content Intake Portal — Consolidate to 4 roles (2026-09-11)
-- Run in Supabase SQL Editor (safe to re-run)
--
-- Product decision: going forward there are exactly four roles --
--   stakeholder    submits requests
--   editorial_team reviews/edits content -- the existing v2 task-based
--                  editorial workflow (claim task, edit sections
--                  directly, open comment threads, mark complete) is
--                  kept as-is; nothing about how it works changes here
--   admin          reviews incoming requests, sets up tasks, manages
--                  users/settings. super_admin is folded into this, not
--                  demoted to 'general' -- an account that currently has
--                  full admin rights shouldn't end up read-only
--   general        NEW -- read-only view of every request + its page
--                  preview, but CAN still post section-scoped comments
--                  (product decision: view-only except discussion)
--
-- brand_team, seo_team, design_team, web_team, and the legacy v1
-- editorial_qa/design_qa role names are retired. Real accounts holding
-- them are migrated below rather than left stranded with an invalid role.
--
-- What this migration deliberately does NOT touch: tasks.team_role keeps
-- its existing, wider CHECK constraint. Historical task rows on old
-- requests genuinely were worked by web_team/design_team/etc. -- rewriting
-- that would falsify history. Only *new* task creation is restricted
-- (application-layer change, AdminTaskSetup.js) -- the DB still allows
-- the old team_role values to exist on old rows, it just won't be handed
-- new ones going forward. Likewise, every OTHER policy that mentions
-- 'super_admin' or the retired team roles elsewhere in the schema
-- (tasks_update, audit_log_select, settings_update, attachments_select,
-- etc.) is left as-is -- once no user can hold those role values, those
-- branches are simply permanently false, which is harmless. Only the two
-- policies below actually needed to change behavior (comments need to
-- admit 'general'; requests_update's operational-team clause needs to
-- drop the four retired teams).
--
-- Gotcha hit while writing this: the UPDATE that sets role='general' has
-- to run AFTER the CHECK constraint is widened to allow 'general' --
-- doing UPDATE-then-tighten-constraint in that order fails immediately
-- (the old constraint rejects 'general' before the new one ever gets
-- created). Three-step order below: widen -> migrate -> tighten.
-- ══════════════════════════════════════════════════════════════════════

-- ── Step 1: widen the constraint first so the migration UPDATEs below
-- (which write the new 'general' value) aren't rejected by the old one ──
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role = ANY (ARRAY['super_admin','admin','pending','stakeholder','editorial_team','brand_team','seo_team','design_team','web_team','editorial_qa','design_qa','general']));

-- ── Step 2: migrate existing accounts off the retired role values ─────
UPDATE public.users SET role = 'editorial_team' WHERE role = 'editorial_qa';
UPDATE public.users SET role = 'admin'          WHERE role = 'super_admin';
UPDATE public.users SET role = 'general'        WHERE role IN ('seo_team', 'design_team', 'brand_team', 'web_team', 'design_qa');

-- ── Step 3: now that no row uses a retired value, tighten the
-- constraint down to the final 4-role (+pending) set ───────────────────
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role = ANY (ARRAY['admin', 'pending', 'stakeholder', 'editorial_team', 'general']));

-- ── Step 4: RLS -- comments open to 'general' (view + discuss, no
-- edit); operational-team clause narrowed to editorial_team only ──────
DROP POLICY IF EXISTS comments_select ON public.comments;
CREATE POLICY comments_select ON public.comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = comments.request_id
        AND (
          get_user_role() IN ('admin', 'general')
          OR (get_user_role() = 'stakeholder' AND r.created_by = get_user_id())
          OR get_user_role() = 'editorial_team'
        )
    )
  );

DROP POLICY IF EXISTS comments_insert ON public.comments;
CREATE POLICY comments_insert ON public.comments
  FOR INSERT WITH CHECK (
    user_id = get_user_id()
    AND EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = comments.request_id
        AND (
          get_user_role() IN ('admin', 'general')
          OR (get_user_role() = 'stakeholder' AND r.created_by = get_user_id())
          OR get_user_role() = 'editorial_team'
        )
    )
  );

-- ── Step 5: RLS -- requests_update's operational clause narrowed to
-- editorial_team only ('general' intentionally excluded -- read-only) ─
DROP POLICY IF EXISTS requests_update ON public.requests;
CREATE POLICY requests_update ON public.requests
  FOR UPDATE USING (
    get_user_role() = 'admin'
    OR (get_user_role() = 'stakeholder' AND created_by = get_user_id())
    OR (get_user_role() = 'editorial_team' AND overall_status IS NOT NULL)
  );
