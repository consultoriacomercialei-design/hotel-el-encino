-- ============================================================
-- Hotel El Encino — PMS Migration
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. New columns on reservations
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS payment_method  text    DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_id      text,
  ADD COLUMN IF NOT EXISTS preference_id   text,
  ADD COLUMN IF NOT EXISTS paid_at         timestamptz,
  ADD COLUMN IF NOT EXISTS folio           text UNIQUE;

-- 2. Replace status constraint to include new statuses
ALTER TABLE reservations
  DROP CONSTRAINT IF EXISTS reservations_status_check;
ALTER TABLE reservations
  ADD CONSTRAINT reservations_status_check
  CHECK (status IN ('pending','confirmed','waitlist','cancelled','no_show','pending_payment'));

-- 3. Atomic folio sequence (eliminates race condition)
CREATE SEQUENCE IF NOT EXISTS reservation_folio_seq START 1;

-- Backfill existing reservations that have no folio
UPDATE reservations
  SET folio = 'RSV-' || LPAD(nextval('reservation_folio_seq')::text, 2, '0')
  WHERE folio IS NULL;

-- 4. RPC function so the API can get the next folio atomically
CREATE OR REPLACE FUNCTION next_folio()
RETURNS text LANGUAGE sql SECURITY DEFINER AS $$
  SELECT 'RSV-' || LPAD(nextval('reservation_folio_seq')::text, 2, '0')
$$;

-- 5. Indexes for admin queries
CREATE INDEX IF NOT EXISTS idx_reservations_status   ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_check_in ON reservations(check_in);
CREATE INDEX IF NOT EXISTS idx_reservations_folio    ON reservations(folio);

-- Done. Verify with:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'reservations';

-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: remind-pending cron support (2026-04-20)
-- ─────────────────────────────────────────────────────────────────────────────

-- Tracks when the 90-min reminder was sent, prevents duplicate sends
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_reservations_reminder ON reservations(reminder_sent_at)
  WHERE status = 'pending';

-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: WhatsApp AI agent session storage (2026-04-20)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS wa_sessions (
  phone      text PRIMARY KEY,
  messages   jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-cleanup sessions older than 48h (optional, run manually or as cron)
-- DELETE FROM wa_sessions WHERE updated_at < now() - interval '48 hours';
