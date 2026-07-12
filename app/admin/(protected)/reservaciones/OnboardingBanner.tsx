'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const BANNER_KEY = 'admin_onboarding_v1_dismissed';

export default function OnboardingBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(BANNER_KEY)) setVisible(true);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(BANNER_KEY, '1');
    setVisible(false);
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #fff8f0 0%, #fdf4e7 100%)',
      border: '1px solid #e8c97a',
      borderRadius: '14px',
      padding: '20px 24px',
      marginBottom: '20px',
      position: 'relative',
    }}>
      {/* Close button */}
      <button
        onClick={dismiss}
        title="Entendido, no volver a mostrar"
        style={{
          position: 'absolute', top: '12px', right: '14px',
          background: 'none', border: 'none', fontSize: '1.1rem',
          color: '#b8956a', cursor: 'pointer', lineHeight: 1, padding: '2px 6px',
        }}
      >
        ×
      </button>

      <p style={{ margin: '0 0 4px', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#856d47' }}>
        Aviso para Carlitos
      </p>
      <p style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 700, color: '#3a2a10' }}>
        Carlos, perdón — el botón de reservación manual tenía un bug. Ya está corregido.
      </p>

      <p style={{ margin: '0 0 12px', fontSize: '0.84rem', color: '#4a3a20', lineHeight: 1.6 }}>
        Había un error técnico que hacía que las reservaciones creadas desde el panel
        <em> aparentemente</em> se guardaran pero en realidad no quedaban en la base de datos.
        Ya quedó resuelto. Aquí el flujo correcto paso a paso:
      </p>

      <ol style={{ margin: '0 0 16px', paddingLeft: '20px', fontSize: '0.84rem', color: '#4a3a20', lineHeight: 2 }}>
        <li>
          Haz clic en{' '}
          <Link href="/admin/nueva" style={{ color: '#856d47', fontWeight: 700, textDecoration: 'none' }}>
            + Nueva reservación
          </Link>
          {' '}(botón arriba a la derecha)
        </li>
        <li>Llena el nombre completo, email y teléfono del cliente</li>
        <li>Elige las fechas de llegada y salida</li>
        <li>Pon cuántos adultos, niños y habitaciones necesitan</li>
        <li>El total se calcula solo — cámbialo si acordaron otro precio</li>
        <li>En <strong>Notas</strong> puedes escribir "Anticipo $400" o lo que aplique</li>
        <li>Deja <strong>Estado: Confirmada</strong> y elige cómo van a pagar</li>
        <li>Asegúrate de que <strong>"Notificar al huésped"</strong> esté marcado</li>
        <li>
          Clic en <strong>"Crear reservación"</strong> — eso guarda la reserva,
          manda el correo al cliente con su folio y bloquea las fechas automáticamente
        </li>
      </ol>

      <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: '#6b5030', background: '#fff3d6', border: '1px solid #e8c97a', borderRadius: '8px', padding: '10px 14px', lineHeight: 1.5 }}>
        Si el correo no llega al cliente, abre la reservación en la lista y usa el botón{' '}
        <strong>"Reenviar correo"</strong> — no crea duplicados.
      </p>

      <button
        onClick={dismiss}
        style={{
          padding: '9px 22px', borderRadius: '980px', border: 'none',
          background: '#856d47', color: '#fff', fontSize: '0.82rem',
          fontWeight: 700, cursor: 'pointer',
        }}
      >
        Entendido
      </button>
    </div>
  );
}
