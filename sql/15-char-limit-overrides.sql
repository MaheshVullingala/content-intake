-- ══════════════════════════════════════════════════════════════════════
-- Content Intake Portal — Char Limits admin feature, full fix
-- Run in Supabase SQL Editor (safe to re-run)
--
-- Was silently broken end-to-end: AdminPanel.js's CharLimitsPanel read/
-- wrote settings.key / settings.value, but those columns never existed
-- on the settings table (a singleton id='global' row, not a key-value
-- store) — every save failed, every load silently rendered as "no
-- overrides" since the fetch never checked its error. On top of that,
-- even a working save would have done nothing: every consumer
-- (NewRequest.js, EditSectionModal.js, ProposeChangeWizard.js) read
-- character limits straight from the hardcoded CHAR_LIMITS/ITEM_LIMITS
-- objects in constants.js/EditSectionModal.js, never from the database.
--
-- This creates a real key-value table for the overrides (a proper fit
-- for this shape of data, unlike the singleton settings row) — see
-- src/lib/charLimits.js's useCharLimits() hook, now used by all three
-- consumers above to merge DB overrides over the static defaults.
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.char_limit_overrides (
  key         TEXT PRIMARY KEY,
  value       INTEGER NOT NULL CHECK (value > 0),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  updated_by  TEXT
);

ALTER TABLE public.char_limit_overrides ENABLE ROW LEVEL SECURITY;

-- Every role that fills out or edits content needs to read these to
-- actually apply the limits — same breadth as requests_select.
DROP POLICY IF EXISTS char_limit_overrides_select ON public.char_limit_overrides;
CREATE POLICY char_limit_overrides_select ON public.char_limit_overrides
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admins configure these, matching AdminPanel.js's own access gate.
DROP POLICY IF EXISTS char_limit_overrides_write ON public.char_limit_overrides;
CREATE POLICY char_limit_overrides_write ON public.char_limit_overrides
  FOR ALL USING (get_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (get_user_role() IN ('admin', 'super_admin'));

-- ══════════════════════════════════════════════════════════════════════
-- Verify:
-- SELECT * FROM public.char_limit_overrides;
-- ══════════════════════════════════════════════════════════════════════
