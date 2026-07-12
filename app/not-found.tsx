import Link from 'next/link';

export default function NotFound() {
  return (
    <main style={{
      minHeight: '100dvh',
      background: 'var(--forest)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      textAlign: 'center',
    }}>
      <p style={{
        fontFamily: 'var(--sans)',
        fontSize: '0.68rem',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: 'var(--warm)',
        marginBottom: '1.5rem',
      }}>
        Error 404
      </p>

      <h1 style={{
        fontFamily: 'var(--serif)',
        fontSize: 'clamp(3rem, 8vw, 6rem)',
        fontWeight: 400,
        color: 'var(--paper)',
        lineHeight: 1.05,
        letterSpacing: '-0.02em',
        marginBottom: '1rem',
      }}>
        Página no<br />
        <em style={{ fontStyle: 'italic', color: 'rgba(250,248,242,0.35)' }}>encontrada</em>
      </h1>

      <p style={{
        fontFamily: 'var(--sans)',
        fontSize: '0.9rem',
        color: 'rgba(250,248,242,0.45)',
        lineHeight: 1.7,
        maxWidth: '380px',
        marginBottom: '3rem',
      }}>
        Esta página no existe o fue movida. Puedes volver al inicio o explorar el directorio de Santiago.
      </p>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/" style={{
          fontFamily: 'var(--sans)',
          fontSize: '0.7rem',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--paper)',
          textDecoration: 'none',
          background: 'rgba(133,109,71,0.75)',
          border: '1px solid rgba(255,255,255,0.2)',
          padding: '14px 32px',
          borderRadius: '999px',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}>
          Inicio
        </Link>
        <Link href="/directorio" style={{
          fontFamily: 'var(--sans)',
          fontSize: '0.7rem',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'rgba(250,248,242,0.7)',
          textDecoration: 'none',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.18)',
          padding: '14px 32px',
          borderRadius: '999px',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}>
          Directorio Santiago
        </Link>
      </div>
    </main>
  );
}
