/**
 * hotelelencino.com/directorio/hospedajes — Hospedajes curados del directorio.
 * Server Component: trae el catálogo de santiapp (mismo backend que la app iOS).
 */
import HospedajesClient, { type Lodging } from './HospedajesClient';

const BASE = (process.env.SANTIAPP_API_URL || 'https://santiapp-seven.vercel.app').replace(/\/$/, '');

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Hospedajes · Directorio Santiago' };

export default async function HospedajesPage() {
  let lodgings: Lodging[] = [];
  try {
    const res = await fetch(`${BASE}/api/lodgings`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      lodgings = json?.data?.lodgings ?? [];
    }
  } catch {
    // catálogo vacío si el backend no responde
  }
  return <HospedajesClient lodgings={lodgings} />;
}
