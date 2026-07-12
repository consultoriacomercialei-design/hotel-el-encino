-- RLS Policies for Hotel El Encino
-- Ejecuta esto en: Supabase Dashboard → SQL Editor
--
-- NOTA: El código del servidor usa SERVICE_ROLE_KEY (bypass de RLS — correcto).
-- RLS protege acceso directo con anon key si alguna vez se filtra.

-- ============================================================
-- RESERVATIONS — solo service_role (admin/servidor)
-- ============================================================
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reservations_deny_all" ON reservations;
CREATE POLICY "reservations_deny_all"
  ON reservations
  FOR ALL
  TO anon, authenticated
  USING (false);

-- ============================================================
-- GUIA_LISTINGS — público lee activos; owner escribe los suyos
-- ============================================================
ALTER TABLE guia_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "guia_listings_public_read" ON guia_listings;
CREATE POLICY "guia_listings_public_read"
  ON guia_listings
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

DROP POLICY IF EXISTS "guia_listings_owner_all" ON guia_listings;
CREATE POLICY "guia_listings_owner_all"
  ON guia_listings
  FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- ============================================================
-- GUIA_PROFILES — cada usuario solo ve/edita el suyo
-- ============================================================
ALTER TABLE guia_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "guia_profiles_owner" ON guia_profiles;
CREATE POLICY "guia_profiles_owner"
  ON guia_profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- GUIA_EVENTS — público lee activos; solo service_role escribe
-- (no tiene owner_id — moderado por admin vía API)
-- ============================================================
ALTER TABLE guia_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "guia_events_public_read" ON guia_events;
CREATE POLICY "guia_events_public_read"
  ON guia_events
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

DROP POLICY IF EXISTS "guia_events_deny_write" ON guia_events;
CREATE POLICY "guia_events_deny_write"
  ON guia_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

-- ============================================================
-- PUSH_SUBSCRIPTIONS — solo service_role
-- ============================================================
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_subscriptions_deny_all" ON push_subscriptions;
CREATE POLICY "push_subscriptions_deny_all"
  ON push_subscriptions
  FOR ALL
  TO anon, authenticated
  USING (false);

-- ============================================================
-- PUSH_RATE_LIMIT — solo service_role
-- ============================================================
ALTER TABLE push_rate_limit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_rate_limit_deny_all" ON push_rate_limit;
CREATE POLICY "push_rate_limit_deny_all"
  ON push_rate_limit
  FOR ALL
  TO anon, authenticated
  USING (false);
