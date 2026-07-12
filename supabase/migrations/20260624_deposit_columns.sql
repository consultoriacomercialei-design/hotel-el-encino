-- Migración R1: columnas estructuradas de anticipo en reservations.
-- Hoy el anticipo vive en `notes` como texto libre y se parsea con regex.
-- Eso causa que muchas reservaciones no detecten el anticipo y muestren el
-- total completo como saldo pendiente.
--
-- Esta migración es ADDITIVE (no rompe nada):
--   1. Añade columnas opcionales con default NULL
--   2. Hace backfill desde notes con la misma regex que usa la app
--   3. Crea la vista `reservations_with_balance` que centraliza el cálculo
--
-- Antes de ejecutar:
--   - Snapshot manual de Supabase (Studio → Database → Backups)
--   - Verificar que ningún job activo de cron esté escribiendo a notes con
--     formato "anticipo" durante la migración
--
-- Rollback:
--   ALTER TABLE reservations DROP COLUMN IF EXISTS deposit_at;
--   ALTER TABLE reservations DROP COLUMN IF EXISTS deposit_method;
--   ALTER TABLE reservations DROP COLUMN IF EXISTS deposit_mxn;
--   DROP VIEW IF EXISTS reservations_with_balance;

BEGIN;

-- 1) Columnas nuevas, todas nullable. Cero impacto en escrituras existentes.
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS deposit_mxn    numeric(10,2),
  ADD COLUMN IF NOT EXISTS deposit_method text,
  ADD COLUMN IF NOT EXISTS deposit_at     timestamptz;

-- 2) Backfill: reservaciones existentes que tengan "anticipo $N" en notes.
--    Usa la misma regex que el helper TypeScript (lib/balance.ts).
UPDATE reservations
SET deposit_mxn = CAST(
  REGEXP_REPLACE(
    (REGEXP_MATCHES(notes, '(?:anticipo|dep[oó]sito|adelanto)[:\s]*\$?\s*([\d,]+)', 'i'))[1],
    ',', '', 'g'
  ) AS numeric
)
WHERE deposit_mxn IS NULL
  AND notes IS NOT NULL
  AND notes ~* '(anticipo|dep[oó]sito|adelanto)[:\s]*\$?\s*[\d,]+';

-- 3) Vista única de verdad para el saldo. Patrón aplicado de Lavadoras (cliente_status).
--    Todos los lugares que muestran "saldo pendiente" deben consultarla.
CREATE OR REPLACE VIEW reservations_with_balance AS
SELECT
  r.*,
  COALESCE(r.deposit_mxn, 0)::numeric AS deposit_effective_mxn,
  GREATEST(0, r.total_mxn - COALESCE(r.deposit_mxn, 0))::numeric AS balance_due_mxn,
  CASE
    WHEN r.status = 'confirmed'
     AND r.payment_method <> 'online'
     AND r.check_in >= CURRENT_DATE
    THEN GREATEST(0, r.total_mxn - COALESCE(r.deposit_mxn, 0))::numeric
    ELSE 0::numeric
  END AS pending_at_arrival_mxn
FROM reservations r;

COMMENT ON VIEW reservations_with_balance IS
  'Saldo pendiente calculado a nivel DB. Única fuente de verdad para anticipo y balance.';

COMMIT;
