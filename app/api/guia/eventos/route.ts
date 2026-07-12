import { NextRequest, NextResponse } from 'next/server';
import { moderateText } from '@/app/lib/moderation';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET       = 'eventos';
const MAX_BYTES    = 2 * 1024 * 1024; // 2 MB

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();

    const title          = (form.get('title')           as string | null)?.trim() ?? '';
    const category       = (form.get('category')        as string | null)?.trim() ?? 'comunidad';
    const start_date     = (form.get('start_date')      as string | null)?.trim() ?? '';
    const end_date       = (form.get('end_date')        as string | null)?.trim() ?? start_date;
    const time_start     = (form.get('time_start')      as string | null)?.trim() ?? '';
    const location       = (form.get('location')        as string | null)?.trim() ?? '';
    const short_desc     = (form.get('short_desc')      as string | null)?.trim() ?? '';
    const price          = (form.get('price')           as string | null)?.trim() || 'Entrada libre';
    const organizer_name = (form.get('organizer_name')  as string | null)?.trim() ?? '';
    const organizer_phone= (form.get('organizer_phone') as string | null)?.trim() ?? '';
    const photo          = form.get('photo') as File | null;

    // Required fields
    if (!title || !start_date || !location || !short_desc) {
      return NextResponse.json({ error: 'Faltan campos obligatorios.' }, { status: 400 });
    }

    // Moderation
    const modErr = moderateText({ title, location, short_desc, organizer_name, price });
    if (modErr) return NextResponse.json({ error: modErr }, { status: 422 });

    // Validate dates
    const today = new Date(); today.setHours(0,0,0,0);
    const eventDate = new Date(start_date + 'T00:00:00');
    if (eventDate < today) {
      return NextResponse.json({ error: 'La fecha del evento no puede ser en el pasado.' }, { status: 400 });
    }

    // Photo upload
    let photo_url: string | null = null;
    if (photo && photo.size > 0) {
      if (photo.size > MAX_BYTES) {
        return NextResponse.json({ error: 'La foto es demasiado grande (máx 2 MB). Comprime la imagen antes de subirla.' }, { status: 400 });
      }
      if (!photo.type.startsWith('image/')) {
        return NextResponse.json({ error: 'Solo se aceptan archivos de imagen.' }, { status: 400 });
      }

      const ext = photo.type === 'image/webp' ? 'webp' : photo.type === 'image/png' ? 'png' : 'jpg';
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
      const storageRes = await fetch(
        `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filename}`,
        {
          method: 'POST',
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            'Content-Type': photo.type,
            'x-upsert': 'true',
          },
          body: await photo.arrayBuffer(),
        }
      );
      if (!storageRes.ok) {
        const err = await storageRes.text();
        console.error('[eventos] storage upload error:', err);
        // If it's a bucket-not-found error, give a helpful message
        if (err.includes('Bucket not found') || err.includes('bucket')) {
          return NextResponse.json(
            { error: 'Configuración pendiente: el bucket "eventos" no existe en Supabase Storage. Créalo en Storage → New bucket → "eventos" (público).' },
            { status: 503 }
          );
        }
        return NextResponse.json({ error: 'Error al subir la foto. Intenta de nuevo.' }, { status: 500 });
      }
      photo_url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;
    }

    // Insert event
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/guia_events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        title, category, start_date, end_date,
        time_start: time_start || null,
        location, short_desc, price,
        photo_url,
        organizer_name: organizer_name || null,
        organizer_phone: organizer_phone || null,
        status: 'active',
      }),
    });

    if (!insertRes.ok) {
      console.error('[eventos] insert error:', await insertRes.text());
      return NextResponse.json({ error: 'Error al guardar el evento. Intenta de nuevo.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[eventos] unexpected error:', e);
    return NextResponse.json({ error: 'Error inesperado.' }, { status: 500 });
  }
}

// Fetch upcoming active events from DB (for page.tsx)
export async function GET() {
  if (!SUPABASE_URL || !SERVICE_KEY) return NextResponse.json([]);
  const today = new Date().toISOString().slice(0, 10);
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/guia_events?status=eq.active&end_date=gte.${today}&order=start_date.asc&limit=50`,
    {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Cache-Control': 'no-store',
      },
    }
  );
  if (!res.ok) return NextResponse.json([]);
  return NextResponse.json(await res.json());
}
