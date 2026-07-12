'use client';

import { useEffect } from 'react';
import { trackListingView } from '../../lib/analytics';

interface Props {
  slug: string;
  name: string;
  category: string;
}

/** Fires GA4 view_item event once on mount — must be client component */
export default function ListingAnalytics({ slug, name, category }: Props) {
  useEffect(() => {
    trackListingView(slug, name, category);
  }, [slug, name, category]);

  return null;
}
