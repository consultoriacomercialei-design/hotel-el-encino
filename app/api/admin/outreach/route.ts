/**
 * GET  /api/admin/outreach  — lista negocios + estado desde Supabase
 * PATCH /api/admin/outreach  — actualiza estado de un negocio
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/app/lib/admin-auth';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL  = process.env.SUPABASE_URL!;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const svcHdrs = {
  'Content-Type': 'application/json',
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
};

// ── Auth guard ────────────────────────────────────────────────────
async function requireAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get('hotel_admin_session')?.value;
  return verifyAdminToken(token);
}

// ── CSV parser (no deps) ──────────────────────────────────────────
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values: string[] = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQ = !inQ; continue; }
      if (c === ',' && !inQ) { values.push(cur); cur = ''; continue; }
      cur += c;
    }
    values.push(cur);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (values[i] ?? '').trim(); });
    return row;
  });
}

function findLatestCSV(): string | null {
  const dir = path.join(process.cwd(), 'scripts');
  try {
    const files = fs.readdirSync(dir)
      .filter(f => f.startsWith('santiago_outreach_') && f.endsWith('_enriched.csv'))
      .sort().reverse();
    return files.length ? path.join(dir, files[0]) : null;
  } catch { return null; }
}

// ── Supabase helpers ──────────────────────────────────────────────
async function sbGet(table: string, qs: string): Promise<Record<string, string>[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${qs}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    cache: 'no-store',
  });
  return res.ok ? res.json() : [];
}

async function sbUpsert(table: string, body: Record<string, unknown>): Promise<boolean> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...svcHdrs, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(body),
  });
  return res.ok;
}

// ── GET ───────────────────────────────────────────────────────────
export async function GET() {
  if (!await requireAdmin())
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const csvPath = findLatestCSV();
  if (!csvPath)
    return NextResponse.json(
      { error: 'CSV no encontrado. Corre scripts/enrich_with_places.py primero.' },
      { status: 404 }
    );

  // Load CSV rows
  const rows = parseCSV(fs.readFileSync(csvPath, 'utf-8'));

  // Load all statuses from Supabase (one call)
  const statuses = await sbGet('outreach_status', 'select=key,estado,notas,converted_listing_id');
  const statusMap: Record<string, { estado: string; notas: string; converted_listing_id: string }> = {};
  for (const s of statuses) {
    statusMap[s.key] = {
      estado: s.estado,
      notas: s.notas ?? '',
      converted_listing_id: s.converted_listing_id ?? '',
    };
  }

  // Merge
  const data = rows.map(r => {
    const key = `${r.nombre}|${r.lat}|${r.lng}`;
    const sb  = statusMap[key];
    return {
      ...r,
      _key: key,
      estado_directorio:    sb?.estado    ?? r.estado_directorio ?? 'pendiente',
      notas:                sb?.notas     ?? r.notas ?? '',
      converted_listing_id: sb?.converted_listing_id ?? '',
    };
  });

  return NextResponse.json({ data, total: data.length, csvFile: path.basename(csvPath) });
}

// ── PATCH ─────────────────────────────────────────────────────────
export async function PATCH(req: Request) {
  if (!await requireAdmin())
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { key, nombre, telefono, estado, notas } =
    await req.json() as { key: string; nombre: string; telefono?: string; estado: string; notas?: string };

  if (!key || !estado)
    return NextResponse.json({ error: 'key y estado son requeridos' }, { status: 400 });

  const ok = await sbUpsert('outreach_status', {
    key,
    nombre:   nombre ?? '',
    telefono: telefono ?? '',
    estado,
    notas:    notas ?? '',
    updated_at: new Date().toISOString(),
  });

  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: 'Error actualizando en Supabase' }, { status: 500 });
}
