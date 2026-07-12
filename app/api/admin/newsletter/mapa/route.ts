import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/app/lib/admin-auth';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const RESEND_KEY   = process.env.RESEND_API_KEY!;
const FROM         = 'Hotel El Encino <reservaciones@hotelelencino.com>';

/**
 * POST /api/admin/newsletter/mapa
 *
 * Sends a one-time newsletter to all registered guia users announcing
 * the map feature. Call from browser console while logged in as admin:
 *   fetch('/api/admin/newsletter/mapa',{method:'POST'}).then(r=>r.json()).then(console.log)
 */
export async function POST() {
  const cookieStore = await cookies();
  if (!verifyAdminToken(cookieStore.get('hotel_admin_session')?.value)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // 1. Fetch all auth users via Supabase Admin API
  let users: Array<{ id: string; email: string }> = [];
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    });
    if (res.ok) {
      const body = await res.json();
      // Supabase returns { users: [...] }
      const raw: Array<{ id: string; email?: string }> = body.users ?? body;
      users = raw.filter(u => u.email).map(u => ({ id: u.id, email: u.email! }));
    }
  } catch (e) {
    console.error('[newsletter/mapa] failed to fetch users', e);
  }

  if (users.length === 0) {
    return NextResponse.json({ ok: false, error: 'No se pudo obtener la lista de usuarios' }, { status: 500 });
  }

  // 2. Fetch all listings to include the listing link in the email
  let listingsByOwner: Record<string, { id: string; name: string; lat: number | null; lng: number | null }[]> = {};
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/guia_listings?select=id,name,owner_id,lat,lng&limit=1000`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );
    if (res.ok) {
      const rows: Array<{ id: string; name: string; owner_id: string; lat: number | null; lng: number | null }> = await res.json();
      for (const r of rows) {
        if (!listingsByOwner[r.owner_id]) listingsByOwner[r.owner_id] = [];
        listingsByOwner[r.owner_id].push({ id: r.id, name: r.name, lat: r.lat, lng: r.lng });
      }
    }
  } catch { /* send to all users even if listings lookup fails */ }

  // 3. Send emails
  let sent = 0;
  let errors = 0;
  const DEFAULT_LAT = 25.4219;
  const DEFAULT_LNG = -100.1573;

  for (const user of users) {
    const myListings = listingsByOwner[user.id] ?? [];
    // Find first listing that needs coords
    const needsMap = myListings.find(l =>
      !l.lat || !l.lng ||
      (Math.abs(l.lat - DEFAULT_LAT) < 0.001 && Math.abs(l.lng - DEFAULT_LNG) < 0.001)
    );
    const ctaId     = needsMap?.id ?? myListings[0]?.id;
    const ctaName   = needsMap?.name ?? myListings[0]?.name ?? 'tu negocio';
    const ctaUrl    = ctaId
      ? `https://hotelelencino.com/mi-negocio/listing/${ctaId}?openMap=true`
      : 'https://hotelelencino.com/mi-negocio';

    const html = buildNewsletterHtml({ email: user.email, ctaName, ctaUrl, hasListing: myListings.length > 0 });

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM,
          to: [user.email],
          subject: '📍 Ya puedes poner tu negocio en el mapa de Santiago',
          html,
        }),
      });
      if (res.ok) sent++;
      else { errors++; console.error('[newsletter] failed for', user.email, res.status, await res.text()); }
    } catch (e) {
      errors++;
      console.error('[newsletter] exception for', user.email, e);
    }

    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 120));
  }

  return NextResponse.json({ ok: true, total: users.length, sent, errors });
}

