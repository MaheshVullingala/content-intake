-- ============================================
-- Content Intake Portal — Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Users table (extends Supabase auth)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('stakeholder','editorial_qa','design_qa','web_team','admin')),
  department TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Requests table
CREATE TABLE IF NOT EXISTS public.requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_type TEXT NOT NULL CHECK (page_type IN ('Product','Solutions','Glossary','On-demand Webinar')),
  status TEXT NOT NULL DEFAULT 'editorial_qa' CHECK (status IN ('draft','editorial_qa','design_qa','pending_approval','web_team','published','rejected')),
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Banner fields
  page_title TEXT,
  sub_title TEXT,
  cta1_label TEXT,
  cta1_link TEXT,
  cta2_label TEXT,
  cta2_link TEXT,
  banner_image TEXT,
  -- Metadata
  notes TEXT
);

-- Comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id),
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  text TEXT NOT NULL,
  is_return BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attachments table
CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id),
  user_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Status history / audit log
CREATE TABLE IF NOT EXISTS public.status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id),
  user_name TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Row Level Security ──────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;

-- Allow all reads and writes for anon (MVP - lock down in production with auth)
CREATE POLICY "Allow all" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.comments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.attachments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.status_history FOR ALL USING (true) WITH CHECK (true);

-- ── Seed Users ──────────────────────────────────────
INSERT INTO public.users (email, name, role, department) VALUES
  ('stakeholder@company.com',  'Alex Johnson',  'stakeholder',  'Product Team'),
  ('editorial@company.com',    'Priya Sharma',  'editorial_qa', 'Content Team'),
  ('design@company.com',       'Marcus Lee',    'design_qa',    'Design Team'),
  ('webteam@company.com',      'Jordan Chen',   'web_team',     'Web Team'),
  ('admin@company.com',        'Admin User',    'admin',        'Operations')
ON CONFLICT (email) DO NOTHING;

-- ── Storage bucket for attachments ─────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Allow all storage" ON storage.objects
FOR ALL USING (bucket_id = 'attachments') WITH CHECK (bucket_id = 'attachments');
