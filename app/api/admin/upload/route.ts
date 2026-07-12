import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/app/lib/admin-auth';

const SUPABASE_URL   = process.env.SUPABASE_URL!;
const SERVICE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET         = 'email-assets';

export async function POST(req: NextRequest) {
  // Auth
  const cookieStore = await cookies();
  const session = cookieStore.get('hotel_admin_session')?.value;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ok = await verifyAdminToken(session);
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const buf  = Buffer.from(await file.arrayBuffer());

    const res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${name}`,
      {
        method: 'POST',
        headers: {
          'apikey':         SERVICE_KEY,
          'Authorization':  `Bearer ${SERVICE_KEY}`,
          'Content-Type':   file.type || 'application/octet-stream',
          'x-upsert':       'false',
        },
        body: buf,
      }
    );

    if (!res.ok) {
      const txt = await res.text();
      console.error('[upload] Supabase Storage error:', txt);
      // If bucket doesn't exist yet, try to create it first
      if (res.status === 404 || txt.includes('not found')) {
        await createBucketIfNeeded();
        // retry once
        const res2 = await fetch(
          `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${name}`,
          {
            method: 'POST',
            headers: {
              'apikey':         SERVICE_KEY,
              'Authorization':  `Bearer ${SERVICE_KEY}`,
              'Content-Type':   file.type || 'application/octet-stream',
              'x-upsert':       'false',
            },
            body: buf,
          }
        );
        if (!res2.ok) {
          return NextResponse.json({ error: 'Error al subir imagen' }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: 'Error al subir imagen' }, { status: 500 });
      }
    }

    // Build public URL (Supabase Storage public bucket URL)
    const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${name}`;
    return NextResponse.json({ url });
  } catch (e) {
    console.error('[upload] Error:', e);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

async function createBucketIfNeeded() {
  try {
    await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        'apikey':         SERVICE_KEY,
        'Authorization':  `Bearer ${SERVICE_KEY}`,
        'Content-Type':   'application/json',
      },
      body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
    });
  } catch { /* ignore if already exists */ }
}
