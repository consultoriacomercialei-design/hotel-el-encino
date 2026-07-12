import { NextRequest, NextResponse } from 'next/server';
import { recoverGuia } from '@/app/lib/guia-auth';
import { limiters, getClientIP, tooManyRequests, isPayloadTooLarge } from '@/app/lib/rate-limit';

export async function POST(req: NextRequest) {
  if (!limiters.guiaRecover(getClientIP(req))) return tooManyRequests(600);
  if (isPayloadTooLarge(req, 1_000)) return NextResponse.json({ error: 'Payload demasiado grande' }, { status: 413 });

  const body = await req.json().catch(() => ({}));
  const email = typeof body?.email === 'string' ? body.email.trim().slice(0, 254) : '';
  if (!email) return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
  await recoverGuia(email);
  // Always return ok to avoid user enumeration
  return NextResponse.json({ ok: true });
}
