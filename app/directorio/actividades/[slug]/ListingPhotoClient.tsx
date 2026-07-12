'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  photos: string[];
  alt: string;
  name: string;
}

export default function ListingPhotoClient({ photos, alt, name }: Props) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (photos.length <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % photos.length), 4200);
    return () => clearInterval(t);
  }, [photos.length]);

  return (
    <div style={{
      position: 'relative', aspectRatio: '21/9', overflow: 'hidden',
      borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
      minHeight: '260px',
    }}>
      <AnimatePresence mode="sync">
        <motion.div
          key={idx}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          style={{ position: 'absolute', inset: 0 }}
        >
          <Image
            src={photos[idx]} alt={alt} fill priority
            sizes="(max-width: 768px) 100vw, 90vw"
            quality={92}
            style={{ objectFit: 'cover', objectPosition: 'center' }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'linear-gradient(to top, rgba(13,34,30,0.92) 0%, rgba(13,34,30,0.3) 55%, rgba(13,34,30,0.1) 100%)',
      }} />

      {/* Title */}
      <div style={{
        position: 'absolute', bottom: 'clamp(1.5rem, 3vw, 3rem)',
        left: 'clamp(1.5rem, 3vw, 3rem)', right: 'clamp(1.5rem, 3vw, 3rem)',
        zIndex: 2,
      }}>
        <h1 style={{
          fontFamily: 'var(--serif)', fontSize: 'clamp(2rem, 5vw, 4rem)',
          fontWeight: 400, color: 'var(--paper)', lineHeight: 1.05,
          letterSpacing: '-0.02em',
        }}>
          {name}
        </h1>
      </div>

      {/* Dot navigation */}
      {photos.length > 1 && (
        <div style={{
          position: 'absolute', bottom: '1rem', right: '1.5rem', zIndex: 3,
          display: 'flex', gap: '6px',
        }}>
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              style={{
                width: i === idx ? '20px' : '7px', height: '7px',
                borderRadius: '4px',
                background: i === idx ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.4)',
                border: 'none', cursor: 'pointer', padding: 0,
                transition: 'all 0.35s ease',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
