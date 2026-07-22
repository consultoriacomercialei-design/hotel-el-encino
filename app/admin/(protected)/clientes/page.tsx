import { supabaseGet } from '@/app/lib/supabase';
import ClientesClient, { type Contact } from './ClientesClient';

export const metadata = { title: 'Clientes' };
export const dynamic = 'force-dynamic';

interface ResRow {
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  check_in: string | null;
  created_at: string | null;
}
interface CkRow {
  full_name: string;
  email: string | null;
  phone: string | null;
  checked_in_at: string | null;
}

const normEmail = (e?: string | null) => (e || '').trim().toLowerCase();
const normPhone = (p?: string | null) => (p || '').replace(/\D/g, '');

/**
 * Base de clientes consolidada: fusiona contactos de TODAS las fuentes
 * (reservas web + check-ins) y deduplica por correo/teléfono. Correo y teléfono
 * de todos, en un solo lugar, exportable a CSV.
 */
export default async function ClientesPage() {
  const [reservas, checkins] = await Promise.all([
    supabaseGet<ResRow>('reservations', {
      select: 'guest_name,guest_email,guest_phone,check_in,created_at',
      order: 'created_at.desc',
      limit: '5000',
    }),
    supabaseGet<CkRow>('guest_checkins', {
      select: 'full_name,email,phone,checked_in_at',
      order: 'checked_in_at.desc',
      limit: '5000',
    }),
  ]);

  const map = new Map<string, Contact>();
  function add(name: string, email: string | null, phone: string | null, source: string, date: string | null) {
    const e = normEmail(email);
    const ph = normPhone(phone);
    const key = e || ph || (name || '').trim().toLowerCase();
    if (!key) return;
    const existing = map.get(key);
    if (existing) {
      if (!existing.email && email) existing.email = email.trim();
      if (!existing.phone && phone) existing.phone = phone.trim();
      if (!existing.name && name) existing.name = name.trim();
      if (!existing.sources.includes(source)) existing.sources.push(source);
      if (date && date > existing.last) existing.last = date;
    } else {
      map.set(key, {
        name: (name || '').trim(),
        email: email ? email.trim() : '',
        phone: phone ? phone.trim() : '',
        sources: [source],
        last: date || '',
      });
    }
  }

  for (const r of reservas) add(r.guest_name, r.guest_email, r.guest_phone, 'Reserva', r.created_at || r.check_in);
  for (const c of checkins) add(c.full_name, c.email, c.phone, 'Check-in', c.checked_in_at);

  const contacts = Array.from(map.values()).sort((a, b) => (b.last || '').localeCompare(a.last || ''));

  return <ClientesClient contacts={contacts} />;
}
