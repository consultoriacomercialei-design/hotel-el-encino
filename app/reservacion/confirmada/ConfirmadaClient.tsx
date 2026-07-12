'use client';

/**
 * ConfirmadaClient
 * Handles:
 *  - Google Ads conversion pixel on mount
 *  - Polling for MP pending_payment reservations
 *  - Beautiful animated UI
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { pushEnhancedUserData, pushPurchase, fireGAdsConversion } from '@/app/lib/gtm';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ReservationProps {
  id:            string;
  folio:         string;
  guestName:     string;
  guestEmail:    string;
  guestPhone:    string;
  roomLabel:     string;
  checkIn:       string;
  checkOut:      string;
  nights:        number;
  total:         number;
  guests:        string;
  status:        string;
  paymentMethod: string;
  waUrl:         string;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ConfirmadaClient({ reservation: initial }: { reservation: ReservationProps }) {
  const [status,   setStatus]   = useState(initial.status);
  const [polling,  setPolling]  = useState(initial.status === 'pending_payment');
  const isConfirmed = status === 'confirmed';
  const isPendingMp = status === 'pending_payment';
  const isCash      = initial.paymentMethod !== 'online';

  // Fire conversion + enhanced data exactly once when status reaches 'confirmed'
  const conversionFiredRef = useRef(false);
  useEffect(() => {
    if (status !== 'confirmed' || conversionFiredRef.current) return;
    conversionFiredRef.current = true;

    void (async () => {
      // 1. Push hashed user_data BEFORE the purchase event (required for Enhanced Conversions)
      if (initial.guestEmail && initial.guestPhone) {
        await pushEnhancedUserData({
          email:     initial.guestEmail,
          phone:     initial.guestPhone,
          guestName: initial.guestName,
        });
      }

      // 2. GA4 purchase event — GTM reads this to trigger Google Ads conversion tag
      pushPurchase({
        folio:     initial.folio,
        total:     initial.total,
        roomLabel: initial.roomLabel,
        nights:    initial.nights,
      });

      // 3. Direct Google Ads conversion (fallback while GTM tag is being configured)
      fireGAdsConversion({
        sendTo:        'AW-18050215750/3E-zCKu6lKccEMbegZ9D',
        value:         initial.total,
        transactionId: initial.folio,
      });
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Poll for MP payment confirmation
  const checkStatus = useCallback(async () => {
    try {
      const res  = await fetch(`/api/payment/status/${initial.id}`, { cache: 'no-store' });
      const data = await res.json() as { status?: string };
      if (data.status && data.status !== 'pending_payment') {
        setStatus(data.status);
        setPolling(false);
      }
    } catch { /* silent */ }
  }, [initial.id]);

  useEffect(() => {
    if (!polling) return;
    const id = setInterval(checkStatus, 3500);
    // Stop after 10 min
    const timeout = setTimeout(() => { clearInterval(id); setPolling(false); }, 600_000);
    return () => { clearInterval(id); clearTimeout(timeout); };
  }, [polling, checkStatus]);

  return (
    <div
      id="reservation-confirmed"
      data-folio={initial.folio}
      data-status={status}
      data-payment-method={initial.paymentMethod}
      data-total={initial.total}
      data-currency="MXN"
      style={{ minHeight: '100dvh', background: 'linear-gradient(160deg, #f9f7f3 0%, #f0ece4 100%)', fontFamily: "'Karla', system-ui, sans-serif" }}
    >

      {/* ── Decorative top band ──────────────────────────────────────────── */}
      <div style={{ height: '4px', background: 'linear-gradient(90deg, #856d47, #c4a97a, #856d47)' }} />

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '48px 20px 72px' }}>

        {/* ── Logo / Hotel name ─────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Hotel El Encino" style={{ width: '56px', height: '56px', borderRadius: '14px', marginBottom: '12px', boxShadow: '0 4px 18px rgba(133,109,71,0.25)' }} />
          <p style={{ fontFamily: "'Playfair Display SC', Georgia, serif", fontSize: '0.78rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#856d47', margin: 0 }}>
            Hotel El Encino · Santiago, N.L.
          </p>
        </div>

        {/* ── Status hero ──────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          {isPendingMp && !polling ? (
            /* Payment timed out */
            <StatusIcon type="warning" />
          ) : isPendingMp ? (
            /* Waiting for MP webhook */
            <StatusIcon type="loading" />
          ) : isConfirmed ? (
            <StatusIcon type="success" />
          ) : (
            <StatusIcon type="pending" />
          )}

          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, fontSize: 'clamp(1.55rem, 5vw, 2rem)', color: '#1a1a1a', margin: '20px 0 8px', lineHeight: 1.2 }}>
            {isPendingMp && polling
              ? 'Procesando tu pago…'
              : isConfirmed
                ? isCash
                  ? 'Solicitud recibida'
                  : '¡Pago confirmado!'
                : status === 'cancelled'
                  ? 'Reservación cancelada'
                  : 'Solicitud recibida'}
          </h1>

          <p style={{ color: '#6b6b6b', fontSize: '0.9rem', lineHeight: 1.6, maxWidth: '380px', margin: '0 auto' }}>
            {isPendingMp && polling
              ? 'Estamos confirmando tu pago con Mercado Pago. Esto toma unos segundos.'
              : isConfirmed && !isCash
                ? 'Tu reservación está confirmada. Recibirás los detalles completos en tu correo electrónico.'
                : isCash
                  ? 'Enviamos la confirmación a tu correo. El hotel te contactará para confirmar por WhatsApp en las próximas 2 horas.'
                  : ''}
          </p>
        </div>

        {/* ── Folio badge ───────────────────────────────────────────────── */}
        <div style={{ background: 'rgba(133,109,71,0.07)', border: '1px solid rgba(133,109,71,0.2)', borderRadius: '18px', padding: '20px 24px', textAlign: 'center', marginBottom: '24px' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#856d47', margin: '0 0 4px' }}>
            Folio de reservación
          </p>
          <p style={{ fontFamily: "'Playfair Display SC', Georgia, serif", fontSize: '2rem', color: '#856d47', letterSpacing: '0.08em', margin: 0 }}>
            {initial.folio}
          </p>
        </div>

        {/* ── Reservation summary card ─────────────────────────────────── */}
        <div style={{ background: '#fff', border: '1px solid #e8e4de', borderRadius: '20px', overflow: 'hidden', marginBottom: '24px', boxShadow: '0 4px 24px rgba(0,0,0,0.05)' }}>

          {/* Card header */}
          <div style={{ background: 'linear-gradient(90deg, #0d221e, #1a3a33)', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', margin: '0 0 2px' }}>Habitación</p>
              <p style={{ fontFamily: "'Playfair Display SC', Georgia, serif", color: '#fff', fontSize: '1rem', margin: 0 }}>{initial.roomLabel}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', margin: '0 0 2px' }}>Total</p>
              <p style={{ color: '#c4a97a', fontWeight: 700, fontSize: '1.15rem', margin: 0 }}>
                ${initial.total.toLocaleString('es-MX')} <span style={{ fontSize: '0.7rem', fontWeight: 400 }}>MXN</span>
              </p>
            </div>
          </div>

          {/* Card rows */}
          <div style={{ padding: '4px 0' }}>
            <SummaryRow icon="👤" label="Huésped"   value={initial.guestName}  dataId="rsv-guest-name" />
            {initial.guestPhone && <SummaryRow icon="📱" label="Celular"    value={initial.guestPhone} dataId="rsv-guest-phone" />}
            {initial.guestEmail && <SummaryRow icon="✉️" label="Correo"     value={initial.guestEmail} dataId="rsv-guest-email" />}
            <SummaryRow icon="📅" label="Llegada"   value={initial.checkIn} />
            <SummaryRow icon="📅" label="Salida"    value={initial.checkOut} />
            <SummaryRow icon="🌙" label="Noches"    value={`${initial.nights} ${initial.nights === 1 ? 'noche' : 'noches'}`} />
            <SummaryRow icon="👥" label="Huéspedes" value={initial.guests} last />
          </div>
        </div>

        {/* ── Cash: 2-hour warning ─────────────────────────────────────── */}
        {isCash && status !== 'confirmed' && (
          <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.35)', borderRadius: '14px', padding: '14px 18px', display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '24px' }}>
            <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: '1px' }}>⏰</span>
            <p style={{ fontSize: '0.82rem', color: '#92400e', lineHeight: 1.5, margin: 0 }}>
              <strong>Tienes 2 horas para confirmar</strong> tu reservación por WhatsApp con el hotel. De lo contrario la fecha quedará disponible nuevamente.
            </p>
          </div>
        )}

        {/* ── CTAs ─────────────────────────────────────────────────────── */}
        {!isPendingMp && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* WhatsApp button */}
            <a
              href={initial.waUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                padding: '15px 24px', borderRadius: '980px',
                background: '#25D366', color: '#fff',
                fontWeight: 600, fontSize: '0.9rem',
                textDecoration: 'none',
                boxShadow: '0 6px 20px rgba(37,211,102,0.32)',
                letterSpacing: '0.02em',
              }}
            >
              <WhatsAppIcon />
              {isCash ? 'Confirmar por WhatsApp' : 'Escribir al hotel'}
            </a>

            {/* Back to home */}
            <Link
              href="/"
              style={{
                display: 'block', textAlign: 'center',
                padding: '14px 24px', borderRadius: '980px',
                border: '1.5px solid #e8e4de',
                color: '#6b6b6b', fontSize: '0.88rem',
                textDecoration: 'none',
                background: '#fff',
              }}
            >
              ← Volver al inicio
            </Link>
          </div>
        )}

        {/* ── MP polling state CTAs ────────────────────────────────────── */}
        {isPendingMp && polling && (
          <div style={{ textAlign: 'center', marginTop: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#856d47', fontSize: '0.85rem' }}>
              <SpinnerIcon />
              Verificando pago…
            </div>
            <p style={{ color: '#9b9b9b', fontSize: '0.78rem', marginTop: '10px' }}>
              Si ya pagaste en Mercado Pago, esta página se actualizará automáticamente.
            </p>
          </div>
        )}

        {/* ── Footer note ──────────────────────────────────────────────── */}
        <p style={{ textAlign: 'center', color: '#b0a898', fontSize: '0.75rem', marginTop: '36px', lineHeight: 1.5 }}>
          ¿Necesitas ayuda? Llámanos al{' '}
          <a href="tel:+528119999318" style={{ color: '#856d47', textDecoration: 'none' }}>81 1999 9318</a>
        </p>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryRow({ icon, label, value, last = false, dataId }: { icon: string; label: string; value: string; last?: boolean; dataId?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '13px 24px',
      borderBottom: last ? 'none' : '1px solid #f5f2ed',
    }}>
      <span style={{ fontSize: '0.9rem', width: '20px', textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      <span style={{ color: '#9b9b9b', fontSize: '0.8rem', flex: 1 }}>{label}</span>
      <span id={dataId} style={{ color: '#1a1a1a', fontSize: '0.85rem', fontWeight: 500, textAlign: 'right', maxWidth: '55%' }}>{value}</span>
    </div>
  );
}

function StatusIcon({ type }: { type: 'success' | 'pending' | 'loading' | 'warning' }) {
  if (type === 'loading') return <SpinnerIcon large />;

  const configs = {
    success: { bg: '#d1fae5', border: '#a7f3d0', icon: '✓', color: '#065f46' },
    pending: { bg: '#fef3c7', border: '#fde68a', icon: '✉', color: '#92400e' },
    warning: { bg: '#fee2e2', border: '#fca5a5', icon: '!', color: '#991b1b' },
  };
  const c = configs[type];

  return (
    <div style={{
      width: '72px', height: '72px', borderRadius: '50%',
      background: c.bg, border: `2px solid ${c.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      margin: '0 auto',
      fontSize: '2rem', color: c.color,
      boxShadow: `0 8px 24px ${c.bg}`,
    }}>
      {c.icon}
    </div>
  );
}

function SpinnerIcon({ large = false }: { large?: boolean }) {
  const size = large ? 56 : 18;
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24" fill="none" stroke="#856d47"
      strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: 'spin 1s linear infinite', display: 'block', margin: large ? '0 auto' : undefined }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" stroke="#e8e4de" strokeWidth="2.5" />
      <path d="M12 2 a10 10 0 0 1 10 10" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
