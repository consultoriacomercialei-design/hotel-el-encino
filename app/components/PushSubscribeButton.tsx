'use client';

import { useState, useEffect } from 'react';

const VAPID_PUBLIC = 'BC58jHmKhjfUsBfSoJeBOXDOOtaei5FxYpywVZBnREkofFG0OqxG8230MTg36KVMWH-QsV6tKcnGEoium3B0dig';

type Status = 'loading' | 'unsupported' | 'needs-ios-install' | 'denied' | 'subscribed' | 'idle';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

export default function PushSubscribeButton() {
  const [status, setStatus] = useState<Status>('loading');
  const [iosExpanded, setIosExpanded] = useState(false);

  useEffect(() => {
    // iOS not in standalone mode → push won't work, need home screen first
    if (isIOS() && !isStandalone()) {
      setStatus('needs-ios-install');
      return;
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }

    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }

    navigator.serviceWorker.register('/sw.js').catch(() => {});

    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => setStatus(sub ? 'subscribed' : 'idle'))
      .catch(() => setStatus('idle'));
  }, []);

  async function subscribe() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      });

      if (res.ok) setStatus('subscribed');
    } catch {
      if (Notification.permission === 'denied') setStatus('denied');
    }
  }

  async function unsubscribe() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) { setStatus('idle'); return; }

      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });

      await sub.unsubscribe();
      setStatus('idle');
    } catch { /* ignore */ }
  }

  if (status === 'loading') return null;

  // ── iOS: not added to home screen yet ─────────────────────────────────────
  if (status === 'needs-ios-install') {
    return (
      <div style={{
        border: '1.5px solid rgba(13,34,30,0.12)',
        borderRadius: '14px',
        overflow: 'hidden',
        fontFamily: 'var(--sans, system-ui)',
      }}>
        {/* Header */}
        <button
          onClick={() => setIosExpanded(v => !v)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', background: 'rgba(13,34,30,0.04)',
            border: 'none', cursor: 'pointer', textAlign: 'left', gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.1rem' }}>📱</span>
            <div>
              <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: '#0d221e' }}>
                Activa notificaciones en iPhone
              </p>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(0,0,0,0.45)' }}>
                Solo toma 30 segundos · Ver cómo
              </p>
            </div>
          </div>
          <span style={{
            fontSize: '0.7rem', color: '#856d47', fontWeight: 700, letterSpacing: '0.03em',
            flexShrink: 0,
          }}>
            {iosExpanded ? '▲ Cerrar' : '▼ Ver pasos'}
          </span>
        </button>

        {/* Steps — expandable */}
        {iosExpanded && (
          <div style={{ padding: '4px 16px 16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              {[
                {
                  icon: '⬆️',
                  bold: 'Toca el botón de compartir',
                  text: 'El cuadrito con una flecha que aparece en la barra de abajo de Safari',
                },
                {
                  icon: '➕',
                  bold: 'Toca "Agregar a pantalla de inicio"',
                  text: 'Desliza un poco hacia abajo en el menú hasta encontrarlo',
                },
                {
                  icon: '✅',
                  bold: 'Toca "Agregar" arriba a la derecha',
                  text: 'Ya quedó guardada como si fuera una app',
                },
                {
                  icon: '🔔',
                  bold: 'Ábrela desde tu pantalla de inicio',
                  text: 'Busca el ícono del Directorio Santiago y desde ahí activa las notificaciones',
                },
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: 'rgba(13,34,30,0.07)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0, fontSize: '0.85rem',
                  }}>
                    {step.icon}
                  </div>
                  <div>
                    <p style={{ margin: '0 0 2px', fontSize: '0.78rem', fontWeight: 600, color: '#0d221e' }}>
                      {step.bold}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(0,0,0,0.5)', lineHeight: 1.4 }}>
                      {step.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ margin: '14px 0 0', fontSize: '0.7rem', color: 'rgba(0,0,0,0.35)', lineHeight: 1.4 }}>
              Solo funciona con Safari. Si estás en Chrome u otro navegador, abre esta página en Safari primero.
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── Push not supported (old browser / non-Safari iOS) ─────────────────────
  if (status === 'unsupported') return (
    <p style={{ fontFamily: 'var(--sans)', fontSize: '0.76rem', color: 'rgba(0,0,0,0.4)', lineHeight: 1.5 }}>
      Tu navegador no soporta notificaciones push. En iPhone usa Safari; en Android usa Chrome.
    </p>
  );

  // ── Blocked by user ────────────────────────────────────────────────────────
  if (status === 'denied') return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '10px',
      background: 'rgba(176,57,42,0.07)', border: '1px solid rgba(176,57,42,0.18)',
      borderRadius: '12px', padding: '12px 16px',
    }}>
      <span style={{ fontSize: '1.1rem' }}>🚫</span>
      <div>
        <p style={{ fontFamily: 'var(--sans)', fontSize: '0.78rem', fontWeight: 600, color: '#b0392a', margin: '0 0 3px' }}>
          Notificaciones bloqueadas
        </p>
        <p style={{ fontFamily: 'var(--sans)', fontSize: '0.72rem', color: '#b0392a', lineHeight: 1.5, margin: 0 }}>
          Ve a <strong>Configuración del navegador → Sitios → hotelelencino.com</strong> y permite las notificaciones.
        </p>
      </div>
    </div>
  );

  // ── Subscribe / Unsubscribe button ─────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <button
        onClick={status === 'subscribed' ? unsubscribe : subscribe}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '11px 20px',
          background: status === 'subscribed'
            ? 'rgba(42,122,79,0.08)'
            : 'var(--forest, #0d221e)',
          color: status === 'subscribed' ? '#2a7a4f' : 'var(--paper, #faf8f4)',
          border: status === 'subscribed'
            ? '1.5px solid rgba(42,122,79,0.30)'
            : '1.5px solid transparent',
          borderRadius: 'var(--radius-pill, 980px)',
          fontFamily: 'var(--sans)', fontSize: '0.78rem',
          fontWeight: 600, letterSpacing: '0.03em',
          cursor: 'pointer', transition: 'all 0.2s ease',
          alignSelf: 'flex-start',
        }}
      >
        <span style={{ fontSize: '1rem' }}>{status === 'subscribed' ? '🔔' : '🔕'}</span>
        {status === 'subscribed'
          ? 'Notificaciones activas · Toca para desactivar'
          : 'Activar notificaciones de visitas'}
      </button>

      {status === 'subscribed' && (
        <p style={{ fontFamily: 'var(--sans)', fontSize: '0.72rem', color: 'rgba(0,0,0,0.38)', margin: 0 }}>
          Te avisamos cada vez que alguien ve tu anuncio.
        </p>
      )}
    </div>
  );
}
