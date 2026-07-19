-- ══════════════════════════════════════════════════════════════════════
-- Content Intake Portal — Open Graph SEO fields
-- Run in Supabase SQL Editor (safe to re-run — ADD COLUMN IF NOT EXISTS)
--
-- New columns for the SEO Team AI-generation feature (TaskPanel.js).
-- Existing SEO columns (seo_page_location, seo_meta_title,
-- seo_meta_description, seo_meta_keywords) already exist — these two
-- are new.
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS seo_og_title       TEXT,
  ADD COLUMN IF NOT EXISTS seo_og_description TEXT;
