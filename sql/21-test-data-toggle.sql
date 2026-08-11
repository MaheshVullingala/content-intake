-- Lets an admin temporarily keep the "Fill Test Data" button working in
-- production (it's dead-code-eliminated there by default via a NODE_ENV
-- check in NewRequest.js) — e.g. for QA on a live-configured deployment
-- before real launch. Defaults to true so it's already "on" the moment
-- this migration runs, matching the ask that prompted it.
--
-- Note: unlike sql/19's password_login_enabled, this does NOT need a
-- narrow anon-callable RPC — NewRequest.js only reads it after the user
-- is already logged in, so the existing settings_select RLS policy
-- (auth.uid() IS NOT NULL) already covers it.
--
-- Worth remembering this is a belt-and-suspenders convenience toggle,
-- not the actual safety net: the pre-flight check (src/lib/
-- preflightCheck.js) already hard-blocks Submit if placeholder/Lorem
-- Ipsum text is present, regardless of whether this button is visible.

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS test_data_enabled BOOLEAN DEFAULT true;
