-- audit_log: structured event log for key API actions
-- Replaces ephemeral Vercel function logs for debugging and observability.
-- Fire-and-forget from server — never blocks the main request path.
--
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/kzlbxuzezfhjfzzjhwup/sql

CREATE TABLE IF NOT EXISTS audit_log (
  id            BIGSERIAL PRIMARY KEY,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- What happened
  event         TEXT NOT NULL,           -- e.g. 'reservation.created', 'payment.initiated', 'webhook.confirmed'
  status        TEXT,                    -- 'ok' | 'error' | 'duplicate' | 'blocked'

  -- Context
  reservation_id UUID,
  folio         TEXT,
  guest_email   TEXT,

  -- Request metadata
  ip            TEXT,
  user_agent    TEXT,

  -- Payload (safe subset — no card numbers, no secrets)
  details       JSONB
);

-- Index for common queries: by reservation, by date, by event type
CREATE INDEX IF NOT EXISTS audit_log_reservation_id_idx ON audit_log (reservation_id);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx     ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_event_idx          ON audit_log (event);
CREATE INDEX IF NOT EXISTS audit_log_guest_email_idx    ON audit_log (guest_email);

-- Auto-delete entries older than 90 days (keep table lean)
-- Optional: enable pg_cron extension in Supabase Dashboard first
-- SELECT cron.schedule('purge-audit-log', '0 3 * * *',
--   $$DELETE FROM audit_log WHERE created_at < NOW() - INTERVAL '90 days'$$);
