-- ============================================================
-- Conoce Santiago — Events Schema
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS guia_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'comunidad'
                  CHECK (category IN ('religioso','gastronomico','cultural','aventura','festival','comunidad')),
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  time_start    TEXT,
  location      TEXT NOT NULL,
  short_desc    TEXT NOT NULL,
  price         TEXT DEFAULT 'Entrada libre',
  photo_url     TEXT,
  organizer_name  TEXT,
  organizer_phone TEXT,
  status        TEXT DEFAULT 'active'
                  CHECK (status IN ('active', 'hidden')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Public reads active events only
ALTER TABLE guia_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_public_read" ON guia_events
  FOR SELECT USING (status = 'active');

-- Index for upcoming events query
CREATE INDEX IF NOT EXISTS guia_events_start_date ON guia_events (start_date);
