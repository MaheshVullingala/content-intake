-- Fixes handle_new_user() to link an admin-pre-provisioned public.users
-- row (auth_id IS NULL, matched by email) instead of blindly inserting a
-- second row on that person's first login.
--
-- Why this matters: an Okta admin-provisioning flow works by an admin
-- creating a public.users row ahead of time — email + role assigned,
-- auth_id left NULL — before the person has ever logged in. Without this
-- fix, that person's first login (Okta or password) fires
-- on_auth_user_created, which INSERTs a brand-new row keyed on the new
-- auth_id (ON CONFLICT (auth_id) DO NOTHING never triggers, since no row
-- has that auth_id yet). getUserProfile() then finds that new row via
-- its primary auth_id lookup and returns immediately — it never reaches
-- the email fallback (src/lib/supabase.js, link_auth_id_by_email() RPC)
-- that would have found the admin's row. Net effect: the person ends up
-- permanently stuck as role 'pending' in a duplicate row, and the
-- admin's pre-assigned role is orphaned with no error anywhere.
--
-- See CONTEXT.md "Okta SSO: plug-and-play login toggle" for the fuller
-- writeup and sql/16-fix-auth-id-linking.sql for the related RPC this
-- complements (that one covers login N, when N > 1, i.e. no local
-- session yet but the auth.users row already exists; this one covers
-- login 1, when the auth.users row is being created for the first time).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  linked_id uuid;
BEGIN
  -- Link to an existing admin-pre-provisioned row first, if one exists.
  UPDATE public.users
  SET auth_id = NEW.id
  WHERE auth_id IS NULL AND lower(email) = lower(NEW.email)
  RETURNING id INTO linked_id;

  IF linked_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- No pre-provisioned row — this is a genuinely new person (self-serve
  -- registration path). Same insert as before.
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
