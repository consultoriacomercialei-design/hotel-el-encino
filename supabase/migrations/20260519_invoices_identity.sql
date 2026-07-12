-- Tabla de facturas emitidas vía Facturapi (CFDI 4.0)
CREATE TABLE IF NOT EXISTS invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id  UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  facturapi_id    TEXT NOT NULL UNIQUE,
  folio_fiscal    TEXT,               -- UUID del SAT (folio fiscal)
  status          TEXT NOT NULL DEFAULT 'valid',
  total_mxn       NUMERIC(10,2) NOT NULL,
  customer_rfc    TEXT NOT NULL,
  customer_name   TEXT NOT NULL,
  uso_cfdi        TEXT NOT NULL DEFAULT 'S01',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS invoices_reservation_id_idx ON invoices(reservation_id);
CREATE INDEX IF NOT EXISTS invoices_created_at_idx     ON invoices(created_at DESC);

-- Columnas de identidad del huésped en reservaciones
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS id_type       TEXT,
  ADD COLUMN IF NOT EXISTS id_number     TEXT,
  ADD COLUMN IF NOT EXISTS nationality   TEXT DEFAULT 'Mexicana',
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS id_verified   BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS id_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checkin_at    TIMESTAMPTZ;
