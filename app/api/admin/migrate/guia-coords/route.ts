/**
 * POST /api/admin/migrate/guia-coords
 * DEPRECATED — migration already applied to production DB.
 */
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Endpoint deprecated — migration already applied.' },
    { status: 410 }
  );
}
