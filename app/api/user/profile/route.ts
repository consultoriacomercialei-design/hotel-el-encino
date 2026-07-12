/**
 * GET  /api/user/profile  — fetch current user's profile
 * PATCH /api/user/profile — update display_name / avatar_emoji
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sanitizeString } from '@/app/lib/sanitize';
import { rateLimit, getClientIP } from '@/app/lib/rate-limit';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const ANON_KEY     = process.env.SUPABASE_ANON_KEY!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function getUser(token: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const d = await res.json();
  return d?.id ? { id: d.id as string } : null;
}

async function resolveUser() {
  const jar = await cookies();
  const token = jar.get('dir_session')?.value ?? jar.get('guia_session')?.value;
  if (!token) return null;
  return getUser(token);
}

export async function GET() {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${user.id}&select=display_name,avatar_emoji,created_at`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }, cache: 'no-store' }
  );
  const rows = res.ok ? await res.json() : [];
  if (!rows.length) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function PATCH(req: NextRequest) {
  const ip = getClientIP(req);
  if (!rateLimit(`profile:${ip}`, 10, 60_000)) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });

  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  let body: { displayName?: string; avatarEmoji?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

  const updates: Record<string, string> = {};

  if (body.displayName !== undefined) {
    const name = sanitizeString(body.displayName, 30);
    if (name.length < 2) return NextResponse.json({ error: 'Nombre mínimo 2 caracteres' }, { status: 422 });
    if (/[<>"'`;&|\\]/.test(name)) return NextResponse.json({ error: 'Nombre con caracteres inválidos' }, { status: 422 });
    updates.display_name = name;
  }

  if (body.avatarEmoji !== undefined) {
    const emoji = body.avatarEmoji.trim().slice(0, 8);
    updates.avatar_emoji = emoji;
  }

  if (!Object.keys(updates).length) return NextResponse.json({ error: 'Sin campos a actualizar' }, { status: 400 });

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${user.id}`,
    {
      method: 'PATCH',
      headers: {
        apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json', Prefer: 'return=representation',
      },
      body: JSON.stringify(updates),
    }
  );
  if (!res.ok) return NextResponse.json({ error: 'Error al actualizar perfil' }, { status: 500 });
  const rows = await res.json();
  return NextResponse.json(rows[0] ?? {});
}
