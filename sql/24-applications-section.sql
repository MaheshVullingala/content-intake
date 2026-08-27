-- ══════════════════════════════════════════════════════════════════════
-- Content Intake Portal — Applications section (split from Features/Applications)
-- Run in Supabase SQL Editor (safe to re-run — ADD COLUMN IF NOT EXISTS)
--
-- Features/Applications used to be one combined section (fa_* columns,
-- 4 view types: list, horizontal tabs, vertical tabs, table). It's being
-- split into two independent sections so a page can carry both at once:
--   - "Features"     (existing fa_* columns, unchanged) — List + Table only
--   - "Applications" (new app_* columns, this file)     — Horizontal + Vertical Tabs only
--
-- This migration is purely additive. No fa_* column is touched, renamed,
-- or backfilled, and no existing request data is migrated — every row's
-- current Features/Applications content stays exactly where it is, under
-- fa_*, and continues to render as "Features" going forward.
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS app_label       TEXT,
  ADD COLUMN IF NOT EXISTS app_impact      TEXT,
  ADD COLUMN IF NOT EXISTS app_description TEXT,
  ADD COLUMN IF NOT EXISTS app_view_type   TEXT,
  ADD COLUMN IF NOT EXISTS app_items       JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS design_flag_app BOOLEAN DEFAULT false;
