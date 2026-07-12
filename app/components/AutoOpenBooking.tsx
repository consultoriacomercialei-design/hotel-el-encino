'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function AutoOpenBooking() {
  const params = useSearchParams();

  useEffect(() => {
    if (params.get('reservar') === '1') {
      // Small delay so the modal has time to mount
      const t = setTimeout(() => {
        window.dispatchEvent(new Event('open-booking-modal'));
      }, 300);
      return () => clearTimeout(t);
    }
  }, [params]);

  return null;
}
