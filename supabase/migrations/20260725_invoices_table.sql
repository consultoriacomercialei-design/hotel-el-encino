-- Facturas CFDI 4.0 emitidas vía Facturapi.
--
-- NOTA: la migración 20260519_invoices_identity.sql se aplicó a medias en producción:
-- las columnas de identidad sí entraron a `reservations`, pero la tabla `invoices` NUNCA se creó.
-- Sin ella, `createInvoiceAction` timbraba ante el SAT y luego reventaba al guardar → CFDI real,
-- huérfano del sistema. Esta migración la crea con el esquema completo.

CREATE TABLE IF NOT EXISTS invoices (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ON DELETE SET NULL, nunca CASCADE: un CFDI timbrado es un documento fiscal que
  -- debe sobrevivir al borrado de la reservación. Nullable también permite facturar
  -- conceptos que no vienen de una reservación.
  reservation_id     UUID REFERENCES reservations(id) ON DELETE SET NULL,

  -- Guardia anti doble timbrado. La fila se inserta ANTES de llamar al PAC, así que
  -- un segundo clic choca contra este UNIQUE en vez de gastar otro timbre.
  idempotency_key    TEXT NOT NULL UNIQUE,

  -- pending = fila creada, aún no timbrada | valid = timbrada | canceled | failed
  status             TEXT NOT NULL DEFAULT 'pending',

  facturapi_id       TEXT UNIQUE,
  folio_fiscal       TEXT,              -- UUID del SAT
  series             TEXT,
  folio_number       INTEGER,

  -- Receptor
  customer_rfc         TEXT NOT NULL,
  customer_name        TEXT NOT NULL,
  customer_tax_system  TEXT,
  customer_zip         TEXT,
  customer_email       TEXT,
  uso_cfdi             TEXT NOT NULL DEFAULT 'G03',
  payment_form         TEXT,            -- clave SAT c_FormaPago (01, 03, 04, 28…)
  payment_method_sat   TEXT DEFAULT 'PUE',

  -- Tramo facturado (permite partir una estancia larga en parcialidades)
  period_start       DATE,
  period_end         DATE,
  nights             INTEGER,
  base_rate_mxn      NUMERIC(12,2),     -- tarifa por noche, sin impuestos

  -- Desglose fiscal. total = subtotal + iva + ish - ret_isr
  subtotal_mxn       NUMERIC(12,2) NOT NULL DEFAULT 0,
  iva_mxn            NUMERIC(12,2) NOT NULL DEFAULT 0,
  ish_mxn            NUMERIC(12,2) NOT NULL DEFAULT 0,
  ret_isr_mxn        NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_mxn          NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- true = timbrada contra el sandbox (llave sk_test_). Sin validez fiscal y sin
  -- contar para el avance de facturación de la reservación.
  test_mode          BOOLEAN NOT NULL DEFAULT false,

  error_message      TEXT,
  cancelled_at       TIMESTAMPTZ,
  cancellation_motive TEXT,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS invoices_reservation_id_idx ON invoices(reservation_id);
CREATE INDEX IF NOT EXISTS invoices_created_at_idx     ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS invoices_status_idx         ON invoices(status);

-- Deny-all: RLS activa y CERO políticas. `anon` y `authenticated` no ven nada;
-- `service_role` la salta por diseño y es el único que la toca (server actions del admin).
-- Contiene RFC y razón social de terceros — datos fiscales de clientes.
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON invoices FROM anon, authenticated;

COMMENT ON TABLE invoices IS
  'CFDI 4.0 emitidos vía Facturapi. Deny-all por RLS: solo service_role. '
  'Se inserta con status=pending ANTES de timbrar; idempotency_key evita doble timbrado.';
