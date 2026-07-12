-- ============================================================
-- Conoce Santiago — Business Directory Schema
-- Run in Supabase SQL Editor: https://app.supabase.com
-- ============================================================

-- Business profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS guia_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  phone       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Business listings
CREATE TABLE IF NOT EXISTS guia_listings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID REFERENCES guia_profiles(id) ON DELETE CASCADE NOT NULL,

  -- Content
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  short_desc  TEXT,
  long_desc   TEXT,
  address     TEXT,
  phone       TEXT,
  whatsapp    TEXT,
  instagram   TEXT,
  facebook    TEXT,
  website     TEXT,
  hours       TEXT,
  price_range TEXT,
  lat         FLOAT,
  lng         FLOAT,

  -- Photos (free: max 1, featured/hero: max 3)
  src         TEXT,
  photos      TEXT[],

  -- Plan
  tier        TEXT DEFAULT 'free' CHECK (tier IN ('free', 'featured', 'hero')),

  -- Status
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  -- pending = waiting admin approval, active = live, suspended = hidden

  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER guia_listings_updated_at
  BEFORE UPDATE ON guia_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security
ALTER TABLE guia_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE guia_listings ENABLE ROW LEVEL SECURITY;

-- Profiles: users manage their own
CREATE POLICY "profiles_self" ON guia_profiles
  FOR ALL USING (auth.uid() = id);

-- Listings: users manage their own
CREATE POLICY "listings_own" ON guia_listings
  FOR ALL USING (auth.uid() = owner_id);

-- Listings: public can read active listings
CREATE POLICY "listings_public_read" ON guia_listings
  FOR SELECT USING (status = 'active');
