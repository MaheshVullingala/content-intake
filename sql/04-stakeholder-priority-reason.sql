-- ══════════════════════════════════════════════════════════════════════
-- Content Intake Portal — Separate stakeholder vs. admin priority reason
-- Run in Supabase SQL Editor AFTER sql/01-schema.sql, 02-rls.sql, 03-functions.sql
--
-- Previously both the stakeholder's justification for choosing High/Urgent
-- priority (NewRequest.js) and the admin's justification for overriding
-- priority (AdminTaskSetup.js) wrote to the same priority_override_reason
-- column, so admin task creation silently clobbered the stakeholder's
-- original reason. This adds a dedicated column for the stakeholder side.
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS stakeholder_priority_reason TEXT;

-- ══════════════════════════════════════════════════════════════════════
-- Verify:
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'requests' AND column_name LIKE '%priority_reason%';
-- ══════════════════════════════════════════════════════════════════════
