import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/app/lib/admin-auth';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const RESEND_KEY   = process.env.RESEND_API_KEY!;
const FROM         = 'Hotel El Encino <reservaciones@hotelelencino.com>';

/**
 * POST /api/admin/email-anunciante
 * Body: { listingId: string, type: 'foto' | 'mapa' | 'completar' }
 *
 * Sends a personalized nudge email to the owner of a specific listing.
 * Call from browser console while logged in as admin:
 *   fetch('/api/admin/email-anunciante', {
 *     method:'POST',
 *     headers:{'Content-Type':'application/json'},
 *     body: JSON.stringify({ listingId: 'uuid-here', type: 'foto' })
 *   }).then(r=>r.json()).then(console.log)
 */
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (!verifyAdminToken(cookieStore.get('hotel_admin_session')?.value)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { listingId, type = 'foto' } = await req.json() as { listingId: string; type?: string };
  if (!listingId) return NextResponse.json({ error: 'listingId requerido' }, { status: 400 });

  // Fetch listing
  const listRes = await fetch(
    `${SUPABASE_URL}/rest/v1/guia_listings?id=eq.${listingId}&select=id,name,slug,owner_id,src,lat,lng`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  if (!listRes.ok) return NextResponse.json({ error: 'DB error' }, { status: 500 });
  const [listing] = await listRes.json() as Array<{
    id: string; name: string; slug: string; owner_id: string;
    src: string | null; lat: number | null; lng: number | null;
  }>;
  if (!listing) return NextResponse.json({ error: 'Listing no encontrado' }, { status: 404 });

  // Fetch owner email via Supabase Admin API
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${listing.owner_id}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!userRes.ok) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
  const { email } = await userRes.json() as { email: string };

  const editUrl = `https://hotelelencino.com/mi-negocio/listing/${listing.id}`;

  let subject = '';
  let html = '';

  if (type === 'foto') {
    subject = `📸 ${listing.name} merece una gran foto`;
    html = buildFotoEmail({ email, name: listing.name, editUrl });
  } else if (type === 'mapa') {
    subject = `📍 Pon ${listing.name} en el mapa de Santiago`;
    html = buildMapaEmail({ email, name: listing.name, editUrl: editUrl + '?openMap=true' });
  } else {
    subject = `✨ Mejora tu anuncio y llega a más personas`;
    html = buildCompletarEmail({ email, name: listing.name, editUrl });
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [email], subject, html }),
  });

  return res.ok
    ? NextResponse.json({ ok: true, to: email, listing: listing.name, type })
    : NextResponse.json({ ok: false, error: await res.text() }, { status: 500 });
}

/* ─── Templates ─────────────────────────────────────────── */