function buildNewsletterHtml({ email, ctaName, ctaUrl, hasListing }: {
  email: string;
  ctaName: string;
  ctaUrl: string;
  hasListing: boolean;
}) {
  const bodyAction = hasListing
    ? `<p style="margin:0 0 20px;line-height:1.7;">Ahora puedes <strong>fijar la ubicación exacta de ${ctaName} en el mapa</strong> con un toque — y aparecer cuando los turistas buscan dónde ir en Santiago.</p>
       <p style="margin:0 0 28px;line-height:1.7;">Solo entra a tu panel, toca <em>"Fijar en mapa"</em> y coloca tu pin. Tarda menos de 30 segundos.</p>`
    : `<p style="margin:0 0 20px;line-height:1.7;">Tenemos una novedad: el directorio de Santiago ahora tiene <strong>mapa interactivo</strong>. Los turistas pueden ver exactamente dónde están los negocios y llegar sin perderse.</p>
       <p style="margin:0 0 28px;line-height:1.7;"><strong>¿Tienes un negocio en Santiago?</strong> Regístralo gratis en el directorio y aparece en el mapa.</p>`;

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- Header -->
        <tr><td style="background:#0d221e;border-radius:18px 18px 0 0;padding:36px 40px 28px;text-align:center;">
          <p style="margin:0 0 8px;font-family:system-ui,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#856d47;">Hotel El Encino · Santiago N.L.</p>
          <h1 style="margin:0;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#faf8f4;letter-spacing:-0.02em;">El mapa del directorio</h1>
        </td></tr>

        <!-- Map visual -->
        <tr><td style="background:#0d221e;padding:0 40px 36px;text-align:center;">
          <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:14px;padding:28px;display:inline-block;">
            <div style="font-size:40px;margin-bottom:10px;">📍</div>
            <p style="margin:0;font-family:system-ui,sans-serif;font-size:13px;color:rgba(250,248,244,0.65);line-height:1.5;">Santiago, Nuevo León<br>ya tiene mapa interactivo</p>
          </div>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#fff;padding:40px 40px 32px;">
          <p style="margin:0 0 20px;font-family:system-ui,sans-serif;font-size:13px;color:rgba(0,0,0,0.4);letter-spacing:0.06em;">Hola, ${email.split('@')[0]}</p>
          <div style="font-family:system-ui,sans-serif;font-size:15px;color:#1a1a1a;">
            ${bodyAction}
          </div>

          <!-- CTA -->
          <div style="text-align:center;margin:8px 0 32px;">
            <a href="${ctaUrl}"
               style="display:inline-block;background:#0d221e;color:#faf8f4;text-decoration:none;padding:14px 32px;border-radius:999px;font-family:system-ui,sans-serif;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;">
              ${hasListing ? 'Poner en el mapa →' : 'Registrar mi negocio →'}
            </a>
          </div>

          <!-- Plan reminder -->
          <div style="background:#f9f8f5;border-radius:14px;padding:24px 28px;margin-bottom:0;">
            <p style="margin:0 0 12px;font-family:system-ui,sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#856d47;">¿Quieres destacar más?</p>
            <div style="display:flex;gap:12px;flex-wrap:wrap;">
              <div style="flex:1;min-width:140px;">
                <p style="margin:0 0 4px;font-family:Georgia,serif;font-size:16px;color:#040404;">Gratuito</p>
                <p style="margin:0;font-family:system-ui,sans-serif;font-size:12px;color:rgba(0,0,0,0.5);line-height:1.5;">1 foto · aparece en directorio y mapa</p>
              </div>
              <div style="flex:1;min-width:140px;border-left:2px solid #856d47;padding-left:16px;">
                <p style="margin:0 0 4px;font-family:Georgia,serif;font-size:16px;color:#040404;">Destacado <span style="font-size:13px;color:#856d47;">$200/mes</span></p>
                <p style="margin:0;font-family:system-ui,sans-serif;font-size:12px;color:rgba(0,0,0,0.5);line-height:1.5;">Badge · posición preferencial · hasta 3 fotos · redes sociales</p>
              </div>
            </div>
            <p style="margin:16px 0 0;font-family:system-ui,sans-serif;font-size:12px;color:rgba(0,0,0,0.45);">
              Para contratar el plan Destacado, escríbenos por <a href="https://wa.me/528123816588?text=Hola%2C%20quiero%20contratar%20el%20plan%20Destacado%20para%20mi%20anuncio" style="color:#856d47;text-decoration:none;">WhatsApp</a>.
            </p>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f0eee9;border-radius:0 0 18px 18px;padding:24px 40px;text-align:center;">
          <p style="margin:0 0 4px;font-family:system-ui,sans-serif;font-size:11px;color:rgba(0,0,0,0.4);">Hotel El Encino · Matamoros 106, Santiago N.L.</p>
          <p style="margin:0;font-family:system-ui,sans-serif;font-size:11px;color:rgba(0,0,0,0.35);">
            Recibiste este correo porque creaste una cuenta en el directorio de Santiago.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
