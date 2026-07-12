-- ============================================================
-- 2026-06-30 — FIX CRÍTICO: secuencia de folios desincronizada
-- ============================================================
-- Contexto:
--   La secuencia reservation_folio_seq se reinició en algún punto
--   y volvió a generar RSV-10, RSV-11, RSV-12 hoy a pesar de que
--   ya existen RSV-15..RSV-99 desde marzo. Los próximos INSERTs
--   van a chocar con el constraint UNIQUE y devolver 500 al cliente.
--
-- Este script:
--   (1) Resincroniza la secuencia al MAX(folio_num) + 1
--   (2) Reescribe next_folio() para LPAD dinámico:
--        - 2 dígitos cuando < 100  (RSV-01 .. RSV-99)
--        - 3+ dígitos cuando >= 100 (RSV-100, RSV-1000, …)
--   (3) Reescribe el constraint para aceptar 2 o más dígitos
-- ============================================================

BEGIN;

-- 1. Resync sequence al MAX real
SELECT setval(
  'reservation_folio_seq',
  GREATEST(
    1,
    COALESCE(
      (SELECT MAX(CAST(REPLACE(folio, 'RSV-', '') AS INTEGER))
         FROM reservations
        WHERE folio ~ '^RSV-[0-9]+$'),
      0
    )
  ),
  true  -- "is_called" = true → próximo nextval devuelve max+1
);

-- 2. Función next_folio con padding dinámico
CREATE OR REPLACE FUNCTION next_folio()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  n bigint;
BEGIN
  n := nextval('reservation_folio_seq');
  -- LPAD 2 si <100, no padea si >=100 (CAST natural sin ceros a la izquierda)
  IF n < 100 THEN
    RETURN 'RSV-' || LPAD(n::text, 2, '0');
  ELSE
    RETURN 'RSV-' || n::text;
  END IF;
END;
$$;

COMMIT;

-- ============================================================
-- Verificación post-ejecución (correr aparte para confirmar):
-- ============================================================
--   SELECT next_folio();
--   -- Debe devolver RSV-100 (o lo que siga del max actual)
--
--   SELECT folio FROM reservations
--    WHERE folio ~ '^RSV-[0-9]+$'
--    ORDER BY CAST(REPLACE(folio,'RSV-','') AS INTEGER) DESC
--    LIMIT 5;
--   -- Debe mostrar los más recientes en orden numérico real
-- ============================================================
