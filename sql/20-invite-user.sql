-- "Invite User" admin flow: an admin can pre-provision a public.users row
-- (email + role + department assigned, auth_id left NULL) before the
-- person has ever logged in. Once they either sign in with Okta or
-- self-register with that same email, handle_new_user() (see
-- sql/18-fix-handle-new-user-email-link.sql) links the new auth.users row
-- to this one by email instead of creating a duplicate — so their role
-- is already in place from the moment they first log in, no separate
-- "assign role" step needed afterward.
--
-- This is a SECURITY DEFINER RPC rather than a plain client .insert(),
-- because public.users has no INSERT policy at all (by design — the only
-- other writer is the handle_new_user() trigger). Narrow and self-
-- checking: verifies the caller is an admin, validates the email domain
-- and role server-side (never trust a tampered client call), and refuses
-- to create a duplicate for an email that already has a row.

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
  IF get_user_role() <> 'admin' THEN
    RAISE EXCEPTION 'Only admins can invite users.' USING ERRCODE = '42501';
  END IF;

  IF v_email IS NULL OR v_email = '' OR v_email NOT LIKE '%@cadence.com' THEN
    RAISE EXCEPTION 'Invites are limited to @cadence.com email addresses.' USING ERRCODE = 'P0001';
  END IF;

  -- Same assignable-role set AdminPanel.js's existing role dropdown
  -- offers (ROLES constant) — deliberately narrower than the full DB
  -- CHECK constraint on users.role, which also allows legacy/internal
  -- values ('pending', 'super_admin', etc.) that don't belong here.
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
