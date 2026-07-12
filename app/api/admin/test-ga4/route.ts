import { NextResponse } from 'next/server';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

export async function GET() {
  const email = process.env.GA4_CLIENT_EMAIL;
  const key   = process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const propId = process.env.GA4_PROPERTY_ID;

  if (!email || !key || !propId) {
    return NextResponse.json({ error: 'Env vars faltantes', email: !!email, key: !!key, propId: !!propId });
  }

  try {
    const client = new BetaAnalyticsDataClient({ credentials: { client_email: email, private_key: key } });
    const [res] = await client.runReport({
      property: `properties/${propId}`,
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      metrics: [{ name: 'totalUsers' }],
    });
    return NextResponse.json({ ok: true, users: res.rows?.[0]?.metricValues?.[0]?.value });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) });
  }
}
