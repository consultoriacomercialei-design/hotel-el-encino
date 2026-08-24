/**
 * /admin/solicitudes — solicitudes de servicio desde el Apple TV de cada
 * habitación (Conserje El Encino). Server component + server action para
 * marcar atendida.
 */
import { revalidatePath } from 'next/cache';
import { supabaseGet, supabasePatch } from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';

interface ServiceRequest {
  id: string;
  room_number: string;
  request_type: string;
  note: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

const TYPE_LABEL: Record<string, string> = {
  limpieza: '🧹 Limpieza (para mañana)',
  toallas: '🛁 Toallas extra',
  agua: '💧 Agua embotellada',
  problema: '⚠️ Reporte de problema',
  otro: '🛎️ Otra solicitud',
};

async function markDone(formData: FormData) {
  'use server';
  const id = formData.get('id');
  if (typeof id !== 'string' || !id) return;
  await supabasePatch('service_requests', id, {
    status: 'resolved', resolved_at: new Date().toISOString(),
  });
  revalidatePath('/admin/solicitudes');
}

export default async function SolicitudesPage() {
  const rows = await supabaseGet<ServiceRequest>('service_requests', {
    select: '*', order: 'created_at.desc', limit: '100',
  });
  const pending = (rows ?? []).filter(r => r.status === 'pending' || r.status === 'in_progress');
  const done = (rows ?? []).filter(r => r.status === 'resolved').slice(0, 20);

  const fmt = (iso: string) => new Date(iso).toLocaleString('es-MX', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  const card: React.CSSProperties = {
    background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12,
    padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16,
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Solicitudes de servicio</h1>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>
        Lo que los huéspedes piden desde la TV de su habitación. Cada solicitud también llegó por correo.
      </p>

      <h2 style={{ fontSize: 16, margin: '16px 0 10px' }}>Pendientes ({pending.length})</h2>
      {pending.length === 0 && <p style={{ color: '#999', fontSize: 14 }}>Sin pendientes 🎉</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {pending.map(r => (
          <div key={r.id} style={{ ...card, borderLeft: '4px solid #b7791f' }}>
            <div style={{ fontSize: 24, fontWeight: 700, minWidth: 64, textAlign: 'center' }}>
              #{r.room_number}
            </div>
            <div style={{ flexGrow: 1 }}>
              <div style={{ fontWeight: 600 }}>{TYPE_LABEL[r.request_type] ?? r.request_type}</div>
              {r.note && <div style={{ fontSize: 13, color: '#555' }}>{r.note}</div>}
              <div style={{ fontSize: 12, color: '#999' }}>{fmt(r.created_at)}</div>
            </div>
            <form action={markDone}>
              <input type="hidden" name="id" value={r.id} />
              <button type="submit" style={{
                background: '#2f6b3a', color: '#fff', border: 'none', borderRadius: 8,
                padding: '10px 16px', cursor: 'pointer', fontSize: 14,
              }}>
                ✓ Atendida
              </button>
            </form>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 16, margin: '28px 0 10px', color: '#888' }}>Atendidas recientes</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {done.map(r => (
          <div key={r.id} style={{ ...card, opacity: 0.6, padding: '8px 18px' }}>
            <div style={{ fontWeight: 700, minWidth: 64, textAlign: 'center' }}>#{r.room_number}</div>
            <div style={{ flexGrow: 1, fontSize: 14 }}>{TYPE_LABEL[r.request_type] ?? r.request_type}</div>
            <div style={{ fontSize: 12, color: '#999' }}>{r.resolved_at ? fmt(r.resolved_at) : ''}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
