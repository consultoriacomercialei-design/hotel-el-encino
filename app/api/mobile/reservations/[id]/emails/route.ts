import { NextRequest, NextResponse } from 'next/server';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import { supabaseGet } from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/mobile/reservations/[id]/emails — b13: historial de comunicaciones
// enviadas al huésped, con estado de entrega/apertura (webhooks de Resend en
// email_log). Responde la pregunta "¿le llegó el aviso del cambio?".
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const rows = await supabaseGet<Record<string, unknown>>('email_log', {
    select: 'id,email_type,recipient_email,subject,sent_at,delivered_at,opened_at,clicked_at,bounced_at',
    reservation_id: `eq.${id}`,
    order: 'sent_at.desc',
    limit: '50',
  }).catch(() => [] as Record<string, unknown>[]);

  return NextResponse.json({ success: true, data: { emails: rows } });
}
