'use client';

import { useRef, useState, useEffect } from 'react';

interface FacebookWidgetProps {
  appId?: string;
  pageUrl?: string;
  height?: number;
}

export default function FacebookWidget({
  appId = '692529643916311',
  pageUrl = 'https://www.facebook.com/hotelencinosantiago',
  height = 130,
}: FacebookWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(500);

  // Measure container so the plugin adapts perfectly
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.offsetWidth);
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const src =
    `https://www.facebook.com/plugins/page.php` +
    `?href=${encodeURIComponent(pageUrl)}` +
    `&tabs=` +                        // sin muro de publicaciones
    `&width=${width}` +
    `&height=${height}` +
    `&small_header=false` +           // encabezado normal con foto
    `&adapt_container_width=true` +   // responsivo
    `&hide_cover=false` +             // muestra foto de portada
    `&show_facepile=false` +          // sin fotos de amigos
    `&appId=${appId}` +
    `&locale=es_LA`;                  // en español

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', overflow: 'hidden', borderRadius: 'inherit' }}
    >
      {width > 0 && (
        <iframe
          src={src}
          width={width}
          height={height}
          style={{
            border: 'none',
            overflow: 'hidden',
            display: 'block',
            width: '100%',
          }}
          scrolling="no"
          frameBorder="0"
          allowFullScreen
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          title="Hotel El Encino Santiago en Facebook"
        />
      )}
    </div>
  );
}
