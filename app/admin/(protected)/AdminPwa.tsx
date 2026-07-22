'use client';

import { useEffect } from 'react';

/** Registra el service worker para que el admin sea instalable como PWA. */
export default function AdminPwa() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
  return null;
}
