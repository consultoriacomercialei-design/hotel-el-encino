import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchGoogleReviews } from '@/app/lib/google-reviews';

// Refresco diario: la página se regenera y trae las reseñas más recientes
// de Google sin intervención manual.
export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Reseñas — Hotel El Encino Santiago ★ 5.0 en Google',
  description:
    'Lee las reseñas verificadas de Google de nuestros huéspedes. Hotel El Encino en Santiago, Nuevo León — calificación 5.0 estrellas.',
  robots: { index: true, follow: true },
  alternates: { canonical: '/resenas' },
};

function Stars({ count }: { count: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: '3px', verticalAlign: 'middle' }}>
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} width="15" height="15" viewBox="0 0 24 24" fill="var(--warm)" stroke="none">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </span>
  );
}

export default async function ResenasPage() {
  const data = await fetchGoogleReviews();
  const placeId = process.env.GOOGLE_PLACE_ID?.trim() ?? '';
  const writeReviewUrl = placeId
    ? `https://search.google.com/local/writereview?placeid=${placeId}`
    : 'https://www.google.com/maps/search/Hotel+El+Encino+Santiago';
  const allReviewsUrl = placeId
    ? `https://search.google.com/local/reviews?placeid=${placeId}`
    : 'https://www.google.com/maps/search/Hotel+El+Encino+Santiago';

  return (
    <main style={{ background: 'var(--paper)', color: 'var(--ink)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'var(--forest)', padding: 'clamp(4rem, 8vw, 7rem) clamp(1.5rem, 5vw, 5rem) clamp(3rem, 6vw, 5rem)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <Link
            href="/"
            style={{ fontFamily: 'var(--sans)', fontSize: '0.75rem', color: 'rgba(250,250,250,0.5)', textDecoration: 'none', letterSpacing: '0.12em', textTransform: 'uppercase' }}
          >
            ← Hotel El Encino
          </Link>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', fontWeight: 400, color: 'var(--paper)', marginTop: '1.5rem', lineHeight: 1.1 }}>
            Lo que dicen nuestros huéspedes
          </h1>
          {data && (
            <p style={{ fontFamily: 'var(--sans)', fontSize: '1rem', color: 'rgba(250,250,250,0.75)', marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <Stars count={Math.round(data.rating)} />
              <strong style={{ color: 'var(--warm)', fontSize: '1.2rem' }}>{data.rating.toFixed(1)}</strong>
              <span>· {data.user_ratings_total} reseñas verificadas en Google</span>
            </p>
          )}
        </div>
      </div>

      {/* Reviews */}
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: 'clamp(2.5rem, 5vw, 4rem) clamp(1.5rem, 5vw, 3rem)' }}>
        {data && data.reviews.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {data.reviews.map((r) => (
              <article
                key={`${r.author_name}-${r.time}`}
                style={{ background: '#fff', border: '1px solid #e8e4de', borderRadius: '18px', padding: '1.5rem 1.75rem', boxShadow: '0 4px 18px rgba(0,0,0,0.04)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.9rem' }}>
                  <span
                    aria-hidden
                    style={{
                      width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0,
                      background: 'var(--forest)', color: 'var(--warm)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--sans)', fontWeight: 700, fontSize: '0.9rem',
                    }}
                  >
                    {r.initials}
                  </span>
                  <div>
                    <p style={{ fontFamily: 'var(--sans)', fontWeight: 600, fontSize: '0.92rem', margin: 0 }}>{r.author_name}</p>
                    <p style={{ fontFamily: 'var(--sans)', fontSize: '0.75rem', color: '#9b9b9b', margin: '2px 0 0' }}>
                      {r.relative_time} · reseña de Google
                    </p>
                  </div>
                  <span style={{ marginLeft: 'auto' }}><Stars count={r.rating} /></span>
                </div>
                <p style={{ fontFamily: 'var(--sans)', fontSize: '0.92rem', lineHeight: 1.65, color: '#3a3a3a', margin: 0 }}>
                  {r.text}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p style={{ fontFamily: 'var(--sans)', textAlign: 'center', color: '#6b6b6b' }}>
            Consulta todas nuestras reseñas directamente en Google.
          </p>
        )}

        {/* CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '420px', margin: '2.5rem auto 0' }}>
          <Link
            href="/?reservar=1"
            style={{
              display: 'block', textAlign: 'center', padding: '15px 24px', borderRadius: '980px',
              background: 'var(--forest)', color: 'var(--warm)',
              fontFamily: 'var(--sans)', fontWeight: 600, fontSize: '0.92rem',
              textDecoration: 'none', letterSpacing: '0.02em',
              boxShadow: '0 6px 20px rgba(13,34,30,0.25)',
            }}
          >
            Reservar ahora
          </Link>
          <a
            href={allReviewsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block', textAlign: 'center', padding: '14px 24px', borderRadius: '980px',
              border: '1.5px solid #e8e4de', background: '#fff', color: '#6b6b6b',
              fontFamily: 'var(--sans)', fontSize: '0.88rem', textDecoration: 'none',
            }}
          >
            Ver todas las reseñas en Google
          </a>
          <a
            href={writeReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block', textAlign: 'center', padding: '14px 24px', borderRadius: '980px',
              border: '1.5px solid #e8e4de', background: '#fff', color: '#6b6b6b',
              fontFamily: 'var(--sans)', fontSize: '0.88rem', textDecoration: 'none',
            }}
          >
            ¿Ya te hospedaste? Escribe tu reseña
          </a>
        </div>
      </div>
    </main>
  );
}
