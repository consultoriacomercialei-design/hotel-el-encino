'use client';
import { useEffect } from 'react';

// Forces body background to forest on blog routes so iOS/macOS Safari
// overscroll area doesn't show the global var(--paper) white color.
export default function BlogBodyDark() {
  useEffect(() => {
    document.body.style.setProperty('background', '#0d221e', 'important');
    return () => {
      document.body.style.removeProperty('background');
    };
  }, []);
  return null;
}
