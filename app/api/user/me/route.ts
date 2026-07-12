/**
 * GET /api/user/me
 * Returns current public-user context (reads dir_session cookie).
 * Also checks if the user is a guia advertiser (guia_session cookie or same user_id in guia_listings).
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const ANON_KEY     = process.env.SUPABASE_ANON_KEY!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function getUserFromToken(token: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const d = await res.json();
  return d?.id ? { id: d.id as string, email: d.email as string } : null;
}

export async function GET(_req: NextRequest) {
  const jar = await cookies();
  const dirToken  = jar.get('dir_session')?.value;
  const guiaToken = jar.get('guia_session')?.value;

  // Try dir_session first, then guia_session
  let user: { id: string; email: string } | null = null;
  let sessionSource: 'dir' | 'guia' | null = null;

  if (dirToken)  { user = await getUserFromToken(dirToken);  if (user) sessionSource = 'dir'; }
  if (!user && guiaToken) { user = await getUserFromToken(guiaToken); if (user) sessionSource = 'guia'; }

  if (!user) return NextResponse.json({ loggedIn: false });

  // Fetch profile + advertiser status in parallel
  const [profileRes, listingRes] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${user.id}&select=display_name,avatar_emoji`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      cache: 'no-store',
    }),
    fetch(`${SUPABASE_URL}/rest/v1/guia_listings?owner_id=eq.${user.id}&select=slug,name&status=eq.active&limit=1`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      cache: 'no-store',
    }),
  ]);

  const profiles  = profileRes.ok  ? await profileRes.json()  : [];
  const listings  = listingRes.ok  ? await listingRes.json()  : [];

  const profile     = profiles[0] ?? null;
  const isAdvertiser = listings.length > 0;
  const advertiserSlug = listings[0]?.slug ?? null;

  return NextResponse.json({
    loggedIn:       true,
    id:             user.id,
    email:          user.email,
    displayName:    profile?.display_name ?? null,
    avatarEmoji:    profile?.avatar_emoji ?? '🎮',
    hasProfile:     !!profile,
    isAdvertiser,
    advertiserSlug,
    sessionSource,
  });
}
