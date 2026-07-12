import type { ReactNode } from 'react';
import BlogBodyDark from './BlogBodyDark';

export default function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <BlogBodyDark />
      {children}
    </>
  );
}
