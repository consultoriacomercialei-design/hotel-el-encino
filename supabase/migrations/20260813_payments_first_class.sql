-- 20260813_payments_first_class.sql
-- Rediseño post-RSV-160: el pago es entidad de primera clase.
-- Todo evento de pago de MP se registra aquí SIEMPRE, sin importar el estado
-- de la reserva. El estado de la reserva se DERIVA de estos registros
-- (regla única: pago aprobado ⇒ reserva confirmada).

create table if not exists public.payments (
  id              bigint generated always as identity primary key,
  provider        text not null default 'mercadopago',
  payment_id      text not null,
  reservation_id  uuid references public.reservations(id) on delete set null,
  folio           text,
  status          text not null,
  status_detail   text,
  amount_mxn      numeric,
  payer_email     text,
  -- Nombre del TITULAR de la tarjeta (MP reporta al pagador, no al huésped)
  payer_name      text,
  method          text,
  raw             jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (provider, payment_id)
);

comment on table public.payments is
  'Registro canónico de intentos de pago. El dinero siempre tiene casa: se inserta ANTES de decidir nada sobre la reserva.';

create index if not exists payments_reservation_idx on public.payments (reservation_id);
create index if not exists payments_status_idx on public.payments (status);

-- RLS deny-all: solo la service key del servidor lee/escribe.
alter table public.payments enable row level security;
revoke all on public.payments from anon, authenticated;

-- Invariante estructural visible: pagos aprobados cuya reserva NO está
-- confirmada (o sin reserva). Debe estar SIEMPRE vacía; una fila aquí es
-- exactamente el incidente RSV-160.
create or replace view public.payments_unlinked
with (security_invoker = on) as
  select p.id, p.payment_id, p.reservation_id, p.folio, p.amount_mxn,
         p.payer_name, p.created_at
  from public.payments p
  left join public.reservations r on r.id = p.reservation_id
  where p.status = 'approved'
    and (r.id is null or r.status not in ('confirmed', 'checked_in'));

revoke all on public.payments_unlinked from anon, authenticated;

-- Liga directa al checkout de MP para reintentos del huésped
alter table public.reservations add column if not exists init_point text;

-- ── Backfill desde webhook_events (mejor esfuerzo) ─────────────────────────
-- Toma el último estado conocido de cada payment_id con datos del raw_event.
insert into public.payments (provider, payment_id, reservation_id, folio, status, amount_mxn, raw, created_at)
select distinct on (we.payment_id)
  'mercadopago',
  we.payment_id,
  case when we.reservation_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       then we.reservation_id::uuid end,
  nullif(we.folio, ''),
  we.payment_status,
  (we.raw_event->>'transaction_amount')::numeric,
  we.raw_event,
  we.created_at
from public.webhook_events we
where we.source = 'mercadopago'
  and we.payment_id is not null
  and we.payment_status is not null
order by we.payment_id, we.created_at desc
on conflict (provider, payment_id) do nothing;
