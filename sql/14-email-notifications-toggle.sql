-- ══════════════════════════════════════════════════════════════════════
-- Content Intake Portal — Email notifications feature flag
-- Run in Supabase SQL Editor (safe to re-run — ADD COLUMN IF NOT EXISTS)
--
-- Defaults OFF. /api/notifications/send-pending (the cron-swept email
-- sender) checks this before sending anything, on top of lib/email.js's
-- own no-op-if-unconfigured guard — so this stays a true no-op switch
-- until BOTH SMTP env vars are set AND this is flipped on in AdminPanel
-- → Settings.
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT false;
