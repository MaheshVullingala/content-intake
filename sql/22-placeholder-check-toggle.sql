-- Lets an admin temporarily turn off just the placeholder/Lorem-Ipsum
-- pre-flight check (src/lib/preflightCheck.js) — e.g. during a QA pass
-- that deliberately submits Fill Test Data content rather than stopping
-- at preview. Defaults to true (normal, strict behavior). The
-- CTA-mismatch check is a separate check and is NOT gated by this flag —
-- it catches real mistakes, not test content, so it always runs.

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS placeholder_check_enabled BOOLEAN DEFAULT true;
