'use client';

import { useCallback, useEffect, useState } from 'react';
import { host, hostJson, SANTIAPP_PUBLIC, type IcalFeed } from '../host';
import { C, card, Field, TextInput, Button, Badge, Banner, Spinner } from '../ui';

export default function RoomIcal({ lodgingId, roomId }: { lodgingId: string; roomId: string }) {
  const [feeds, setFeeds] = useState<IcalFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const exportUrl = `${SANTIAPP_PUBLIC}/api/ical/rooms/${roomId}`;

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await host<{ feeds: IcalFeed[] }>(`organizer/lodgings/${lodgingId}/rooms/${roomId}/ical`);
      setFeeds(data.feeds ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los calendarios.');
    } finally {
      setLoading(false);
    }
  }, [lodgingId, roomId]);

  useEffect(() => { void load(); }, [load]);

  async function addFeed() {
    if (!/^(https?|webcal):\/\/.+/i.test(url.trim())) { setError('Pega una URL iCal válida (Airbnb/Booking).'); return; }
    setBusy(true); setError(''); setOk('');
    try {
      await hostJson(`organizer/lodgings/${lodgingId}/rooms/${roomId}/ical`, 'POST', { url: url.trim(), label: label.trim() || undefined });
      setUrl(''); setLabel('');
      setOk('Calendario agregado y sincronizado.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo agregar.');
    } finally {
      setBusy(false);
    }
  }

  async function removeFeed(id: string) {
    try {
      await host(`organizer/lodgings/${lodgingId}/rooms/${roomId}/ical?feed_id=${id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo quitar.');
    }
  }

  async function syncNow() {
    setBusy(true); setError(''); setOk('');
    try {
      const res = await host<{ imported: number }>(`organizer/lodgings/${lodgingId}/rooms/${roomId}/ical/sync`, { method: 'POST' });
      setOk(`Sincronizado. ${res.imported} fecha(s) importada(s).`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo sincronizar.');
    } finally {
      setBusy(false);
    }
  }

  function copyExport() {
    navigator.clipboard?.writeText(exportUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  if (loading) return <Spinner label="Cargando calendarios…" />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {error && <Banner tone="error">{error}</Banner>}
      {ok && <Banner tone="success">{ok}</Banner>}

      {/* Importar */}
      <div style={card}>
        <p style={{ fontFamily: C.serif, fontSize: '1rem', color: C.ink, margin: '0 0 4px' }}>Importar calendarios (Airbnb, Booking…)</p>
        <p style={{ fontFamily: C.sans, fontSize: '0.76rem', color: 'rgba(0,0,0,0.5)', margin: '0 0 1rem', lineHeight: 1.5 }}>
          Pega la URL iCal que exporta la otra plataforma. Bloquearemos automáticamente esas fechas para evitar dobles reservas.
        </p>
        <Field label="URL del calendario (iCal / webcal)">
          <TextInput value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.airbnb.mx/calendar/ical/…" />
        </Field>
        <Field label="Etiqueta" hint="Opcional (ej. Airbnb)">
          <TextInput value={label} onChange={(e) => setLabel(e.target.value)} />
        </Field>
        <Button onClick={addFeed} disabled={busy}>{busy ? 'Procesando…' : 'Agregar calendario'}</Button>
      </div>

      {/* Feeds conectados */}
      {feeds.length > 0 && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <p style={{ fontFamily: C.serif, fontSize: '1rem', color: C.ink, margin: 0 }}>Calendarios conectados</p>
            <Button variant="outline" onClick={syncNow} disabled={busy}>↻ Sincronizar ahora</Button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {feeds.map((f) => (
              <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: C.sans, fontSize: '0.85rem', color: C.ink }}>{f.label || 'Calendario'}</span>
                    {f.last_status && (
                      <Badge
                        color={f.last_status === 'ok' ? '#2a7a4f' : '#b0392a'}
                        bg={f.last_status === 'ok' ? 'rgba(42,122,79,0.1)' : 'rgba(176,57,42,0.1)'}
                      >
                        {f.last_status === 'ok' ? `${f.last_event_count ?? 0} fechas` : 'error'}
                      </Badge>
                    )}
                  </div>
                  <span style={{ fontFamily: C.sans, fontSize: '0.68rem', color: 'rgba(0,0,0,0.4)', wordBreak: 'break-all' }}>{f.url}</span>
                </div>
                <button onClick={() => removeFeed(f.id)} style={{ background: 'none', border: 'none', color: '#b0392a', cursor: 'pointer', fontFamily: C.sans, fontSize: '0.72rem', flexShrink: 0 }}>Quitar</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exportar */}
      <div style={card}>
        <p style={{ fontFamily: C.serif, fontSize: '1rem', color: C.ink, margin: '0 0 4px' }}>Exportar a otras plataformas</p>
        <p style={{ fontFamily: C.sans, fontSize: '0.76rem', color: 'rgba(0,0,0,0.5)', margin: '0 0 0.85rem', lineHeight: 1.5 }}>
          Copia esta URL y pégala en Airbnb/Booking para que también bloqueen las fechas reservadas en Santiapp.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <TextInput readOnly value={exportUrl} onFocus={(e) => e.target.select()} style={{ flex: 1, fontSize: '0.75rem' }} />
          <Button variant="outline" onClick={copyExport}>{copied ? '¡Copiado!' : 'Copiar'}</Button>
        </div>
      </div>
    </div>
  );
}
