-- ══════════════════════════════════════════════════════════════════════
-- Content Intake Portal — promo_bg_image_ref column
-- Run in Supabase SQL Editor (safe to re-run — ADD COLUMN IF NOT EXISTS)
--
-- NewRequest.js buildPayload() was fixed to write promo_bg_image_ref
-- (matching what PromoSection.js's form actually sets) instead of the
-- old promo_bg_image/promo_bg_note pair — but this column was never
-- actually created in the live DB, so every save with Promo not marked
-- N/A failed with "column does not exist". Confirmed present as of
-- 2026-07-18 (either applied manually or a stale PostgREST schema-cache
-- read earlier was the false negative) — this file just documents it.
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS promo_bg_image_ref JSONB;
