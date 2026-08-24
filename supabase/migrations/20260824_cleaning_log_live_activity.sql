-- b9 El Encino Manager: bitácora de limpieza con checklist + tokens de Live Activity.
-- Aplicada en prod el 24-ago-2026 vía MCP (hotel_b9_cleaning_log_live_activity_tokens).
create table if not exists hotel_cleaning_log (
  id uuid primary key default gen_random_uuid(),
  room text not null,
  items jsonb not null default '[]'::jsonb,
  staff_name text,
  user_id uuid,
  completed_at timestamptz not null default now()
);
create index if not exists hotel_cleaning_log_room_idx on hotel_cleaning_log (room, completed_at desc);
alter table hotel_cleaning_log enable row level security;

create table if not exists hotel_live_activity_tokens (
  token text primary key,
  kind text not null check (kind in ('requests_start','requests_update')),
  user_id uuid,
  updated_at timestamptz not null default now()
);
alter table hotel_live_activity_tokens enable row level security;
-- Deny-all: solo la service key del backend las toca (mismo patrón hotel_devices).
