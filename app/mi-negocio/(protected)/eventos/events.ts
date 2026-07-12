/**
 * Tipos + helpers del panel de EVENTOS del anfitrión (Mi Negocio web).
 * Reusa el cliente genérico `host`/`hostJson` de hospedajes (mismo proxy).
 */
import { host } from '../hospedajes/host';

export interface EventTicketType {
  id: string;
  name: string;
  price_cents: number;
  quantity_total: number;
  quantity_sold: number;
}

export interface EventStats {
  sold: number;
  revenue_cents: number;
  validated: number;
}

export interface OrganizerEvent {
  id: string;
  slug: string;
  name: string;
  venue_name: string;
  starts_at: string;
  ends_at: string;
  status: string;
  ticket_types: EventTicketType[];
  stats: EventStats;
}

export interface EventsResponse {
  events: OrganizerEvent[];
  totals: EventStats;
}

export interface EventDetail {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  cover_image_url: string | null;
  venue_name: string;
  venue_address: string | null;
  starts_at: string;
  ends_at: string;
  fee_mode: string;
  status: string;
  ticket_types?: EventTicketType[];
}

/** Fases de precio de un tipo de boleto (opcional). */
export interface PhaseInput {
  name: string;
  price_cents: number;
  trigger_type: 'date' | 'stock';
  ends_at?: string; // ISO datetime — requerido si trigger 'date'
  sold_threshold?: number; // requerido si trigger 'stock'
}

export interface TicketTypeInput {
  name: string;
  price_cents: number;
  quantity_total: number;
  sale_ends_at?: string;
  show_remaining?: boolean;
  remaining_note?: string;
  phases?: PhaseInput[];
}

/** Categorías de evento (espejo del selector iOS). */
export const EVENT_CATEGORIES: Array<[string, string]> = [
  ['musica', 'Música / Concierto'],
  ['cultural', 'Cultural'],
  ['gastronomia', 'Gastronomía'],
  ['deportivo', 'Deportivo'],
  ['familiar', 'Familiar'],
  ['festival', 'Festival'],
  ['taller', 'Taller / Curso'],
  ['beneficencia', 'Beneficencia'],
  ['otro', 'Otro'],
];

export const EVENT_STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador',
  published: 'Publicado',
  cancelled: 'Cancelado',
  ended: 'Finalizado',
};

/** Sube la portada del evento (bucket event-covers) vía el proxy. */
export async function uploadEventCover(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('cover', file);
  const data = await host<{ url: string }>('organizer/events/cover', { method: 'POST', body: fd });
  return data.url;
}

/** Convierte 'YYYY-MM-DDTHH:mm' (input local) → ISO con zona. */
export function localToISO(local: string): string {
  if (!local) return '';
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

/** ISO → valor para <input type="datetime-local"> (hora local). */
export function isoToLocal(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
