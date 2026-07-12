/**
 * Google Places API — Reviews fetcher (server-side only)
 * Requires: GOOGLE_PLACES_API_KEY + GOOGLE_PLACE_ID in Vercel env vars
 *
 * Setup:
 * 1. Google Cloud Console → Enable "Places API (New)"
 * 2. Create API key, restrict to: Places API
 * 3. Find Place ID: https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder
 *    Search "Hotel El Encino Santiago" → copy the Place ID (format: ChIJ...)
 * 4. vercel env add GOOGLE_PLACES_API_KEY production
 *    vercel env add GOOGLE_PLACE_ID production
 */

export interface GoogleReview {
  author_name: string;
  rating: number;
  text: string;
  time: number; // unix timestamp
  relative_time: string;
  profile_photo_url: string;
  initials: string;
}

export interface PlaceSummary {
  name: string;
  rating: number;
  user_ratings_total: number;
  reviews: GoogleReview[];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

export async function fetchGoogleReviews(minRating = 4): Promise<PlaceSummary | null> {
  const apiKey  = process.env.GOOGLE_PLACES_API_KEY?.trim();
  const placeId = process.env.GOOGLE_PLACE_ID?.trim();

  if (!apiKey || !placeId) return null;

  try {
    // Places API (New) endpoint
    const url = `https://places.googleapis.com/v1/places/${placeId}?languageCode=es&key=${apiKey}`;

    const res = await fetch(url, {
      headers: { 'X-Goog-FieldMask': 'displayName,rating,userRatingCount,reviews' },
      next: { revalidate: 604800 }, // cache 1 semana en Vercel data cache
    });

    if (!res.ok) {
      console.error('[REVIEWS] Places API error:', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    if (data.error) {
      console.error('[REVIEWS] Places API error:', data.error.message);
      return null;
    }

    const allReviews: GoogleReview[] = (data.reviews ?? [])
      .filter((r: { rating: number }) => r.rating >= minRating)
      .map((r: {
        authorAttribution: { displayName: string; photoUri: string };
        rating: number;
        text: { text: string };
        publishTime: string;
        relativePublishTimeDescription: string;
      }) => ({
        author_name:       r.authorAttribution.displayName,
        rating:            r.rating,
        text:              r.text.text,
        time:              new Date(r.publishTime).getTime(),
        relative_time:     r.relativePublishTimeDescription,
        profile_photo_url: r.authorAttribution.photoUri,
        initials:          getInitials(r.authorAttribution.displayName),
      }))
      .sort((a: GoogleReview, b: GoogleReview) => b.time - a.time);

    return {
      name:               data.displayName?.text ?? 'Hotel El Encino Santiago',
      rating:             data.rating,
      user_ratings_total: data.userRatingCount,
      reviews:            allReviews,
    };
  } catch (e) {
    console.error('[REVIEWS] Fetch error:', e);
    return null;
  }
}
