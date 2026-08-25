-- b16: el correo del huésped es OPCIONAL en walk-ins (Reserva Exprés lo
-- declara "opcional" desde b2, pero el NOT NULL lo hacía tronar con 500).
-- Los lectores ya manejan null (app String?, correos se saltan sin email).
alter table public.reservations
  alter column guest_email drop not null;

-- (par) el teléfono también es opcional en walk-ins.
alter table public.reservations
  alter column guest_phone drop not null;
