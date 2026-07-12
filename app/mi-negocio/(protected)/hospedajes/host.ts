/**
 * Cliente + tipos para el panel de anfitrión de hospedajes (Mi Negocio web).
 * Todo pasa por el proxy `/api/negocio/santiapp/*`, que reenvía a santiapp con
 * el token del portal. Desenvuelve el envelope { success, data, error }.
 */

export const CURRENCY = 'MXN';

/** Dominio público de Santiapp (para URLs iCal que el anfitrión comparte). */
export const SANTIAPP_PUBLIC = 'https://santiapp-seven.vercel.app';

export async function host<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/negocio/santiapp/${path}`, {
    ...init,
    credentials: 'same-origin',
    cache: 'no-store',
  });
  let body: { success?: boolean; data?: T; error?: { message?: string } } = {};
  try {
    body = await res.json();
  } catch {
    /* respuesta vacía */
  }
  if (!res.ok || body.success === false) {
    throw new Error(body.error?.message || `Error ${res.status}`);
  }
  return body.data as T;
}

/** JSON helper (POST/PATCH con cuerpo). */
export function hostJson<T = unknown>(path: string, method: string, payload: unknown): Promise<T> {
  return host<T>(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// ─── Tipos ──────────────────────────────────────────────────────────

export interface Me {
  id: string;
  email: string | null;
  role: 'user' | 'organizer' | string;
  stripe_account_id: string | null;
  onboarding_complete: boolean;
}

export interface LodgingRef {
  id: string;
  slug: string;
  name: string;
  status: string;
}

export interface LodgingDetail {
  id: string;
  slug: string;
  name: string;
  status: string;
  description: string | null;
  address: string | null;
  amenities: string[] | null;
  photos: string[] | null;
}

export interface RoomSummary {
  id: string;
  name: string;
  description: string | null;
  max_occupancy: number;
  base_occupancy: number;
  extra_guest_price_cents: number;
  base_price_cents: number;
  currency: string;
  status: string;
  photos: string[] | null;
  google_calendar_id: string | null;
  total_units: number;
  pricing_mode: 'per_night' | 'per_person';
  max_capacity: number | null;
}

export interface RoomDetail extends RoomSummary {
  lodging_id: string;
  house_rules: string | null;
}

export interface Rate {
  id?: string;
  name: string;
  price_cents: number;
  starts_on: string | null;
  ends_on: string | null;
  weekdays: number[] | null;
  priority: number;
}

export interface RoomBlock {
  id: string;
  starts_on: string;
  ends_on: string;
  reason: string | null;
  source: string;
}

export interface RoomReservation {
  id: string;
  check_in: string;
  check_out: string;
  guest_name: string | null;
  status: string;
}

export interface IcalFeed {
  id: string;
  url: string;
  label: string | null;
  last_synced_at: string | null;
  last_status: string | null;
  last_event_count: number | null;
  created_at: string;
}

export interface CalendarData {
  from: string;
  to: string;
  total_units: number;
  hotel_reservations: Array<{
    folio: string;
    check_in: string;
    check_out: string;
    rooms: number;
    guest_name: string | null;
    status: string;
  }>;
  santiapp_reservations: Array<{
    id: string;
    check_in: string;
    check_out: string;
    guest_name: string | null;
    status: string;
  }>;
  blocks: Array<{ id: string; starts_on: string; ends_on: string; reason: string | null }>;
}

// ─── Utilidades de dinero / fechas ──────────────────────────────────

export const pesos = (cents: number): string =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(
    (cents ?? 0) / 100
  );

/** "1500" (pesos, texto de input) → 150000 (centavos). */
export const toCents = (pesosStr: string | number): number => {
  const n = typeof pesosStr === 'number' ? pesosStr : parseFloat(String(pesosStr).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};

export const toPesos = (cents: number): string => String(Math.round((cents ?? 0) / 100));

export const todayISO = (): string => new Date().toISOString().slice(0, 10);

export const addDaysISO = (date: string, days: number): string => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export const WEEKDAY_LABELS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export const STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador',
  published: 'Publicado',
  hidden: 'Oculto',
  pending_payment: 'Pago pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
};

/** Sube una foto al bucket de santiapp vía el proxy; devuelve la URL pública. */
export async function uploadPhoto(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('photo', file);
  const data = await host<{ url: string }>('organizer/lodgings/photo', { method: 'POST', body: fd });
  return data.url;
}
