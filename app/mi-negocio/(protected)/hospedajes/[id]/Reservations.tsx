'use client';

import { useCallback, useEffect, useState } from 'react';
import { host, hostJson, STATUS_LABEL, type RoomSummary, type RoomReservation } from '../host';
import { C, card, Select, Button, Badge, Banner, Spinner } from '../ui';

interface Row extends RoomReservation {
  roomId: string;
  roomName: string;
}

export default function Reservations({ lodgingId, rooms }: { lodgingId: string; rooms: RoomSummary[] }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [movingId, setMovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const perRoom = await Promise.all(
        rooms.map(async (r) => {
          const data = await host<{ reservations: RoomReservation[] }>(
            `organizer/lodgings/${lodgingId}/rooms/${r.id}/blocks`
          );
          return (data.reservations ?? []).map((res) => ({ ...res, roomId: r.id, roomName: r.name }));
        })
      );
      const all = perRoom.flat().sort((a, b) => a.check_in.localeCompare(b.check_in));
      setRows(all);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las reservas.');
    } finally {
      setLoading(false);
    }
  }, [lodgingId, rooms]);

  useEffect(() => { void load(); }, [load]);

  async function move(resId: string, targetRoomId: string) {
    if (!targetRoomId) return;
    setMovingId(resId);
    setError('');
    try {
      await hostJson(`organizer/lodgings/${lodgingId}/reservations/${resId}/move`, 'POST', { room_id: targetRoomId });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo reacomodar la reserva.');
    } finally {
      setMovingId(null);
    }
  }

  if (loading) return <Spinner label="Cargando reservas…" />;

  return (
    <div>
      {error && <Banner tone="error">{error}</Banner>}
      {rows.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', color: 'rgba(0,0,0,0.4)', fontFamily: C.sans, fontSize: '0.85rem', padding: '2.5rem' }}>
          Aún no hay reservas activas en este hospedaje.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {rows.map((r) => (
            <div key={r.id} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 4 }}>
                    <span style={{ fontFamily: C.serif, fontSize: '1rem', color: C.ink }}>{r.guest_name || 'Huésped'}</span>
                    <Badge
                      color={r.status === 'confirmed' ? '#2a7a4f' : '#8a5a1e'}
                      bg={r.status === 'confirmed' ? 'rgba(42,122,79,0.1)' : 'rgba(176,125,62,0.12)'}
                    >
                      {STATUS_LABEL[r.status] ?? r.status}
                    </Badge>
                  </div>
                  <p style={{ fontFamily: C.sans, fontSize: '0.78rem', color: 'rgba(0,0,0,0.55)', margin: 0 }}>
                    {r.check_in} → {r.check_out} · {r.roomName}
                  </p>
                </div>
                {rooms.length > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Select
                      defaultValue=""
                      disabled={movingId === r.id}
                      onChange={(e) => move(r.id, e.target.value)}
                      style={{ fontSize: '0.78rem', padding: '7px 10px', width: 'auto' }}
                    >
                      <option value="" disabled>{movingId === r.id ? 'Moviendo…' : 'Mover a…'}</option>
                      {rooms.filter((rm) => rm.id !== r.roomId).map((rm) => (
                        <option key={rm.id} value={rm.id}>{rm.name}</option>
                      ))}
                    </Select>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: '1rem' }}>
        <Button variant="ghost" onClick={load}>↻ Actualizar</Button>
      </div>
    </div>
  );
}