function emailShell(content: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <!-- Header -->
        <tr><td style="background:#0d221e;border-radius:18px 18px 0 0;padding:32px 40px 24px;text-align:center;">
          <p style="margin:0 0 6px;font-family:system-ui,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#856d47;">Hotel El Encino · Directorio Santiago</p>
          <h1 style="margin:0;font-family:Georgia,serif;font-size:22px;font-weight:400;color:#faf8f4;letter-spacing:-0.02em;line-height:1.3;">Directorio de Santiago</h1>
        </td></tr>
        <!-- Body -->
        <tr><td style="background:#fff;padding:36px 40px 32px;">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f0eee9;border-radius:0 0 18px 18px;padding:20px 40px;text-align:center;">
          <p style="margin:0;font-family:system-ui,sans-serif;font-size:11px;color:rgba(0,0,0,0.38);">
            Hotel El Encino · Matamoros 106, Santiago N.L. · <a href="https://hotelelencino.com/directorio" style="color:#856d47;text-decoration:none;">Ver directorio</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function buildFotoEmail({ email, name, editUrl }: { email: string; name: string; editUrl: string }) {
  return emailShell(`
    <p style="margin:0 0 6px;font-family:system-ui,sans-serif;font-size:13px;color:rgba(0,0,0,0.4);letter-spacing:0.06em;">Hola, ${email.split('@')[0]}</p>
    <h2 style="font-family:Georgia,serif;font-size:22px;font-weight:400;color:#0d221e;margin:0 0 20px;letter-spacing:-0.02em;line-height:1.3;">
      Una buena foto puede triplicar las visitas a tu anuncio
    </h2>
    <p style="font-family:system-ui,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.7;margin:0 0 16px;">
      Notamos que <strong>${name}</strong> todavía no tiene foto en el directorio. Los anuncios con imagen reciben
      en promedio <strong>3 veces más clics</strong> que los que solo tienen texto.
    </p>
    <p style="font-family:system-ui,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.7;margin:0 0 28px;">
      No necesitas una foto perfecta — una imagen clara de tu local, tu producto o tu equipo ya hace
      una gran diferencia para que los turistas en Santiago te encuentren y confíen en ti.
    </p>

    <!-- Visual hint -->
    <div style="background:#f9f8f5;border-radius:14px;padding:20px 24px;margin-bottom:28px;display:flex;align-items:center;gap:16px;">
      <div style="font-size:32px;flex-shrink:0;">📸</div>
      <div>
        <p style="margin:0 0 4px;font-family:Georgia,serif;font-size:15px;color:#040404;">Sube tu foto en 1 minuto</p>
        <p style="margin:0;font-family:system-ui,sans-serif;font-size:13px;color:rgba(0,0,0,0.5);line-height:1.5;">JPG o PNG desde tu celular — la comprimimos automáticamente.</p>
      </div>
    </div>

    <div style="text-align:center;margin-bottom:28px;">
      <a href="${editUrl}" style="display:inline-block;background:#0d221e;color:#faf8f4;text-decoration:none;padding:14px 36px;border-radius:999px;font-family:system-ui,sans-serif;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;">
        Agregar foto a ${name} →
      </a>
    </div>

    <div style="border-top:1px solid rgba(0,0,0,0.07);padding-top:20px;">
      <p style="font-family:system-ui,sans-serif;font-size:12px;color:rgba(0,0,0,0.4);line-height:1.6;margin:0;">
        ¿Quieres que te ayudemos con una sesión de fotos profesional?
        El <strong>plan Hero</strong> incluye cobertura audiovisual completa hecha por el equipo del hotel —
        fotos y video listos para usar en Instagram y Google.{' '}
        <a href="https://wa.me/528123816588?text=${encodeURIComponent('Hola, me interesa el plan Hero con sesión de fotos para mi negocio ' + name)}" style="color:#856d47;text-decoration:none;font-weight:600;">Más info por WhatsApp →</a>
      </p>
    </div>
  `);
}

function buildMapaEmail({ email, name, editUrl }: { email: string; name: string; editUrl: string }) {
  return emailShell(`
    <p style="margin:0 0 6px;font-family:system-ui,sans-serif;font-size:13px;color:rgba(0,0,0,0.4);">Hola, ${email.split('@')[0]}</p>
    <h2 style="font-family:Georgia,serif;font-size:22px;font-weight:400;color:#0d221e;margin:0 0 20px;letter-spacing:-0.02em;line-height:1.3;">
      Los turistas preguntan "¿dónde queda?" — ponles el pin
    </h2>
    <p style="font-family:system-ui,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.7;margin:0 0 16px;">
      El directorio de Santiago ya tiene <strong>mapa interactivo</strong>. Los visitantes que hospedan
      en el hotel buscan en el mapa qué hay cerca — y <strong>${name}</strong> todavía no aparece ahí.
    </p>
    <p style="font-family:system-ui,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.7;margin:0 0 28px;">
      Fijar tu ubicación tarda menos de 30 segundos: toca el mapa, coloca tu pin y guarda.
    </p>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${editUrl}" style="display:inline-block;background:#0d221e;color:#faf8f4;text-decoration:none;padding:14px 36px;border-radius:999px;font-family:system-ui,sans-serif;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;">
        Poner ${name} en el mapa →
      </a>
    </div>
  `);
}

function buildCompletarEmail({ email, name, editUrl }: { email: string; name: string; editUrl: string }) {
  return emailShell(`
    <p style="margin:0 0 6px;font-family:system-ui,sans-serif;font-size:13px;color:rgba(0,0,0,0.4);">Hola, ${email.split('@')[0]}</p>
    <h2 style="font-family:Georgia,serif;font-size:22px;font-weight:400;color:#0d221e;margin:0 0 20px;letter-spacing:-0.02em;line-height:1.3;">
      Unos pequeños detalles pueden cambiar todo para ${name}
    </h2>
    <p style="font-family:system-ui,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.7;margin:0 0 28px;">
      Tu anuncio ya está publicado — genial. Ahora solo faltan algunos datos para que aparezca mejor posicionado
      y más turistas lleguen a ti.
    </p>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${editUrl}" style="display:inline-block;background:#0d221e;color:#faf8f4;text-decoration:none;padding:14px 36px;border-radius:999px;font-family:system-ui,sans-serif;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;">
        Mejorar mi anuncio →
      </a>
    </div>
  `);
}
