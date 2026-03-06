-- 001_init.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN','BARBACK')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT,
  barcode TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bar_id UUID NOT NULL REFERENCES bars(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bar_id, name)
);

CREATE TABLE IF NOT EXISTS nights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date_key TEXT NOT NULL UNIQUE, -- e.g. 2026-03-05
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  night_id UUID NOT NULL REFERENCES nights(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('REQUEST','DELIVERED','RETURNED')),
  status TEXT NOT NULL CHECK (status IN ('PENDING','APPROVED','REJECTED')) DEFAULT 'PENDING',
  created_by UUID NOT NULL REFERENCES users(id),
  bar_id UUID REFERENCES bars(id),
  station_id UUID REFERENCES stations(id),
  item_id UUID REFERENCES items(id),
  barcode TEXT,
  qty INTEGER NOT NULL DEFAULT 1 CHECK (qty > 0),
  note TEXT,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_night ON events(night_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
