/**
 * GA4 Data API helper — server-side only.
 * Requires service account credentials in env vars.
 */
import { BetaAnalyticsDataClient } from '@google-analytics/data';

function getClient() {
  const email = process.env.GA4_CLIENT_EMAIL;
  const key   = process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !key) return null;
  return new BetaAnalyticsDataClient({ credentials: { client_email: email, private_key: key } });
}

const PROPERTY = () => `properties/${process.env.GA4_PROPERTY_ID}`;

export interface GA4Overview {
  users30d:             number;
  sessions30d:          number;
  pageViews30d:         number;
  users7d:              number;
  sessions7d:           number;
  bounceRate:           number;
  avgSessionDuration:   number;
  beginCheckouts:       number;
  purchases:            number;
  searches:             number;
  topPages:             Array<{ path: string; views: number }>;
  topSources:           Array<{ source: string; sessions: number }>;
  dailyUsers:           Array<{ date: string; users: number; sessions: number }>;
  deviceBreakdown:      Array<{ device: string; users: number }>;
  topCountries:         Array<{ country: string; users: number }>;
}

export async function fetchGA4Overview(): Promise<GA4Overview | null> {
  const client = getClient();
  if (!client || !process.env.GA4_PROPERTY_ID) return null;

  try {
    const property = PROPERTY();

    // Overview: users, sessions, pageviews, bounce rate, avg session duration
    const [overviewRes] = await client.runReport({
      property,
      dateRanges: [
        { startDate: '30daysAgo', endDate: 'today', name: '30d' },
        { startDate: '7daysAgo',  endDate: 'today', name: '7d'  },
      ],
      metrics: [
        { name: 'totalUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
      ],
    });

    const get = (dateRange: string, metricIndex: number) => {
      const row = overviewRes.rows?.find(r => r.dimensionValues?.[0]?.value === dateRange);
      return Number(row?.metricValues?.[metricIndex]?.value ?? 0);
    };

    // Key events
    const [eventsRes] = await client.runReport({
      property,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'eventName' }],
      metrics:    [{ name: 'eventCount' }],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          inListFilter: { values: ['begin_checkout', 'purchase', 'search'] },
        },
      },
    });

    const eventCount = (name: string) =>
      Number(eventsRes.rows?.find(r => r.dimensionValues?.[0]?.value === name)?.metricValues?.[0]?.value ?? 0);

    // Daily users (last 30 days) for line chart
    const [dailyRes] = await client.runReport({
      property,
      dateRanges: [{ startDate: '29daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'date' }],
      metrics:    [{ name: 'totalUsers' }, { name: 'sessions' }],
      orderBys:   [{ dimension: { dimensionName: 'date' } }],
    });

    // Device breakdown
    const [devicesRes] = await client.runReport({
      property,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'deviceCategory' }],
      metrics:    [{ name: 'totalUsers' }],
      orderBys:   [{ metric: { metricName: 'totalUsers' }, desc: true }],
    });

    // Top pages
    const [pagesRes] = await client.runReport({
      property,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }],
      metrics:    [{ name: 'screenPageViews' }],
      orderBys:   [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 6,
    });

    // Top traffic sources
    const [sourcesRes] = await client.runReport({
      property,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics:    [{ name: 'sessions' }],
      orderBys:   [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 6,
    });

    // Top countries
    const [countriesRes] = await client.runReport({
      property,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'country' }],
      metrics:    [{ name: 'totalUsers' }],
      orderBys:   [{ metric: { metricName: 'totalUsers' }, desc: true }],
      limit: 6,
    });

    return {
      users30d:           get('30d', 0),
      sessions30d:        get('30d', 1),
      pageViews30d:       get('30d', 2),
      bounceRate:         Math.round(get('30d', 3) * 100),
      avgSessionDuration: Math.round(get('30d', 4)),
      users7d:            get('7d',  0),
      sessions7d:         get('7d',  1),
      beginCheckouts:     eventCount('begin_checkout'),
      purchases:          eventCount('purchase'),
      searches:           eventCount('search'),
      dailyUsers: (dailyRes.rows ?? []).map(r => {
        const raw = r.dimensionValues?.[0]?.value ?? '';
        // Format YYYYMMDD → YYYY-MM-DD
        const date = raw.length === 8
          ? `${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}`
          : raw;
        return {
          date,
          users:    Number(r.metricValues?.[0]?.value ?? 0),
          sessions: Number(r.metricValues?.[1]?.value ?? 0),
        };
      }),
      deviceBreakdown: (devicesRes.rows ?? []).map(r => ({
        device: r.dimensionValues?.[0]?.value ?? 'other',
        users:  Number(r.metricValues?.[0]?.value ?? 0),
      })),
      topPages: (pagesRes.rows ?? []).map(r => ({
        path:  r.dimensionValues?.[0]?.value ?? '/',
        views: Number(r.metricValues?.[0]?.value ?? 0),
      })),
      topSources: (sourcesRes.rows ?? []).map(r => ({
        source:   r.dimensionValues?.[0]?.value ?? 'Direct',
        sessions: Number(r.metricValues?.[0]?.value ?? 0),
      })),
      topCountries: (countriesRes.rows ?? []).map(r => ({
        country: r.dimensionValues?.[0]?.value ?? '—',
        users:   Number(r.metricValues?.[0]?.value ?? 0),
      })),
    };
  } catch {
    return null;
  }
}
