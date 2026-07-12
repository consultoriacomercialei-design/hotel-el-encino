import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getGuiaUser, SESSION_COOKIE } from '@/app/lib/guia-auth';
import PushSubscribeButton from '@/app/components/PushSubscribeButton';

const SUPABASE_URL  = process.env.SUPABASE_URL!;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface GuiaListing {
  id: string; slug: string; name: string; category: string;
  short_desc: string; long_desc: string | null; status: string; tier: string;
  src: string | null; phone: string | null; whatsapp: string | null;
  address: string | null; hours: string | null;
  instagram: string | null; facebook: string | null; website: string | null;
  lat: number | null; lng: number | null;
  created_at: string;
}

async function getMyListings(userId: string): Promise<GuiaListing[]> {
  if (!SUPABASE_URL) return [];
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/guia_listings?owner_id=eq.${userId}&order=created_at.desc`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }, cache: 'no-store' }
  );
  return res.ok ? res.json() : [];
}


function hasRealCoords(l: GuiaListing): boolean {
  return !!(l.lat && l.lng);
}

/** Profile completeness score 0–100 */
function calcCompletion(l: GuiaListing): { score: number; missing: string[] } {
  const checks: Array<{ label: string; ok: boolean; pts: number }> = [
    { label: 'Foto de portada',         ok: !!l.src,                     pts: 20 },
    { label: 'WhatsApp',                ok: !!l.whatsapp,                pts: 20 },
    { label: 'Ubicación en el mapa',    ok: hasRealCoords(l),            pts: 20 },
    { label: 'Descripción completa',    ok: !!((l.long_desc?.length ?? 0) > 20), pts: 15 },
    { label: 'Horarios',               ok: !!l.hours,                   pts: 10 },
    { label: 'Dirección',              ok: !!l.address,                 pts: 10 },
    { label: 'Red social',             ok: !!(l.instagram || l.facebook || l.website), pts: 5 },
  ];
  const score = checks.filter(c => c.ok).reduce((s, c) => s + c.pts, 0);
  const missing = checks.filter(c => !c.ok).map(c => c.label);
  return { score, missing };
}

const TIER_LABEL: Record<string, string> = { free: 'Gratuito', featured: 'Destacado', hero: 'Hero' };
const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:   { label: 'En revisión', color: '#b07d3e' },
  active:    { label: 'Activo',      color: '#2a7a4f' },
  suspended: { label: 'Suspendido',  color: '#b0392a' },
};

export default async function NegocioDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const user = token ? await getGuiaUser(token) : null;
  if (!user) redirect('/mi-negocio/login');

  const listings = await getMyListings(user.id);
  const primaryListing = listings[0] ?? null;

  const maxTier = listings.reduce((t, l) => {
    const rank = { free: 0, featured: 1, hero: 2 };
    return (rank[l.tier as keyof typeof rank] ?? 0) > (rank[t as keyof typeof rank] ?? 0) ? l.tier : t;
  }, 'free' as string);

  const completion = primaryListing ? calcCompletion(primaryListing) : null;
  const showMapBanner = primaryListing && !hasRealCoords(primaryListing);
  const waUpgradeLink = `https://wa.me/528123816588?text=${encodeURIComponent('Hola, quiero contratar el plan Destacado para mi anuncio en el directorio de Santiago')}`;

  return (
    <>
      {/* Welcome */}
      <div style={{ marginBottom: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
        <p style={eyebrow}>Panel de negocio</p>
        <h1 style={h1}>Hola, {user.email.split('@')[0]}</h1>
        <p style={muted}>{user.email}</p>
      </div>

      {/* ── Photo Banner ───────────────────────────────────── */}
      {primaryListing && !primaryListing.src && (
        <Link href={`/mi-negocio/listing/${primaryListing.id}`} style={{ textDecoration: 'none', display: 'block', marginBottom: '0.75rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #856d47 0%, #b09060 100%)',
            borderRadius: '16px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            cursor: 'pointer',
          }}>
            <div style={{ fontSize: '26px', flexShrink: 0 }}>📸</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 2px', fontFamily: 'var(--serif)', fontSize: '0.95rem', color: '#faf8f4', fontWeight: 400 }}>
                Agrega una foto y llega a más personas
              </p>
              <p style={{ margin: 0, fontFamily: 'var(--sans)', fontSize: '0.73rem', color: 'rgba(250,248,244,0.72)', lineHeight: 1.4 }}>
                Los anuncios con foto reciben 3× más clics — sube la tuya en 1 minuto
              </p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(250,248,244,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </div>
        </Link>
      )}

      {/* ── Map Banner ─────────────────────────────────────── */}
      {showMapBanner && (
        <Link href={`/mi-negocio/listing/${primaryListing.id}?openMap=true`} style={{ textDecoration: 'none', display: 'block', marginBottom: '1.5rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #0d221e 0%, #1a3d35 100%)',
            borderRadius: '16px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            cursor: 'pointer',
          }}>
            <div style={{ fontSize: '28px', flexShrink: 0 }}>📍</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 2px', fontFamily: 'var(--serif)', fontSize: '1rem', color: '#faf8f4', fontWeight: 400 }}>
                Tu negocio no está en el mapa
              </p>
              <p style={{ margin: 0, fontFamily: 'var(--sans)', fontSize: '0.75rem', color: 'rgba(250,248,244,0.6)', lineHeight: 1.4 }}>
                Toca aquí para fijar tu pin — tarda 30 segundos
              </p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(250,248,244,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </div>
        </Link>
      )}

      {/* ── Completion Meter ───────────────────────────────── */}
      {completion && (
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '16px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
            <p style={{ fontFamily: 'var(--serif)', fontSize: '1rem', color: 'var(--ink)', margin: 0 }}>
              Perfil al {completion.score}%
            </p>
            <span style={{ fontFamily: 'var(--sans)', fontSize: '0.68rem', color: completion.score === 100 ? '#2a7a4f' : 'rgba(0,0,0,0.35)', letterSpacing: '0.06em' }}>
              {completion.score === 100 ? '¡Completo!' : `${completion.missing.length} campos pendientes`}
            </span>
          </div>

          {/* Progress bar */}
          <div style={{ height: '6px', background: 'rgba(0,0,0,0.07)', borderRadius: '999px', overflow: 'hidden', marginBottom: '14px' }}>
            <div style={{
              height: '100%',
              width: `${completion.score}%`,
              background: completion.score === 100 ? '#2a7a4f' : completion.score >= 60 ? '#856d47' : '#0d221e',
              borderRadius: '999px',
              transition: 'width 0.6s ease',
            }} />
          </div>

          {/* Missing chips */}
          {completion.missing.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {completion.missing.map(label => (
                <Link
                  key={label}
                  href={`/mi-negocio/listing/${primaryListing!.id}${label === 'Ubicación en el mapa' ? '?openMap=true' : ''}`}
                  style={{
                    fontFamily: 'var(--sans)', fontSize: '0.68rem', letterSpacing: '0.06em',
                    padding: '4px 12px', borderRadius: '999px',
                    background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.09)',
                    color: 'rgba(0,0,0,0.55)', textDecoration: 'none', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                  }}
                >
                  <span style={{ color: '#b07d3e' }}>+</span> {label}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}


      {/* ── Mis Listings ───────────────────────────────────── */}
      <section style={{ marginBottom: 'clamp(2rem, 4vw, 3rem)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
          <h2 style={h2}>Mis anuncios</h2>
          {listings.length < 2 && (
            <Link href="/mi-negocio/nuevo" style={btnPrimary}>
              + Agregar
            </Link>
          )}
        </div>

        {listings.length === 0 ? (
          <div style={{ background: '#fff', border: '1.5px dashed rgba(0,0,0,0.12)', borderRadius: '16px', padding: 'clamp(2.5rem, 5vw, 4rem)', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--serif)', fontSize: '1.1rem', color: 'rgba(0,0,0,0.4)', marginBottom: '0.75rem' }}>
              Aún no tienes anuncios
            </p>
            <p style={{ fontFamily: 'var(--sans)', fontSize: '0.8rem', color: 'rgba(0,0,0,0.35)', marginBottom: '1.75rem' }}>
              Añade tu negocio al directorio de Santiago — es completamente gratis.
            </p>
            <Link href="/mi-negocio/nuevo" style={btnPrimaryBlock}>
              Agregar mi anuncio
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {listings.map(l => {
              const status   = STATUS_LABEL[l.status] ?? STATUS_LABEL.pending;
              const comp     = calcCompletion(l);
              const noMap    = !hasRealCoords(l);
              return (
                <div key={l.id} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '16px', padding: '1.25rem', display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: '1rem', alignItems: 'center' }}>
                  {/* Thumb */}
                  <div style={{ position: 'relative', width: '80px', height: '68px', borderRadius: '10px', overflow: 'hidden', background: 'var(--forest, #0d221e)', flexShrink: 0 }}>
                    {l.src
                      ? <Image src={l.src} alt={l.name} fill sizes="80px" style={{ objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        </div>
                    }
                  </div>

                  {/* Info */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--serif)', fontSize: '1.05rem', color: 'var(--ink)', fontWeight: 400 }}>{l.name}</span>
                      <span style={{
                        fontFamily: 'var(--sans)', fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                        padding: '2px 9px', borderRadius: '999px',
                        background: l.tier === 'hero' ? 'linear-gradient(135deg,#856d47,#b09060)' : l.tier === 'featured' ? 'rgba(133,109,71,0.12)' : 'rgba(0,0,0,0.06)',
                        color: l.tier === 'hero' ? '#fff' : 'var(--warm, #856d47)',
                      }}>
                        {TIER_LABEL[l.tier] ?? l.tier}
                      </span>
                    </div>
                    <p style={{ fontFamily: 'var(--sans)', fontSize: '0.75rem', color: 'rgba(0,0,0,0.45)', marginBottom: '0.3rem' }}>
                      {l.short_desc?.slice(0, 80) ?? ''}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--sans)', fontSize: '0.65rem', color: status.color, fontWeight: 500 }}>
                        {status.label}
                      </span>
                      {/* Mini progress */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <div style={{ width: '48px', height: '3px', background: 'rgba(0,0,0,0.07)', borderRadius: '999px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${comp.score}%`, background: comp.score >= 80 ? '#2a7a4f' : '#856d47', borderRadius: '999px' }} />
                        </div>
                        <span style={{ fontFamily: 'var(--sans)', fontSize: '0.6rem', color: 'rgba(0,0,0,0.3)' }}>{comp.score}%</span>
                      </div>
                      {noMap && (
                        <span style={{ fontFamily: 'var(--sans)', fontSize: '0.6rem', color: '#b07d3e', background: 'rgba(176,125,62,0.1)', padding: '2px 8px', borderRadius: '999px' }}>
                          Sin ubicación
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Edit */}
                  <Link href={`/mi-negocio/listing/${l.id}`} style={btnEdit}>
                    Editar
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Hospedajes ─────────────────────────────────────── */}
      <section style={{ marginBottom: 'clamp(2rem, 4vw, 3rem)' }}>
        <Link href="/mi-negocio/hospedajes" style={{ textDecoration: 'none', display: 'block' }}>
          <div style={{
            background: 'linear-gradient(135deg, #0d221e 0%, #1a3d35 100%)',
            borderRadius: '16px',
            padding: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            cursor: 'pointer',
          }}>
            <div style={{ fontSize: '28px', flexShrink: 0 }}>🏡</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 3px', fontFamily: 'var(--serif)', fontSize: '1.05rem', color: '#faf8f4', fontWeight: 400 }}>
                Renta tu hospedaje en Santiapp
              </p>
              <p style={{ margin: 0, fontFamily: 'var(--sans)', fontSize: '0.76rem', color: 'rgba(250,248,244,0.65)', lineHeight: 1.45 }}>
                Publica tu propiedad, define precios y disponibilidad, y recibe reservas con pago en línea.
              </p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(250,248,244,0.55)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </div>
        </Link>
      </section>

      {/* ── Eventos ────────────────────────────────────────── */}
      <section style={{ marginBottom: 'clamp(2rem, 4vw, 3rem)' }}>
        <Link href="/mi-negocio/eventos" style={{ textDecoration: 'none', display: 'block' }}>
          <div style={{
            background: 'linear-gradient(135deg, #856d47 0%, #b09060 100%)',
            borderRadius: '16px',
            padding: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            cursor: 'pointer',
          }}>
            <div style={{ fontSize: '28px', flexShrink: 0 }}>🎟️</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 3px', fontFamily: 'var(--serif)', fontSize: '1.05rem', color: '#faf8f4', fontWeight: 400 }}>
                Vende boletos para tus eventos
              </p>
              <p style={{ margin: 0, fontFamily: 'var(--sans)', fontSize: '0.76rem', color: 'rgba(250,248,244,0.72)', lineHeight: 1.45 }}>
                Crea eventos con boletos, precios y fases. La gente compra en línea, tenga iPhone o no.
              </p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(250,248,244,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </div>
        </Link>
      </section>

      {/* ── Mi Plan ────────────────────────────────────────── */}
      <section style={{ marginBottom: 'clamp(2rem, 4vw, 3rem)' }}>
        <h2 style={{ ...h2, marginBottom: '0.5rem' }}>Mi plan</h2>
        <p style={{ fontFamily: 'var(--sans)', fontSize: '0.8rem', color: 'rgba(0,0,0,0.42)', marginBottom: '1.25rem' }}>
          Compara los planes y elige el que mejor funcione para tu negocio.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '1rem' }}>

          {/* Free */}
          <div style={{ ...planCard, ...(maxTier === 'free' ? planActive : {}) }}>
            {maxTier === 'free' && <div style={planBadge}>Tu plan</div>}
            <p style={{ ...planEyebrow, color: maxTier === 'free' ? '#856d47' : '#888' }}>Gratuito</p>
            <p style={{ ...planPrice, color: maxTier === 'free' ? '#faf8f4' : '#040404' }}>$0 <span style={{ fontSize: '0.8rem', fontWeight: 300 }}>/mes</span></p>
            <ul style={featureList}>
              {['Aparece en directorio y mapa','1 foto de portada','Nombre, descripción, horarios','Teléfono y dirección'].map(f => (
                <li key={f} style={featureItem}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={maxTier === 'free' ? 'rgba(255,255,255,0.5)' : '#856d47'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span style={{ ...featureText, color: maxTier === 'free' ? 'rgba(250,250,250,0.72)' : 'rgba(0,0,0,0.65)' }}>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Destacado */}
          <div style={{ ...planCard, ...(maxTier === 'featured' ? planActive : {}) }}>
            {maxTier === 'featured' && <div style={planBadge}>Tu plan</div>}
            <p style={{ ...planEyebrow, color: maxTier === 'featured' ? '#856d47' : '#888' }}>Destacado</p>
            <p style={{ ...planPrice, color: maxTier === 'featured' ? '#faf8f4' : '#040404' }}>$200 <span style={{ fontSize: '0.8rem', fontWeight: 300 }}>/mes</span></p>
            <ul style={featureList}>
              {['Todo lo del plan Gratuito','Badge "Destacado" en tu card','Posición preferencial','Hasta 3 fotos (slideshow)','Redes sociales visibles','Botón WhatsApp destacado','Estadísticas de clics'].map(f => (
                <li key={f} style={featureItem}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={maxTier === 'featured' ? 'rgba(255,255,255,0.5)' : '#856d47'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span style={{ ...featureText, color: maxTier === 'featured' ? 'rgba(250,250,250,0.72)' : 'rgba(0,0,0,0.65)' }}>{f}</span>
                </li>
              ))}
            </ul>
            {maxTier !== 'featured' && maxTier !== 'hero' && (
              <a href={waUpgradeLink} target="_blank" rel="noopener noreferrer" style={btnUpgrade}>
                Contratar por WhatsApp →
              </a>
            )}
          </div>

          {/* Hero */}
          <div style={{ ...planCard, ...(maxTier === 'hero' ? planActive : {}), ...(maxTier !== 'hero' ? { borderColor: 'rgba(133,109,71,0.25)', background: '#fdfcf8' } : {}) }}>
            {maxTier === 'hero' && <div style={planBadge}>Tu plan</div>}
            {maxTier !== 'hero' && (
              <div style={{ position: 'absolute', top: '1rem', right: '1rem', fontFamily: 'var(--sans)', fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#856d47', background: 'rgba(133,109,71,0.1)', padding: '3px 9px', borderRadius: '999px' }}>
                Por invitación
              </div>
            )}
            <p style={{ ...planEyebrow, color: maxTier === 'hero' ? '#856d47' : '#b09060' }}>★ Hero</p>
            <p style={{ ...planPrice, color: maxTier === 'hero' ? '#faf8f4' : '#040404', fontSize: '0.85rem', paddingTop: '4px' }}>Privado · bajo solicitud</p>
            <ul style={featureList}>
              {[
                'Todo lo del plan Destacado',
                'Badge "★ Hero" premium en tu card',
                'Carrusel Spotlight en portada del directorio',
                'Prioridad máxima de posición',
                'Análisis avanzado de visitas y clics',
                'Sesión de fotos y video profesional del hotel',
                'Contenido curado listo para tus redes sociales',
              ].map(f => (
                <li key={f} style={featureItem}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={maxTier === 'hero' ? 'rgba(255,255,255,0.5)' : '#856d47'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span style={{ ...featureText, color: maxTier === 'hero' ? 'rgba(250,250,250,0.72)' : 'rgba(0,0,0,0.65)' }}>{f}</span>
                </li>
              ))}
            </ul>
            {maxTier !== 'hero' && (
              <p style={{ fontFamily: 'var(--sans)', fontSize: '0.7rem', color: 'rgba(0,0,0,0.45)', marginTop: '1rem', lineHeight: 1.6, borderTop: '1px solid rgba(133,109,71,0.15)', paddingTop: '1rem' }}>
                El plan Hero incluye una <strong>sesión audiovisual profesional</strong> hecha por el equipo del hotel — fotos y video que puedes usar en Instagram, Google y tu sitio web. Disponible por invitación.{' '}
                <a href={`https://wa.me/528123816588?text=${encodeURIComponent('Hola, me interesa el plan Hero para mi negocio en el directorio de Santiago')}`} target="_blank" rel="noopener noreferrer" style={{ color: '#856d47', textDecoration: 'none', fontWeight: 600 }}>
                  Escríbenos →
                </a>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Notificaciones push ────────────────────────────── */}
      <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <div style={{ background: 'rgba(13,34,30,0.07)', borderRadius: '12px', padding: '12px', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0d221e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.05rem', fontWeight: 400, color: 'var(--ink)', margin: '0 0 5px' }}>
              Notificaciones de visitas
            </h3>
            <p style={{ fontFamily: 'var(--sans)', fontSize: '0.78rem', color: 'rgba(0,0,0,0.45)', margin: '0 0 1rem', lineHeight: 1.5 }}>
              Actívalas y te avisamos cada vez que alguien ve tu anuncio o toca tu WhatsApp.
              Funciona en Android y en iPhone si guardas el sitio en tu pantalla de inicio.
            </p>
            <PushSubscribeButton />
          </div>
        </div>
      </section>
    </>
  );
}

/* ─── Styles ───────────────────────────────────────────── */
const eyebrow: React.CSSProperties = {
  fontFamily: 'var(--sans)', fontSize: '0.65rem', letterSpacing: '0.18em',
  textTransform: 'uppercase', color: 'var(--warm, #856d47)', marginBottom: '0.4rem',
};
const h1: React.CSSProperties = {
  fontFamily: 'var(--serif, Georgia)', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
  fontWeight: 400, color: 'var(--forest, #0d221e)', letterSpacing: '-0.02em', marginBottom: '0.25rem',
};
const h2: React.CSSProperties = {
  fontFamily: 'var(--serif)', fontSize: '1.25rem', fontWeight: 400, color: 'var(--ink, #040404)', margin: 0,
};
const muted: React.CSSProperties = {
  fontFamily: 'var(--sans)', fontSize: '0.82rem', color: 'rgba(0,0,0,0.45)', margin: 0,
};
const btnEdit: React.CSSProperties = {
  fontFamily: 'var(--sans)', fontSize: '0.7rem', letterSpacing: '0.08em',
  textTransform: 'uppercase', color: 'var(--ink)', textDecoration: 'none',
  border: '1px solid rgba(0,0,0,0.12)', padding: '8px 16px', borderRadius: '980px',
  whiteSpace: 'nowrap',
};
const btnPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  fontFamily: 'var(--sans)', fontSize: '0.72rem', letterSpacing: '0.1em',
  textTransform: 'uppercase', color: 'var(--paper, #faf8f4)', textDecoration: 'none',
  background: 'var(--forest, #0d221e)', padding: '10px 20px', borderRadius: '980px',
};
const btnPrimaryBlock: React.CSSProperties = {
  ...btnPrimary, display: 'inline-block',
};
const planCard: React.CSSProperties = {
  background: '#fff', border: '1px solid rgba(0,0,0,0.07)',
  borderRadius: '16px', padding: '1.5rem', position: 'relative', overflow: 'hidden',
};
const planActive: React.CSSProperties = {
  background: 'var(--forest, #0d221e)', border: 'none',
};
const planBadge: React.CSSProperties = {
  position: 'absolute', top: '1rem', right: '1rem',
  fontFamily: 'var(--sans)', fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase',
  color: 'var(--warm, #b09060)', background: 'rgba(255,255,255,0.08)',
  padding: '3px 9px', borderRadius: '999px',
};
const planEyebrow: React.CSSProperties = {
  fontFamily: 'var(--sans)', fontSize: '0.6rem', letterSpacing: '0.18em',
  textTransform: 'uppercase', margin: '0 0 4px',
};
const planPrice: React.CSSProperties = {
  fontFamily: 'var(--serif)', fontSize: '1.5rem', fontWeight: 400, letterSpacing: '-0.02em',
  margin: '0 0 1rem',
};
const featureList: React.CSSProperties = { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.45rem' };
const featureItem: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: '8px' };
const featureText: React.CSSProperties = { fontFamily: 'var(--sans)', fontSize: '0.74rem', lineHeight: 1.5 };
const btnUpgrade: React.CSSProperties = {
  display: 'inline-block', marginTop: '1.25rem',
  fontFamily: 'var(--sans)', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase',
  color: 'var(--ink)', textDecoration: 'none',
  border: '1px solid rgba(0,0,0,0.15)', padding: '10px 20px', borderRadius: '980px',
  width: '100%', textAlign: 'center', boxSizing: 'border-box',
} as React.CSSProperties;
