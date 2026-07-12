import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getGuiaUser, refreshGuiaSession, SESSION_COOKIE, REFRESH_COOKIE, COOKIE_OPTS, COOKIE_MAX_AGE, REFRESH_MAX_AGE } from '@/app/lib/guia-auth';

export default async function NegocioProtectedLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const accessToken  = cookieStore.get(SESSION_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

  let user = accessToken ? await getGuiaUser(accessToken) : null;

  if (!user && refreshToken) {
    const newTokens = await refreshGuiaSession(refreshToken);
    if (newTokens) {
      user = await getGuiaUser(newTokens.access_token);
      // Note: new cookies set here won't reach browser in server component;
      // handled by middleware or client refresh — acceptable for this use case.
    }
  }

  if (!user) redirect('/mi-negocio/login');

  return (
    <div style={{ minHeight: '100dvh', background: '#f6f4f0', fontFamily: 'var(--sans, system-ui, sans-serif)' }}>
      {/* Nav */}
      <nav style={{
        background: '#fff',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        padding: '0 clamp(1.5rem, 5vw, 4rem)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '56px', position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <a href="/directorio" style={{ fontFamily: 'var(--serif, Georgia, serif)', fontSize: '1rem', color: 'var(--forest, #0d221e)', textDecoration: 'none', letterSpacing: '-0.01em' }}>
            Directorio
          </a>
          <span style={{ width: '1px', height: '16px', background: 'rgba(0,0,0,0.12)' }} />
          <span style={{ fontFamily: 'var(--sans, system-ui)', fontSize: '0.72rem', color: 'rgba(0,0,0,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Mi Negocio
          </span>
        </div>
        <form action="/api/negocio/auth/logout" method="POST">
          <button type="submit" style={{
            background: 'none', border: '1px solid rgba(0,0,0,0.12)',
            borderRadius: '980px', padding: '6px 16px', cursor: 'pointer',
            fontFamily: 'var(--sans, system-ui)', fontSize: '0.72rem', color: 'rgba(0,0,0,0.55)',
            letterSpacing: '0.05em',
          }}>
            Cerrar sesión
          </button>
        </form>
      </nav>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: 'clamp(2rem, 5vw, 3.5rem) clamp(1.5rem, 5vw, 3rem)' }}>
        {children}
      </main>
    </div>
  );
}
