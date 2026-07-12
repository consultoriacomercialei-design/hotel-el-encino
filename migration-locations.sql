-- ==========================================================
-- Migración: tabla locations — Directorio Turístico Santiago
-- Supabase / PostgreSQL
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ==========================================================

create table if not exists public.locations (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  category      text not null check (category in (
                  'naturaleza', 'cultura', 'gastronomia',
                  'aventura', 'alojamiento', 'servicios'
                )),
  description   text,
  short_desc    text,
  address       text,

  -- Coordenadas geográficas
  lat           double precision not null,
  lng           double precision not null,

  -- Contacto
  phone         text,
  website       text,
  instagram     text,

  -- Imágenes
  photo_url     text,
  gallery_urls  text[] default '{}',

  -- ── Campos AR ──────────────────────────────────────────
  -- ar_marker_url: imagen del marcador físico que MindAR reconoce
  --   (exportado como .mind desde mindAR Image Target Compiler)
  ar_marker_url    text,
  -- ar_content_url: video (.mp4) o modelo 3D (.glb) que se superpone
  ar_content_url   text,
  ar_content_type  text check (ar_content_type in ('video', 'model3d', 'image')),
  ar_enabled       boolean default false,
  -- ────────────────────────────────────────────────────────

  -- Metadatos
  rating        numeric(3, 2) check (rating >= 0 and rating <= 5),
  price_range   text check (price_range in ('$', '$$', '$$$', '$$$$')),
  tags          text[] default '{}',
  is_featured   boolean default false,
  is_active     boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ── Índices ────────────────────────────────────────────────
create index if not exists locations_lat_lng    on public.locations (lat, lng);
create index if not exists locations_category   on public.locations (category);
create index if not exists locations_slug       on public.locations (slug);
create index if not exists locations_featured   on public.locations (is_featured) where is_featured = true;
create index if not exists locations_ar_enabled on public.locations (ar_enabled)  where ar_enabled = true;

-- ── Row Level Security ──────────────────────────────────────
alter table public.locations enable row level security;

-- Lectura pública de locations activas
create policy "locations_public_select"
  on public.locations for select
  using (is_active = true);

-- Solo service_role puede escribir (admin panel)
create policy "locations_service_insert"
  on public.locations for insert
  to service_role with check (true);

create policy "locations_service_update"
  on public.locations for update
  to service_role using (true) with check (true);

create policy "locations_service_delete"
  on public.locations for delete
  to service_role using (true);

-- ── Trigger updated_at ─────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger locations_set_updated_at
  before update on public.locations
  for each row execute procedure public.set_updated_at();

-- ── Datos seed (lugares reales de Santiago N.L.) ───────────
insert into public.locations
  (slug, name, category, short_desc, lat, lng, is_featured, ar_enabled, tags)
values
  ('cola-de-caballo', 'Cascada Cola de Caballo', 'naturaleza',
   'La cascada más icónica de Nuevo León, 25m de caída en plena sierra.',
   25.3683, -100.1414, true, false,
   '{"cascada","senderismo","fotografía"}'),

  ('canon-matacanes', 'Cañón Matacanes', 'aventura',
   'Ruta de cañonismo extremo con rapel, saltos y tubos naturales.',
   25.4012, -100.1623, true, false,
   '{"cañonismo","aventura","rapel"}'),

  ('presa-la-boca', 'Presa La Boca', 'naturaleza',
   'Espejo de agua ideal para kayak, pesca y atardeceres.',
   25.4278, -100.0892, false, false,
   '{"kayak","pesca","atardecer"}'),

  ('parque-la-estanzuela', 'Parque La Estanzuela', 'naturaleza',
   'Área natural protegida con senderos y vistas panorámicas a Monterrey.',
   25.5423, -100.3156, false, false,
   '{"senderismo","naturaleza","familia"}')
on conflict (slug) do nothing;
