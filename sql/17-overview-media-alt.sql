-- ══════════════════════════════════════════════════════════════════════
-- Content Intake Portal — accessibility: alt text for Overview media
-- Run in Supabase SQL Editor (safe to re-run)
--
-- Adds overview_media_alt for the Overview section's image/diagram (not
-- video — video needs captions/transcript, not alt text). Background
-- images (banner, promo) and icon descriptions are presentational and
-- intentionally excluded — they already render with alt="" in
-- PagePreview.js.
--
-- Features/Applications tab images store their alt text as an "image_alt"
-- key inside each tab object in the fa_items JSONB array instead — tabs
-- are a dynamic list, so no fixed column makes sense there. No migration
-- needed for that part; it's just a new key the app starts writing.
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS overview_media_alt TEXT;
COMMENT ON COLUMN public.requests.overview_media_alt IS 'Alt text for overview_media_ref when overview_media_type is image or diagram (not video). Accessibility field.';
