-- 002_items_active_and_branding.sql
-- Adds item visibility control and prepares company branding tables (minimal for MVP)

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Optional: store a reason (admin notes)
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS inactive_reason TEXT;

-- Company / Branding (scaffold for later multi-tenant)
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  legal_name TEXT,
  email TEXT,
  phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  region TEXT,
  country TEXT,
  postal_code TEXT,
  timezone TEXT,
  currency TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS company_branding (
  company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  logo_url TEXT,
  primary_color TEXT,
  accent_color TEXT,
  header_text TEXT,
  footer_text TEXT,
  watermark_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  watermark_opacity INTEGER NOT NULL DEFAULT 12 CHECK (watermark_opacity BETWEEN 0 AND 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
