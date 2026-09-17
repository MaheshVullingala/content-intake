-- ══════════════════════════════════════════════════════════════════════
-- Content Intake Portal — Others section (free-form custom section requests)
-- Run in Supabase SQL Editor (safe to re-run — ADD COLUMN IF NOT EXISTS)
--
-- Lets a stakeholder describe a page requirement that doesn't fit any of
-- the existing sections. Unlike other sections there's no shared header
-- label/impact column — each entry in oth_items IS a fully self-contained
-- custom request: { id, label, impact_statement, description, explanation }.
-- description holds sanitized rich-text HTML (see src/lib/richText.js) —
-- paragraphs + bullet/numbered lists from the hand-built RichTextEditor,
-- not a plain string like every other section's text fields.
--
-- No design_flag_oth column — this section carries no image references,
-- matching Resources/Training & Support (also flagless).
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS oth_items JSONB DEFAULT '[]'::jsonb;
