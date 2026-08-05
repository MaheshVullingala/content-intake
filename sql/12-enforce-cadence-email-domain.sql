-- ══════════════════════════════════════════════════════════════════════
-- Content Intake Portal — Restrict registration to @cadence.com
-- Run in Supabase SQL Editor (safe to re-run)
--
-- Client-side check lives in Register.js (ALLOWED_EMAIL_DOMAIN) for UX,
-- but that's trivially bypassable by anyone calling the Supabase Auth
-- API directly. This is the authoritative check: a BEFORE INSERT
-- trigger on auth.users that rejects the signup outright if the email
-- doesn't end in @cadence.com. Runs before handle_new_user() (an AFTER
-- INSERT trigger), so a rejected signup never creates a public.users
-- row either.
--
-- To change the allowed domain later, just CREATE OR REPLACE this
-- function — no need to touch the trigger.
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.enforce_email_domain()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.email IS NOT NULL AND lower(NEW.email) NOT LIKE '%@cadence.com' THEN
    RAISE EXCEPTION 'Registration is limited to @cadence.com email addresses.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_email_domain_before_insert ON auth.users;
CREATE TRIGGER enforce_email_domain_before_insert
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.enforce_email_domain();

-- ══════════════════════════════════════════════════════════════════════
-- Notes:
-- - Only gates NEW signups (BEFORE INSERT) — does not touch any existing
--   auth.users/public.users rows, so nobody currently in the system is
--   affected.
-- - Applies to ALL signup paths (email/password signUp, magic link,
--   OAuth, etc.) since it's on auth.users itself, not the app layer.
-- - Email confirmation ("verification") is a separate, already-working
--   piece — Register.js already calls supabase.auth.signUp() and shows
--   "check your email" messaging. That relies on Supabase Auth's
--   Confirm Email setting being ON (Dashboard → Authentication →
--   Providers → Email → Confirm email; self-hosted: GOTRUE_MAILER_
--   AUTOCONFIRM=false in the GoTrue container env). Worth confirming
--   that's actually enabled on the live project — this migration
--   doesn't change or verify that setting.
-- ══════════════════════════════════════════════════════════════════════
