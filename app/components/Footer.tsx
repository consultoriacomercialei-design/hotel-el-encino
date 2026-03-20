'use client';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      id="contacto"
      style={{
        background: 'var(--ink)',
        color: 'var(--paper)',
        padding: 'clamp(5rem, 10vw, 9rem) 0 0',
      }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 clamp(1.5rem, 5vw, 5rem)' }}>

        {/* CTA Banner */}
        <div style={{
          borderBottom: '1px solid rgba(250,250,250,0.1)',
          paddingBottom: 'clamp(4rem, 7vw, 7rem)',
          marginBottom: 'clamp(4rem, 7vw, 7rem)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
          gap: 'clamp(3rem, 5vw, 5rem)',
          alignItems: 'end',
        }}>
          <div>
            <p style={{
              fontFamily: 'var(--sans)',
              fontSize: '0.7rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--warm)',
              marginBottom: '1.5rem',
            }}>
              Contacto & Reservas
            </p>
            <h2 style={{
              fontFamily: 'var(--serif)',
              fontSize: 'clamp(2.8rem, 5.5vw, 5rem)',
              fontWeight: 400,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              color: 'var(--paper)',
              marginBottom: '1.5rem',
            }}>
              Planea tu<br />
              <em style={{ fontStyle: 'italic', color: 'rgba(250,250,250,0.4)' }}>escapada</em>
            </h2>
            <p style={{
              fontFamily: 'var(--sans)',
              fontSize: '0.9rem',
              color: 'rgba(250,250,250,0.45)',
              lineHeight: 1.7,
              maxWidth: '400px',
            }}>
              Contáctanos directamente por teléfono o redes sociales para consultar disponibilidad y obtener la mejor tarifa.
            </p>
          </div>

          {/* Contact Form */}
          <form
            onSubmit={(e) => e.preventDefault()}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <input
                type="text"
                placeholder="Nombre"
                aria-label="Nombre"
                style={{
                  background: 'rgba(250,250,250,0.06)',
                  border: '1px solid rgba(250,250,250,0.12)',
                  padding: '14px 18px',
                  color: 'var(--paper)',
                  fontFamily: 'var(--sans)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'border-color 0.3s',
                }}
                onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--warm)'; }}
                onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(250,250,250,0.12)'; }}
              />
              <input
                type="email"
                placeholder="Correo electrónico"
                aria-label="Correo electrónico"
                style={{
                  background: 'rgba(250,250,250,0.06)',
                  border: '1px solid rgba(250,250,250,0.12)',
                  padding: '14px 18px',
                  color: 'var(--paper)',
                  fontFamily: 'var(--sans)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'border-color 0.3s',
                }}
                onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--warm)'; }}
                onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(250,250,250,0.12)'; }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <input
                type="date"
                aria-label="Fecha de llegada"
                style={{
                  background: 'rgba(250,250,250,0.06)',
                  border: '1px solid rgba(250,250,250,0.12)',
                  padding: '14px 18px',
                  color: 'rgba(250,250,250,0.5)',
                  fontFamily: 'var(--sans)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  colorScheme: 'dark',
                  transition: 'border-color 0.3s',
                }}
                onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--warm)'; }}
                onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(250,250,250,0.12)'; }}
              />
              <select
                aria-label="Número de noches"
                style={{
                  background: 'rgba(250,250,250,0.06)',
                  border: '1px solid rgba(250,250,250,0.12)',
                  padding: '14px 18px',
                  color: 'rgba(250,250,250,0.5)',
                  fontFamily: 'var(--sans)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  appearance: 'none',
                  cursor: 'pointer',
                  transition: 'border-color 0.3s',
                }}
                onFocus={(e) => { (e.target as HTMLSelectElement).style.borderColor = 'var(--warm)'; }}
                onBlur={(e) => { (e.target as HTMLSelectElement).style.borderColor = 'rgba(250,250,250,0.12)'; }}
              >
                <option value="">Noches</option>
                <option value="1">1 noche</option>
                <option value="2">2 noches</option>
                <option value="3">3 noches</option>
                <option value="4">4 noches</option>
                <option value="5">5 noches</option>
                <option value="7">7 noches</option>
              </select>
            </div>
            <textarea
              placeholder="¿Tienes alguna solicitud especial?"
              aria-label="Solicitud especial"
              rows={3}
              style={{
                background: 'rgba(250,250,250,0.06)',
                border: '1px solid rgba(250,250,250,0.12)',
                padding: '14px 18px',
                color: 'var(--paper)',
                fontFamily: 'var(--sans)',
                fontSize: '0.9rem',
                outline: 'none',
                resize: 'vertical',
                transition: 'border-color 0.3s',
              }}
              onFocus={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = 'var(--warm)'; }}
              onBlur={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = 'rgba(250,250,250,0.12)'; }}
            />
            <button
              type="submit"
              style={{
                background: 'var(--warm)',
                border: 'none',
                padding: '18px 36px',
                color: 'var(--paper)',
                fontFamily: 'var(--sans)',
                fontSize: '0.7rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'background 0.3s ease',
                alignSelf: 'flex-start',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--paper)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--warm)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--paper)'; }}
            >
              Enviar solicitud
            </button>
          </form>
        </div>

        {/* Bottom row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
          gap: 'clamp(2rem, 4vw, 4rem)',
          paddingBottom: '3rem',
        }}>
          {/* Logo + tagline */}
          <div>
            <p style={{
              fontFamily: 'var(--serif)',
              fontSize: '1.2rem',
              fontWeight: 500,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--paper)',
              marginBottom: '0.75rem',
            }}>
              Hotel El Encino
            </p>
            <p style={{
              fontFamily: 'var(--sans)',
              fontSize: '0.78rem',
              color: 'rgba(250,250,250,0.35)',
              lineHeight: 1.6,
            }}>
              Tu hospedaje en el centro<br />
              de Santiago, Nuevo León.
            </p>
          </div>

          {/* Address */}
          <div>
            <p style={{ fontFamily: 'var(--sans)', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--warm)', marginBottom: '1rem' }}>
              Dónde
            </p>
            <address style={{ fontStyle: 'normal' }}>
              <p style={{ fontFamily: 'var(--sans)', fontSize: '0.82rem', color: 'rgba(250,250,250,0.5)', lineHeight: 1.8 }}>
                Hermenegildo Galeana 200<br />
                Col. Centro, Santiago, N.L.<br />
                C.P. 67310, México
              </p>
            </address>
          </div>

          {/* Contact */}
          <div>
            <p style={{ fontFamily: 'var(--sans)', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--warm)', marginBottom: '1rem' }}>
              Contacto
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <a href="tel:+528119999318" style={{ fontFamily: 'var(--sans)', fontSize: '0.82rem', color: 'rgba(250,250,250,0.5)', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--warm)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(250,250,250,0.5)'; }}
              >
                +52 (81) 1999 9318
              </a>
              <a href="https://www.instagram.com/elencinohospedaje" target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--sans)', fontSize: '0.82rem', color: 'rgba(250,250,250,0.5)', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--warm)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(250,250,250,0.5)'; }}
              >
                @elencinohospedaje
              </a>
            </div>
          </div>

          {/* Social */}
          <div>
            <p style={{ fontFamily: 'var(--sans)', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--warm)', marginBottom: '1rem' }}>
              Síguenos
            </p>
            <div style={{ display: 'flex', gap: '1.25rem' }}>
              {[
                { label: 'Instagram', href: 'https://www.instagram.com/elencinohospedaje', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> },
                { label: 'Facebook', href: 'https://www.facebook.com/hotelencinosantiago', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg> },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  style={{
                    color: 'rgba(250,250,250,0.4)',
                    transition: 'color 0.25s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--warm)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(250,250,250,0.4)'; }}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div style={{
          borderTop: '1px solid rgba(250,250,250,0.07)',
          padding: '1.5rem 0',
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <p style={{ fontFamily: 'var(--sans)', fontSize: '0.7rem', color: 'rgba(250,250,250,0.2)', letterSpacing: '0.05em' }}>
            © {year} Hotel El Encino Santiago. Todos los derechos reservados.
          </p>
          <p style={{ fontFamily: 'var(--sans)', fontSize: '0.7rem', color: 'rgba(250,250,250,0.2)', letterSpacing: '0.05em' }}>
            Santiago · Nuevo León · México
          </p>
        </div>
      </div>
    </footer>
  );
}
