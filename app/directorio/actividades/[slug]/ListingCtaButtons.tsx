'use client';

import { trackCtaClick } from '@/app/lib/analytics';

interface Props {
  phone?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  website?: string | null;
  slug: string;
}

export default function ListingCtaButtons({ phone, whatsapp, instagram, facebook, website, slug }: Props) {
  if (!phone && !whatsapp && !instagram && !facebook && !website) return null;

  return (
    <div style={{
      background: '#fff', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: 'clamp(1.25rem, 2vw, 1.75rem)',
      marginBottom: '1.5rem',
    }}>
      <p style={{
        fontFamily: 'var(--sans)', fontSize: '0.62rem', letterSpacing: '0.18em',
        textTransform: 'uppercase', color: 'var(--warm)', marginBottom: '1rem',
      }}>Contacto</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {phone && (
          <a href={`tel:${phone}`}
            onClick={() => trackCtaClick('phone', `listing_${slug}`)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              fontFamily: 'var(--sans)', fontSize: '0.78rem', color: 'var(--ink)',
              textDecoration: 'none', border: '1px solid var(--border)',
              padding: '9px 16px', borderRadius: 'var(--radius-pill)', background: 'var(--paper)',
            }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.36 2 2 0 0 1 3.6 1.17h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.83a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16a2 2 0 0 1 .27.92z"/></svg>
            {phone}
          </a>
        )}
        {whatsapp && (
          <a href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
            target="_blank" rel="noopener noreferrer"
            onClick={() => trackCtaClick('whatsapp', `listing_${slug}`)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              fontFamily: 'var(--sans)', fontSize: '0.78rem', color: '#25D366',
              textDecoration: 'none', border: '1px solid rgba(37,211,102,0.3)',
              padding: '9px 16px', borderRadius: 'var(--radius-pill)',
              background: 'rgba(37,211,102,0.06)',
            }}>
            WhatsApp
          </a>
        )}
      </div>

      {(instagram || facebook || website) && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '1rem', flexWrap: 'wrap' }}>
          {instagram && (
            <a href={instagram} target="_blank" rel="noopener noreferrer" title="Instagram"
              onClick={() => trackCtaClick('instagram', `listing_${slug}`)}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '36px', height: '36px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
                color: '#fff', textDecoration: 'none',
              }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </a>
          )}
          {facebook && (
            <a href={facebook} target="_blank" rel="noopener noreferrer" title="Facebook"
              onClick={() => trackCtaClick('facebook', `listing_${slug}`)}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '36px', height: '36px', borderRadius: '50%',
                background: '#1877F2', color: '#fff', textDecoration: 'none',
              }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
          )}
          {website && (
            <a href={website} target="_blank" rel="noopener noreferrer" title="Sitio web"
              onClick={() => trackCtaClick('website', `listing_${slug}`)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                fontFamily: 'var(--sans)', fontSize: '0.75rem',
                padding: '0 14px', height: '36px', borderRadius: '18px',
                background: 'var(--forest)', color: 'var(--paper)', textDecoration: 'none',
              }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              Sitio web
            </a>
          )}
        </div>
      )}
    </div>
  );
}
