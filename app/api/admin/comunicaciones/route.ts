import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/app/lib/admin-auth';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const RESEND_KEY   = process.env.RESEND_API_KEY!;
const FROM         = 'Hotel El Encino <reservaciones@hotelelencino.com>';

const DEFAULT_LAT = 25.4219;
const DEFAULT_LNG = -100.1573;

function hasRealCoords(lat: number | null, lng: number | null) {
  if (!lat || !lng) return false;
  return !(Math.abs(lat - DEFAULT_LAT) < 0.001 && Math.abs(lng - DEFAULT_LNG) < 0.001);
}

type Segment = 'all' | 'no_foto' | 'no_mapa' | 'free' | 'featured' | 'hero' | 'custom';

interface ReqBody {
  segment: Segment;
  customEmails?: string[];
  subject: string;
  html: string;
  preview?: boolean; // if true, return recipients list without sending
}

/**
 * GET /api/admin/comunicaciones
 *
 * Returns real segment counts (server-side, cross-referenced with Auth users).
 * { counts: { all, no_foto, no_mapa, free, featured, hero } }
 */
export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  if (!verifyAdminToken(cookieStore.get('hotel_admin_session')?.value)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  void req;

  let allUsers: Array<{ id: string; email: string }> = [];
  const usersRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (usersRes.ok) {
    const body = await usersRes.json();
    const raw: Array<{ id: string; email?: string }> = body.users ?? body;
    allUsers = raw.filter(u => u.email).map(u => ({ id: u.id, email: u.email! }));
  }

  const listRes = await fetch(
    `${SUPABASE_URL}/rest/v1/guia_listings?select=owner_id,tier,src,lat,lng&limit=1000`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  const listings: Array<{ owner_id: string; tier: string; src: string | null; lat: number | null; lng: number | null }> =
    listRes.ok ? await listRes.json() : [];

  const userEmailMap = new Map(allUsers.map(u => [u.id, u.email]));

  function countSegment(filter: (l: typeof listings[number]) => boolean): number {
    const ids = new Set(listings.filter(filter).map(l => l.owner_id));
    return allUsers.filter(u => ids.has(u.id)).length;
  }

  return NextResponse.json({
    counts: {
      all:      userEmailMap.size,
      no_foto:  countSegment(l => !l.src),
      no_mapa:  countSegment(l => !hasRealCoords(l.lat, l.lng)),
      free:     countSegment(l => l.tier === 'free'),
      featured: countSegment(l => l.tier === 'featured'),
      hero:     countSegment(l => l.tier === 'hero'),
    },
  });
}

/**
 * POST /api/admin/comunicaciones
 *
 * Flexible email sender for the admin communications console.
 * Body: { segment, customEmails?, subject, html, preview? }
 *
 * preview: true → returns { recipients: string[], count: number } without sending
 * preview: false → sends emails and returns { sent, errors, total }
 */
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (!verifyAdminToken(cookieStore.get('hotel_admin_session')?.value)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await req.json() as ReqBody;
  const { segment, customEmails = [], subject, html, preview = false } = body;

  if (!subject?.trim()) return NextResponse.json({ error: 'Asunto requerido' }, { status: 400 });
  if (!html?.trim())    return NextResponse.json({ error: 'Contenido requerido' }, { status: 400 });

  // ── Resolve recipients ──────────────────────────────────────────────────

  let emails: string[] = [];

  if (segment === 'custom') {
    emails = customEmails.map(e => e.trim()).filter(e => e.includes('@'));
  } else {
    // Fetch all auth users
    let allUsers: Array<{ id: string; email: string }> = [];
    const usersRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    if (usersRes.ok) {
      const body = await usersRes.json();
      const raw: Array<{ id: string; email?: string }> = body.users ?? body;
      allUsers = raw.filter(u => u.email).map(u => ({ id: u.id, email: u.email! }));
    }

    if (segment === 'all') {
      emails = allUsers.map(u => u.email);
    } else {
      // Need listing data to filter
      const listRes = await fetch(
        `${SUPABASE_URL}/rest/v1/guia_listings?select=owner_id,tier,src,lat,lng&limit=1000`,
        { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
      );
      const listings: Array<{ owner_id: string; tier: string; src: string | null; lat: number | null; lng: number | null }> =
        listRes.ok ? await listRes.json() : [];

      const ownerIds = new Set<string>();

      for (const l of listings) {
        const include =
          (segment === 'no_foto' && !l.src) ||
          (segment === 'no_mapa' && !hasRealCoords(l.lat, l.lng)) ||
          (segment === 'free'     && l.tier === 'free') ||
          (segment === 'featured' && l.tier === 'featured') ||
          (segment === 'hero'     && l.tier === 'hero');
        if (include) ownerIds.add(l.owner_id);
      }

      emails = allUsers
        .filter(u => ownerIds.has(u.id))
        .map(u => u.email);
    }
  }

  // Deduplicate
  emails = [...new Set(emails)];

  if (preview) {
    return NextResponse.json({ preview: true, count: emails.length, recipients: emails.slice(0, 20) });
  }

  if (emails.length === 0) {
    return NextResponse.json({ ok: false, error: 'No hay destinatarios para este segmento' }, { status: 400 });
  }

  // ── Send ────────────────────────────────────────────────────────────────

  let sent = 0;
  let errors = 0;

  for (const email of emails) {
    // Personalize {{nombre}} placeholder
    const nombre = email.split('@')[0];
    const personalizedHtml = html.replace(/\{\{nombre\}\}/g, nombre);

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: FROM, to: [email], subject, html: personalizedHtml }),
      });
      if (res.ok) sent++;
      else { errors++; console.error('[comunicaciones] failed', email, res.status); }
    } catch { errors++; }

    await new Promise(r => setTimeout(r, 120));
  }

  return NextResponse.json({ ok: true, total: emails.length, sent, errors });
}
