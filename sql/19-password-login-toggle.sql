-- Lets an admin turn off email/password login once Okta SSO is live,
-- without needing a code deploy. Both login methods (Okta + password)
-- run side by side rather than one replacing the other — see
-- CONTEXT.md "Okta SSO: dual login" for the decision writeup.

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS password_login_enabled BOOLEAN DEFAULT true;

-- Narrow, safe RLS bypass so the (unauthenticated) Login screen can read
-- just this one flag before a session exists, without granting broad
-- anon SELECT access to the rest of the settings row. Fails open (TRUE)
-- if the settings row is missing, so a fresh deployment never
-- accidentally hides the only working login method.
CREATE OR REPLACE FUNCTION public.get_password_login_enabled()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(
    (SELECT password_login_enabled FROM public.settings WHERE id = 'global'),
    true
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_password_login_enabled() TO anon, authenticated;
