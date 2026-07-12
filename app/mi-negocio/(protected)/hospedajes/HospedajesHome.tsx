'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { host, pesos, type Me, type LodgingRef, type LodgingDetail, type RoomSummary, STATUS_LABEL } from './host';
import { C, card, eyebrow, h1, h2, muted, Button, Badge, Banner, Spinner, BackLink } from './ui';
import StripeGate from './StripeGate';

interface LodgingCard extends LodgingRef {
  photo: string | null;
  roomCount: number;
  minPriceCents: number | null;
}

export default function HospedajesHome() {
  const [me, setMe] = useState<Me | null>(null);
  const [lodgings, setLodgings] = useState<LodgingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [meData, list] = await Promise.all([
        host<Me>('me'),
        host<{ lodgings: LodgingRef[] }>('organizer/lodgings'),
      ]);
      setMe(meData);
      const refs = list.lodgings ?? [];
      // Enriquece cada hospedaje con foto de portada, # de habitaciones y
      // precio mínimo — para mostrarlo como un anuncio (igual que en iOS).
      const cards = await Promise.all(
        refs.map(async (ref): Promise<LodgingCard> => {
          try {
            const d = await host<{ lodging: LodgingDetail; rooms: RoomSummary[] }>(`organizer/lodgings/${ref.id}`);
            const roomPhoto = d.rooms.find((r) => (r.photos?.length ?? 0) > 0)?.photos?.[0] ?? null;
            const prices = d.rooms.map((r) => r.base_price_cents).filter((p) => p > 0);
            return {
              ...ref,
              photo: d.lodging.photos?.[0] ?? roomPhoto,
              roomCount: d.rooms.length,
              minPriceCents: prices.length ? Math.min(...prices) : null,
            };
          } catch {
            return { ...ref, photo: null, roomCount: 0, minPriceCents: null };
          }
        })
      );
      setLodgings(cards);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const ready = me?.role === 'organizer' && me?.onboarding_complete;

  if (loading) return <Spinner label="Cargando tus hospedajes…" />;

  return (
    <>
      <BackLink href="/mi-negocio">Panel de negocio</BackLink>
      <div style={{ marginBottom: 'clamp(1.5rem, 3vw, 2.25rem)' }}>
        <p style={eyebrow}>Panel de hospedaje</p>
        <h1 style={h1}>Mis hospedajes</h1>
        <p style={muted}>Publica tu propiedad, define precios y disponibilidad, y recibe reservas por Santiapp.</p>
      </div>

      {error && <Banner tone="error">{error}</Banner>}

      {/* ── Estado de cobros / gate Stripe ─────────────────── */}
      {ready ? (
        <div style={{ ...card, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontFamily: C.serif, fontSize: '1rem', color: C.ink, margin: '0 0 3px' }}>Cobros activos ✓</p>
            <p style={{ ...muted, fontSize: '0.78rem' }}>Ya puedes publicar hospedajes y recibir pagos.</p>
          </div>
          <Link href="/mi-negocio/hospedajes/nuevo" style={{ textDecoration: 'none' }}>
            <Button>+ Publicar hospedaje</Button>
          </Link>
        </div>
      ) : (
        <div style={{ marginBottom: '1.5rem' }}>
          <StripeGate me={me} onDone={load} />
        </div>
      )}

      {/* ── Lista de hospedajes ────────────────────────────── */}
      <section>
        <h2 style={{ ...h2, marginBottom: '1.25rem' }}>Tus propiedades</h2>

        {lodgings.length === 0 ? (
          <div style={{ ...card, border: '1.5px dashed rgba(0,0,0,0.12)', textAlign: 'center', padding: 'clamp(2.5rem, 5vw, 3.5rem)' }}>
            <p style={{ fontFamily: C.serif, fontSize: '1.1rem', color: 'rgba(0,0,0,0.42)', marginBottom: '0.5rem' }}>
              Aún no publicas ningún hospedaje
            </p>
            <p style={{ ...muted, marginBottom: '1.5rem' }}>
              {ready
                ? 'Crea tu primer anuncio con sus habitaciones, precios e inventario.'
                : 'Primero activa tus cobros arriba; después podrás publicar.'}
            </p>
            {ready && (
              <Link href="/mi-negocio/hospedajes/nuevo" style={{ textDecoration: 'none' }}>
                <Button>Publicar mi hospedaje</Button>
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {lodgings.map((l) => (
              <Link key={l.id} href={`/mi-negocio/hospedajes/${l.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ ...card, display: 'grid', gridTemplateColumns: '84px 1fr auto', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
                  {/* Thumbnail */}
                  <div style={{ width: 84, height: 68, borderRadius: 10, overflow: 'hidden', background: C.forest, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {l.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 22 }}>🏡</span>
                    )}
                  </div>
                  {/* Info */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: 3 }}>
                      <span style={{ fontFamily: C.serif, fontSize: '1.05rem', color: C.ink }}>{l.name}</span>
                      <Badge
                        color={l.status === 'published' ? '#2a7a4f' : 'rgba(0,0,0,0.5)'}
                        bg={l.status === 'published' ? 'rgba(42,122,79,0.1)' : 'rgba(0,0,0,0.06)'}
                      >
                        {STATUS_LABEL[l.status] ?? l.status}
                      </Badge>
                    </div>
                    <p style={{ fontFamily: C.sans, fontSize: '0.76rem', color: 'rgba(0,0,0,0.5)', margin: 0 }}>
                      {l.roomCount > 0 ? `${l.roomCount} habitación${l.roomCount > 1 ? 'es' : ''}` : 'Sin habitaciones'}
                      {l.minPriceCents != null ? ` · desde ${pesos(l.minPriceCents)}` : ''}
                    </p>
                  </div>
                  <span style={{ fontFamily: C.sans, fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.4)' }}>
                    Gestionar ›
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
