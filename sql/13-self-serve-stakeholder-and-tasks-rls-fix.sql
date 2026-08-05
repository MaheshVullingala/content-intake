-- ══════════════════════════════════════════════════════════════════════
-- Content Intake Portal — Self-serve stakeholder registration
--                          + tasks_update RLS ownership fix
-- Run in Supabase SQL Editor (safe to re-run)
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. Self-serve stakeholder role ──────────────────────────────────────
-- A new signup that explicitly requested the stakeholder role (Register.js
-- sends role_request: "stakeholder" in the signUp options.data) gets it
-- immediately — no admin approval needed. Stakeholder is the only role
-- safe to self-grant: every requests_insert/update/delete policy already
-- requires created_by = self, so a stakeholder can only ever touch their
-- own requests. Team roles (editorial/brand/seo/design/web) and admin
-- still always fall through to 'pending' and require a human to assign —
-- this is a strict allowlist of exactly one literal value, never trust
-- raw_user_meta_data for anything more privileged than that.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
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

-- ── 2. tasks_update RLS — scope the stakeholder clause to own requests ──
-- Previously `get_user_role() = 'stakeholder'` was unconditional — ANY
-- stakeholder could UPDATE ANY task row in the system, not just tasks on
-- requests they created. This was reachable even before self-serve
-- registration (an admin-approved stakeholder had the same hole), but
-- self-serve removes the human-review checkpoint that used to sit in
-- front of it, so fixing it now. Matches the ownership-check pattern
-- already used in comments_select / attachments_select /
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

-- ══════════════════════════════════════════════════════════════════════
-- Verify:
-- SELECT proname, prosrc FROM pg_proc WHERE proname = 'handle_new_user';
-- SELECT policyname, qual FROM pg_policies
--   WHERE tablename = 'tasks' AND policyname = 'tasks_update';
-- ══════════════════════════════════════════════════════════════════════
