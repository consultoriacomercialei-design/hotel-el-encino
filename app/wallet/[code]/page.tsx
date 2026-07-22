import { headers } from 'next/headers';
import { findByCheckinCode, roomLabel, passServable } from '@/app/lib/wallet/lookup';

export const dynamic = 'force-dynamic';

function fmt(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00-06:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
}

/**
 * Página puente del pase. Detecta el dispositivo por User-Agent (dentro del
 * correo no se puede) y muestra el botón correcto: iPhone → Apple Wallet,
 * Android → Google Wallet, escritorio/otro → ambos. Un solo link universal en
 * el correo apunta aquí.
 */
export default async function WalletBridge({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const ua = (await headers()).get('user-agent') || '';
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isAndroid = /android/i.test(ua);

  const r = code && code.length >= 8 ? await findByCheckinCode(code) : null;
  const valid = r && passServable(r.status);

  const appleHref = `/api/pases/${encodeURIComponent(code)}/pass`;
  const googleHref = `/api/pases/${encodeURIComponent(code)}/gpass`;

  const wrap: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#283820',
    color: '#fff',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    padding: 24,
  };
  const card: React.CSSProperties = { maxWidth: 420, width: '100%', textAlign: 'center' };
  const btn: React.CSSProperties = {
    display: 'block',
    margin: '12px 0',
    padding: '15px 20px',
    borderRadius: 14,
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '1.02rem',
  };

  if (!valid) {
    return (
      <div style={wrap}>
        <div style={card}>
          <h1 style={{ color: '#D4AF37', fontSize: '1.3rem', marginBottom: 8 }}>Pase no disponible</h1>
          <p style={{ color: '#e8e4de', lineHeight: 1.5 }}>
            No encontramos una reservación vigente para este enlace. Si tu pago fue confirmado,
            revisa el correo más reciente o contáctanos.
          </p>
          <a href="https://wa.me/528123816588" style={{ ...btn, background: '#25D366', color: '#fff', marginTop: 20 }}>
            Contactar por WhatsApp
          </a>
        </div>
      </div>
    );
  }

  const apple = (
    <a key="a" style={{ ...btn, background: '#000', color: '#fff' }} href={appleHref}>
      &#63743;&nbsp; Agregar a Apple Wallet
    </a>
  );
  const google = (
    <a key="g" style={{ ...btn, background: '#fff', color: '#202124', border: '1px solid #dadce0' }} href={googleHref}>
      Guardar en Google Wallet
    </a>
  );

  const buttons = isIOS ? [apple] : isAndroid ? [google] : [apple, google];

  return (
    <div style={wrap}>
      <div style={card}>
        <p style={{ color: '#D4AF37', letterSpacing: 2, fontSize: '0.72rem', margin: 0 }}>HOTEL EL ENCINO</p>
        <h1 style={{ fontSize: '1.35rem', margin: '6px 0 4px' }}>Tu pase de reservación</h1>
        <p style={{ color: '#c9d4c2', fontFamily: 'monospace', margin: '0 0 20px' }}>{r!.folio}</p>

        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 18px', textAlign: 'left', margin: '0 0 22px', fontSize: '0.92rem' }}>
          <p style={{ margin: '0 0 6px' }}><strong>Habitación:</strong> {roomLabel(r!.room_type)}</p>
          <p style={{ margin: '0 0 6px' }}><strong>Llegada:</strong> {fmt(r!.check_in)}</p>
          <p style={{ margin: 0 }}><strong>Salida:</strong> {fmt(r!.check_out)}</p>
        </div>

        {buttons}

        <p style={{ color: '#8fa08a', fontSize: '0.78rem', marginTop: 18 }}>
          Muestra el QR de tu pase en recepción para tu check-in.
        </p>
      </div>
    </div>
  );
}
