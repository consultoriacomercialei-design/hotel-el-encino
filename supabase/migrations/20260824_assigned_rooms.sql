-- b13: pre-asignación de habitaciones físicas (una o varias) por reserva.
-- `room` (texto) sigue siendo el cuarto "principal" por compatibilidad con
-- rejilla/check-in; assigned_rooms guarda la lista completa.
alter table public.reservations
  add column if not exists assigned_rooms jsonb;
