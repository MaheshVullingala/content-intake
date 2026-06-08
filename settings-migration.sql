-- ============================================================
-- Settings table for configurable admin options
-- Run this in Supabase SQL editor
-- ============================================================

CREATE TABLE IF NOT EXISTS settings (
  id           TEXT PRIMARY KEY DEFAULT 'global',
  timeout_mins INTEGER NOT NULL DEFAULT 5,
  updated_at   TIMESTAMPTZ DEFAULT now(),
  updated_by   TEXT
);

-- Insert default global settings row
INSERT INTO settings (id, timeout_mins)
VALUES ('global', 5)
ON CONFLICT (id) DO NOTHING;

-- RLS: only admins can update, anyone authenticated can read
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings"
  ON settings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can update settings"
  ON settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert settings"
  ON settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'admin'
    )
  );
