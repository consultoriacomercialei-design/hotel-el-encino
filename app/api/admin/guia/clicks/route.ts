import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const hdr = () => ({
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
});

export interface ClickRow {
  slug:      string;
  name:      string;
  tier:      string;
  category:  string;
  total:     number;
  last30:    number;
  last7:     number;
  prev7:     number;   // clicks 8d–14d ago (for trend comparison)
  trend:     'up' | 'down' | 'flat';
}

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session')?.value
    ?? cookieStore.get('hotel_admin_session')?.value;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch raw clicks
  const allRes = await fetch(
    `${SUPABASE_URL}/rest/v1/listing_clicks?select=slug,clicked_at`,
    { headers: hdr() }
  );
  if (!allRes.ok) return NextResponse.json({ error: 'DB error' }, { status: 500 });
  const all = (await allRes.json()) as Array<{ slug: string; clicked_at: string }>;

  // Fetch listing metadata (name, tier, category)
  const metaRes = await fetch(
    `${SUPABASE_URL}/rest/v1/guia_listings?select=slug,name,tier,category&limit=500`,
    { headers: hdr() }
  );
  const metaRows: Array<{ slug: string; name: string; tier: string; category: string }> =
    metaRes.ok ? await metaRes.json() : [];
  const meta = Object.fromEntries(metaRows.map(m => [m.slug, m]));

  const now    = Date.now();
  const ms7    = 7  * 24 * 60 * 60 * 1000;
  const ms14   = 14 * 24 * 60 * 60 * 1000;
  const ms30   = 30 * 24 * 60 * 60 * 1000;
  const day7   = now - ms7;
  const day14  = now - ms14;
  const day30  = now - ms30;

  const counts: Record<string, { total: number; last7: number; prev7: number; last30: number }> = {};

  for (const row of all) {
    if (!counts[row.slug]) counts[row.slug] = { total: 0, last7: 0, prev7: 0, last30: 0 };
    const t = new Date(row.clicked_at).getTime();
    counts[row.slug].total++;
    if (t >= day30) counts[row.slug].last30++;
    if (t >= day7)  counts[row.slug].last7++;
    if (t >= day14 && t < day7) counts[row.slug].prev7++;
  }

  const ranking: ClickRow[] = Object.entries(counts)
    .map(([slug, s]) => {
      const trend: ClickRow['trend'] =
        s.last7 > s.prev7 + 1 ? 'up' :
        s.prev7 > s.last7 + 1 ? 'down' : 'flat';
      return {
        slug,
        name:     meta[slug]?.name     ?? slug,
        tier:     meta[slug]?.tier     ?? 'free',
        category: meta[slug]?.category ?? '',
        ...s,
        trend,
      };
    })
    .sort((a, b) => b.last30 - a.last30);

  return NextResponse.json(ranking);
}
