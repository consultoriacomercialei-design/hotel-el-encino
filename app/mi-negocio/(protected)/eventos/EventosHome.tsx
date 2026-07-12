'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { host, pesos, type Me } from '../hospedajes/host';
import { C, card, eyebrow, h1, h2, muted, Button, Badge, Banner, Spinner, BackLink } from '../hospedajes/ui';
import StripeGate from '../hospedajes/StripeGate';
import { type EventsResponse, type OrganizerEvent, EVENT_STATUS_LABEL, fmtDateTime } from './events';

export default function EventosHome() {
  const [me, setMe] = useState<Me | null>(null);
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [totals, setTotals] = useState({ sold: 0, revenue_cents: 0, validated: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const meData = await host<Me>('me');
      setMe(meData);
      if (meData.role === 'organizer') {
        const data = await host<EventsResponse>('organizer/events');
        setEvents(data.events ?? []);
        setTotals(data.totals ?? { sold: 0, revenue_cents: 0, validated: 0 });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const ready = me?.role === 'organizer' && me?.onboarding_complete;

  if (loading) return <Spinner label="Cargando tus eventos…" />;

  return (
    <>
      <BackLink href="/mi-negocio">Panel de negocio</BackLink>
      <div style={{ marginBottom: 'clamp(1.5rem, 3vw, 2.25rem)' }}>
        <p style={eyebrow}>Panel de eventos</p>
        <h1 style={h1}>Mis eventos</h1>
        <p style={muted}>Crea eventos con boletos, define precios y fases, y vende en línea. La gente compra tenga iPhone o no.</p>
      </div>

      {error && <Banner tone="error">{error}</Banner>}

      {ready ? (
        <>
          {/* Totales */}
          {events.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <Stat label="Vendidos" value={String(totals.sold)} />
              <Stat label="Ingresos" value={pesos(totals.revenue_cents)} />
              <Stat label="Validados" value={String(totals.validated)} />
            </div>
          )}
          <div style={{ ...card, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontFamily: C.serif, fontSize: '1rem', color: C.ink, margin: '0 0 3px' }}>Cobros activos ✓</p>
              <p style={{ ...muted, fontSize: '0.78rem' }}>Ya puedes crear eventos y vender boletos.</p>
            </div>
            <Link href="/mi-negocio/eventos/nuevo" style={{ textDecoration: 'none' }}>
              <Button>+ Crear evento</Button>
            </Link>
          </div>
        </>
      ) : (
        <div style={{ marginBottom: '1.5rem' }}>
          <StripeGate me={me} onDone={load} />
        </div>
      )}

      <section>
        <h2 style={{ ...h2, marginBottom: '1.25rem' }}>Tus eventos</h2>
        {events.length === 0 ? (
          <div style={{ ...card, border: '1.5px dashed rgba(0,0,0,0.12)', textAlign: 'center', padding: 'clamp(2.5rem, 5vw, 3.5rem)' }}>
            <p style={{ fontFamily: C.serif, fontSize: '1.1rem', color: 'rgba(0,0,0,0.42)', marginBottom: '0.5rem' }}>Aún no tienes eventos</p>
            <p style={{ ...muted, marginBottom: '1.5rem' }}>
              {ready ? 'Crea tu primer evento con sus tipos de boleto.' : 'Primero activa tus cobros arriba; después podrás crear eventos.'}
            </p>
            {ready && <Link href="/mi-negocio/eventos/nuevo" style={{ textDecoration: 'none' }}><Button>Crear evento</Button></Link>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {events.map((ev) => (
              <Link key={ev.id} href={`/mi-negocio/eventos/${ev.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ ...card, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{ fontFamily: C.serif, fontSize: '1.05rem', color: C.ink }}>{ev.name}</span>
                        <Badge
                          color={ev.status === 'published' ? '#2a7a4f' : ev.status === 'cancelled' ? '#b0392a' : 'rgba(0,0,0,0.5)'}
                          bg={ev.status === 'published' ? 'rgba(42,122,79,0.1)' : ev.status === 'cancelled' ? 'rgba(176,57,42,0.1)' : 'rgba(0,0,0,0.06)'}
                        >
                          {EVENT_STATUS_LABEL[ev.status] ?? ev.status}
                        </Badge>
                      </div>
                      <p style={{ fontFamily: C.sans, fontSize: '0.76rem', color: 'rgba(0,0,0,0.5)', margin: 0 }}>
                        {fmtDateTime(ev.starts_at)} · {ev.venue_name}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontFamily: C.serif, fontSize: '1.1rem', color: C.ink, margin: '0 0 2px' }}>{ev.stats.sold}</p>
                      <p style={{ fontFamily: C.sans, fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.4)', margin: 0 }}>vendidos</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ ...card, textAlign: 'center', padding: '1rem' }}>
      <p style={{ fontFamily: C.serif, fontSize: '1.25rem', color: C.ink, margin: '0 0 2px' }}>{value}</p>
      <p style={{ fontFamily: C.sans, fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.4)', margin: 0 }}>{label}</p>
    </div>
  );
}
