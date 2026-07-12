import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const hdr = () => ({
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
});

async function authCheck() {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session')?.value
    ?? cookieStore.get('hotel_admin_session')?.value;
  return !!session;
}

/* ── GET — list subscribers / lists ────────────────────────── */
export async function GET(req: NextRequest) {
  if (!await authCheck()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const kind = searchParams.get('kind') ?? 'subscribers'; // subscribers | lists | list-members

  if (kind === 'subscribers') {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/newsletter_subscribers?order=subscribed_at.desc&limit=500`,
      { headers: hdr() }
    );
    const data = res.ok ? await res.json() : [];
    return NextResponse.json(data);
  }

  if (kind === 'lists') {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/contact_lists?order=created_at.desc&limit=200`,
      { headers: hdr() }
    );
    const data = res.ok ? await res.json() : [];
    return NextResponse.json(data);
  }

  if (kind === 'list-members') {
    const listId = searchParams.get('list_id');
    if (!listId) return NextResponse.json([], { status: 400 });
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/contact_list_members?list_id=eq.${listId}&order=created_at.asc&limit=1000`,
      { headers: hdr() }
    );
    const data = res.ok ? await res.json() : [];
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
}

/* ── POST — create subscriber, list, or add member ─────────── */
export async function POST(req: NextRequest) {
  if (!await authCheck()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  if (action === 'add-subscriber') {
    const { email, name } = body;
    if (!email?.includes('@')) return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    const res = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_subscribers`, {
      method: 'POST',
      headers: hdr(),
      body: JSON.stringify({ email: email.trim().toLowerCase(), name: name ?? null }),
    });
    if (!res.ok) {
      const txt = await res.text();
      if (txt.includes('duplicate') || txt.includes('unique')) {
        return NextResponse.json({ error: 'Email ya registrado' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Error al guardar' }, { status: 500 });
    }
    const data = await res.json();
    return NextResponse.json(data?.[0] ?? {});
  }

  if (action === 'import-subscribers') {
    // bulk import: body.rows = [{ email, name }]
    const { rows } = body as { rows: { email: string; name?: string }[] };
    if (!Array.isArray(rows)) return NextResponse.json({ error: 'rows required' }, { status: 400 });
    const clean = rows
      .filter(r => r.email?.includes('@'))
      .map(r => ({ email: r.email.trim().toLowerCase(), name: r.name ?? null, source: 'import' }));
    if (!clean.length) return NextResponse.json({ imported: 0 });
    const res = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_subscribers`, {
      method: 'POST',
      headers: { ...hdr(), Prefer: 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify(clean),
    });
    const data = res.ok ? await res.json() : [];
    return NextResponse.json({ imported: Array.isArray(data) ? data.length : 0 });
  }

  if (action === 'create-list') {
    const { name, description } = body;
    if (!name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
    const res = await fetch(`${SUPABASE_URL}/rest/v1/contact_lists`, {
      method: 'POST',
      headers: hdr(),
      body: JSON.stringify({ name: name.trim(), description: description ?? null }),
    });
    const data = res.ok ? await res.json() : null;
    return NextResponse.json(data?.[0] ?? {});
  }

  if (action === 'add-to-list') {
    const { list_id, email, name, source_type, source_id } = body;
    if (!list_id || !email) return NextResponse.json({ error: 'list_id + email required' }, { status: 400 });
    const res = await fetch(`${SUPABASE_URL}/rest/v1/contact_list_members`, {
      method: 'POST',
      headers: { ...hdr(), Prefer: 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify({ list_id, email, name, source_type, source_id }),
    });
    const data = res.ok ? await res.json() : null;
    return NextResponse.json(data?.[0] ?? {});
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

/* ── PATCH — update subscriber status ──────────────────────── */
export async function PATCH(req: NextRequest) {
  if (!await authCheck()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, ...fields } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const res = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_subscribers?id=eq.${id}`, {
    method: 'PATCH',
    headers: hdr(),
    body: JSON.stringify(fields),
  });
  return NextResponse.json({ ok: res.ok });
}

/* ── DELETE — remove subscriber or list ────────────────────── */
export async function DELETE(req: NextRequest) {
  if (!await authCheck()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { kind, id } = await req.json();

  if (kind === 'subscriber') {
    await fetch(`${SUPABASE_URL}/rest/v1/newsletter_subscribers?id=eq.${id}`, {
      method: 'DELETE', headers: hdr(),
    });
    return NextResponse.json({ ok: true });
  }

  if (kind === 'list') {
    await fetch(`${SUPABASE_URL}/rest/v1/contact_lists?id=eq.${id}`, {
      method: 'DELETE', headers: hdr(),
    });
    return NextResponse.json({ ok: true });
  }

  if (kind === 'list-member') {
    await fetch(`${SUPABASE_URL}/rest/v1/contact_list_members?id=eq.${id}`, {
      method: 'DELETE', headers: hdr(),
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
}
