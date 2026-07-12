/**
 * GET /api/health
 * Monitor endpoint for external health checks.
 * Requires header: X-Monitor-Secret matching MONITOR_SECRET env var.
 * Returns JSON with: supabase, stuck reservations, GA4 last 24h traffic.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseGet } from '@/app/lib/supabase';
import { fetchGA4Overview } from '@/app/lib/ga4';

const MONITOR_SECRET = process.env.MONITOR_SECRET;

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-monitor-secret');
  if (!MONITOR_SECRET || secret !== MONITOR_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const cutoff3h  = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
  const cutoff90m = new Date(now.getTime() - 90 * 60 * 1000).toISOString();

  // Pending efectivo > 3h sin confirmar
  const pendingStuck = await supabaseGet<{ folio: string; guest_name: string; created_at: string }>(
    'reservations',
    {
      select: 'folio,guest_name,created_at',
      status: 'eq.pending',
      created_at: `lt.${cutoff3h}`,
      order: 'created_at.asc',
    }
  );

  // Pago MP abandonado > 90min
  const mpStuck = await supabaseGet<{ folio: string; guest_name: string; created_at: string }>(
    'reservations',
    {
      select: 'folio,guest_name,created_at',
      status: 'eq.pending_payment',
      created_at: `lt.${cutoff90m}`,
      order: 'created_at.asc',
    }
  );

  // GA4 últimas 24h
  let ga4: { users: number; sessions: number; byChannel: unknown[] } | null = null;
  try {
    const overview = await fetchGA4Overview();
    if (overview) {
      ga4 = {
        users:     overview.users7d,    // 7d rolling, best we have quickly
        sessions:  overview.sessions7d,
        byChannel: overview.topSources.slice(0, 5),
      };
    }
  } catch {
    ga4 = null;
  }

  return NextResponse.json({
    ok: true,
    timestamp: now.toISOString(),
    supabase_connected: true,
    pending_stuck: pendingStuck,
    mp_stuck: mpStuck,
    ga4,
  });
}
