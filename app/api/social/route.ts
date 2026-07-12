import { NextResponse } from 'next/server';

// force-dynamic: runs server-side on Vercel where env vars exist.
// The CDN cache (s-maxage=7200) handles the 2h caching — no local pre-render.
export const dynamic = 'force-dynamic';

export async function GET() {
  const stats = {
    facebook: parseInt(process.env.FACEBOOK_FAN_COUNT_FALLBACK ?? '0', 10),
    instagram: parseInt(process.env.INSTAGRAM_FOLLOWERS_FALLBACK ?? '0', 10),
    source: 'fallback' as 'live' | 'fallback',
    lastUpdated: new Date().toISOString(),
  };

  // — Facebook Graph API —
  // Requires: FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in .env.local
  // Get them at: https://developers.facebook.com/
  const fbPageId = process.env.FACEBOOK_PAGE_ID ?? 'hotelencinosantiago';
  const fbAppId = process.env.FACEBOOK_APP_ID;
  const fbAppSecret = process.env.FACEBOOK_APP_SECRET;

  if (fbAppId && fbAppSecret) {
    try {
      const token = `${fbAppId}|${fbAppSecret}`;
      const url = `https://graph.facebook.com/v19.0/${fbPageId}?fields=fan_count,followers_count&access_token=${encodeURIComponent(token)}`;
      const res = await fetch(url, { next: { revalidate: 7200 } });

      if (res.ok) {
        const data = await res.json();
        if (data.followers_count || data.fan_count) {
          stats.facebook = data.followers_count ?? data.fan_count ?? stats.facebook;
          stats.source = 'live';
        }
      }
    } catch {
      // Keep fallback value
    }
  }

  // — Instagram Graph API —
  // Requires the Instagram Business Account linked to your Facebook Page.
  // Set INSTAGRAM_FOLLOWERS_FALLBACK manually until you configure the Graph API.
  // Full setup: https://developers.facebook.com/docs/instagram-api
  const igToken = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN;
  const igAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  if (igToken && igAccountId) {
    try {
      const url = `https://graph.facebook.com/v19.0/${igAccountId}?fields=followers_count&access_token=${encodeURIComponent(igToken)}`;
      const res = await fetch(url, { next: { revalidate: 7200 } });

      if (res.ok) {
        const data = await res.json();
        if (data.followers_count) {
          stats.instagram = data.followers_count;
          stats.source = 'live';
        }
      }
    } catch {
      // Keep fallback value
    }
  }

  return NextResponse.json(stats, {
    headers: {
      'Cache-Control': 'public, s-maxage=7200, stale-while-revalidate=86400',
    },
  });
}
