'use client';

import { useCallback, useEffect, useState } from 'react';
import { host, type RoomDetail, type Rate } from '../host';
import { C, Banner, Spinner } from '../ui';
import EditRoom from './EditRoom';
import RoomAvailability from './RoomAvailability';
import RoomIcal from './RoomIcal';

type Section = 'editar' | 'disponibilidad' | 'ical';
const SECTIONS: Array<{ id: Section; label: string }> = [
  { id: 'editar', label: 'Editar' },
  { id: 'disponibilidad', label: 'Disponibilidad' },
  { id: 'ical', label: 'Sincronizar (iCal)' },
];

/**
 * Contenido de una habitación DESPLEGADO dentro de la lista (acordeón). No tiene
 * "volver" ni barra de pestañas propia: la sección se elige con un control
 * compacto de pastillas, claramente distinto de las pestañas del hospedaje.
 */
export default function RoomManager({
  lodgingId, roomId, onChanged,
}: {
  lodgingId: string;
  roomId: string;
  onChanged?: () => void;
}) {
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [rates, setRates] = useState<Rate[]>([]);
  const [section, setSection] = useState<Section>('editar');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await host<{ room: RoomDetail; rates: Rate[] }>(`organizer/lodgings/${lodgingId}/rooms/${roomId}`);
      setRoom(data.room);
      setRates(data.rates ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la habitación.');
    } finally {
      setLoading(false);
    }
  }, [lodgingId, roomId]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <Spinner label="Cargando…" />;
  if (error || !room) return <Banner tone="error">{error || 'Habitación no encontrada.'}</Banner>;

  return (
    <div>
      {/* Control de secciones (pastillas) */}
      <div style={{ display: 'inline-flex', gap: 4, background: 'rgba(0,0,0,0.05)', borderRadius: 999, padding: 4, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            style={{
              fontFamily: C.sans, fontSize: '0.76rem', padding: '7px 14px', borderRadius: 999, cursor: 'pointer', border: 'none',
              background: section === s.id ? '#fff' : 'transparent',
              color: section === s.id ? (C.forest as string) : 'rgba(0,0,0,0.5)',
              fontWeight: section === s.id ? 600 : 400,
              boxShadow: section === s.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === 'editar' && (
        <EditRoom lodgingId={lodgingId} room={room} rates={rates} onSaved={(r, rt) => { setRoom(r); setRates(rt); onChanged?.(); }} />
      )}
      {section === 'disponibilidad' && <RoomAvailability lodgingId={lodgingId} roomId={roomId} />}
      {section === 'ical' && <RoomIcal lodgingId={lodgingId} roomId={roomId} />}
    </div>
  );
}
