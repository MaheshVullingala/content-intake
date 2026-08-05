-- ══════════════════════════════════════════════════════════════════════
-- Content Intake Portal — fix silent auth_id linking failure
-- Run in Supabase SQL Editor (safe to re-run)
--
-- Root cause of "Save failed: 42501 new row violates row-level security
-- policy for table requests" (and any other RLS-gated write) for a user
-- whose public.users row exists but whose auth_id doesn't match their
-- current Supabase Auth id (e.g. an admin-created row, a reset auth
-- account, or any pre-existing user whose auth.users id changed):
--
-- getUserProfile() (src/lib/supabase.js) falls back to looking the user
-- up by email when the auth_id lookup misses, then tried to silently
-- UPDATE public.users SET auth_id = <new id> directly from the client.
-- But users_update's RLS policy is:
--   FOR UPDATE USING (auth_id = auth.uid() OR get_user_role() = 'admin')
-- — which requires auth_id to ALREADY equal auth.uid() before you're
-- allowed to update the row. That's exactly backwards for a first-time
-- link: the row's auth_id is NULL/stale (not yet auth.uid()) precisely
-- because it hasn't been linked yet. The UPDATE silently affects 0 rows
-- (Postgres RLS doesn't raise an error for this, it just filters the row
-- out) and the client's .then(() => {}) swallowed even that. The app then
-- proceeded as if auth_id were linked (returning a client-side object
-- with auth_id patched in), while the database never actually saw the
-- update — so get_user_id()/get_user_role() (used by every RLS policy in
-- this schema) kept returning NULL for that user's real session,
-- failing every subsequent insert/update with 42501, permanently, with
-- no self-healing path.
--
-- Fix: a narrow SECURITY DEFINER RPC that bypasses RLS ONLY for this one
-- safe operation — linking a row whose auth_id IS NULL to the caller's
-- own verified email (read from auth.users server-side, never trusted
-- from the client). Cannot be used to hijack an already-linked row or
-- impersonate a different email.
-- ══════════════════════════════════════════════════════════════════════

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

  -- Nothing to link (already linked by a concurrent call, e.g. two tabs
  -- open at once) — return the row as it stands now instead of NULL.
  IF v_row.id IS NULL THEN
    SELECT * INTO v_row FROM public.users WHERE auth_id = auth.uid();
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_auth_id_by_email() TO authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- Verify (as the affected user, or check directly):
-- SELECT id, email, auth_id FROM public.users WHERE email = '<test user email>';
-- ══════════════════════════════════════════════════════════════════════
