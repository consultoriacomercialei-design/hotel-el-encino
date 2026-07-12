'use client';

import { useEffect, useRef } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Listing } from './data';
import { CATEGORY_ICON } from './data';

interface Props {
  listings: Listing[];
}

// Hotel El Encino — anchor del mapa
const HOTEL_LNG = -100.1573;
const HOTEL_LAT =  25.4220;
const SANTIAGO_CENTER: [number, number] = [HOTEL_LNG, HOTEL_LAT];

const DEFAULT_LAT = 25.4220;
const DEFAULT_LNG = -100.1573;

function hasRealCoords(l: Listing): boolean {
  if (!l.lat || !l.lng) return false;
  if (l.isUserListing) {
    return !(Math.abs(l.lat - DEFAULT_LAT) < 0.001 && Math.abs(l.lng - DEFAULT_LNG) < 0.001);
  }
  return true;
}

// Estilo completo OpenFreeMap — 100+ capas reales (negocios, íconos, monumentos, etiquetas OSM)
// Aplicamos overrides de color branded + ocultamos POIs no anunciados después del load
const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

// Overrides de color para pintar con la paleta del hotel
const BRAND_OVERRIDES: Array<{ layer: string; prop: string; value: string }> = [
  { layer: 'background',      prop: 'background-color',   value: '#f5ede0' },
  { layer: 'water',           prop: 'fill-color',         value: '#a8c5b5' },
  { layer: 'water_shadow',    prop: 'fill-color',         value: '#8db8a8' },
  { layer: 'waterway',        prop: 'line-color',         value: '#8db8a8' },
  { layer: 'park_fill',       prop: 'fill-color',         value: '#d4e8d0' },
  { layer: 'landcover_wood',  prop: 'fill-color',         value: '#c8dfc4' },
  { layer: 'landcover_grass', prop: 'fill-color',         value: '#daebd6' },
  { layer: 'building_fill',   prop: 'fill-color',         value: '#e8dccf' },
  { layer: 'building_fill',   prop: 'fill-outline-color', value: '#d4c9b8' },
];

// Patrones de capas OSM que muestran negocios/POIs de no-anunciantes
// Las ocultamos para proteger el modelo de negocio del directorio
const POI_HIDE_PATTERNS = [
  'poi',        // la mayoría de capas POI tienen "poi" en su id
  'shop',
  'amenity',
  'tourism',
  'landuse',    // etiquetas de uso de suelo con nombres de negocios
];

// Capas que SÍ queremos conservar aunque tengan patrones parecidos
const POI_KEEP_PATTERNS = [
  'landuse_residential',
  'landuse_industrial',
  'landuse_park',
  'landcover',
  'landform',
];

function shouldHideLayer(layerId: string): boolean {
  const id = layerId.toLowerCase();
  if (POI_KEEP_PATTERNS.some((k) => id.includes(k))) return false;
  return POI_HIDE_PATTERNS.some((p) => id.includes(p));
}

// Genera puntos de un círculo GeoJSON sin dependencias externas
function makeCircleGeoJSON(
  centerLng: number,
  centerLat: number,
  radiusKm: number,
  steps = 64,
) {
  const kmPerLat = 111;
  const kmPerLng = Math.cos((centerLat * Math.PI) / 180) * 111;
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const dlat = (radiusKm / kmPerLat) * Math.sin(angle);
    const dlng = (radiusKm / kmPerLng) * Math.cos(angle);
    coords.push([centerLng + dlng, centerLat + dlat]);
  }
  return {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        geometry: { type: 'Polygon' as const, coordinates: [coords] },
        properties: {},
      },
    ],
  };
}

export default function MapaTab({ listings }: Props) {
  const mapRef      = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<unknown>(null);

  const mapListings = listings.filter(hasRealCoords);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    let destroyed = false;

    import('maplibre-gl').then((mlgl) => {
      if (destroyed || !mapRef.current) return;

      const map = new mlgl.Map({
        container: mapRef.current,
        style: MAP_STYLE_URL,
        center: SANTIAGO_CENTER,
        zoom: 13,
        attributionControl: false,
      });

      map.addControl(new mlgl.NavigationControl({ showCompass: false }), 'bottom-right');
      map.addControl(new mlgl.AttributionControl({ compact: true }), 'bottom-right');

      map.on('load', () => {
        if (destroyed) return;

        // ── 1. Aplicar overrides de color branded ────────────────────
        const existingLayers = new Set(
          map.getStyle().layers.map((l: { id: string }) => l.id),
        );
        for (const { layer, prop, value } of BRAND_OVERRIDES) {
          if (existingLayers.has(layer)) {
            try { map.setPaintProperty(layer, prop, value); } catch { /* ignorar */ }
          }
        }

        // ── 2. Ocultar capas POI de no-anunciantes ───────────────────
        for (const { id } of map.getStyle().layers as Array<{ id: string }>) {
          if (shouldHideLayer(id)) {
            try { map.setLayoutProperty(id, 'visibility', 'none'); } catch { /* ignorar */ }
          }
        }

        // ── 3. Círculo de radio ~3 km alrededor del hotel ───────────
        try {
          const circleGeoJSON = makeCircleGeoJSON(HOTEL_LNG, HOTEL_LAT, 3);
          map.addSource('hotel-radius', {
            type: 'geojson',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: circleGeoJSON as any,
          });
          map.addLayer({
            id: 'hotel-radius-fill',
            type: 'fill',
            source: 'hotel-radius',
            paint: { 'fill-color': '#856d47', 'fill-opacity': 0.06 },
          });
          map.addLayer({
            id: 'hotel-radius-line',
            type: 'line',
            source: 'hotel-radius',
            paint: {
              'line-color': '#856d47',
              'line-width': 1.5,
              'line-dasharray': [4, 4],
              'line-opacity': 0.55,
            },
          });
        } catch (e) {
          console.warn('[MapaTab] circle layer error:', e);
        }

        // ── 4. Pin pulsante del hotel ────────────────────────────────
        const hotelEl = document.createElement('div');
        hotelEl.className = 'hotel-pin-wrapper';
        hotelEl.innerHTML = `
          <div class="hotel-pin-pulse"></div>
          <div class="hotel-pin-core">🏨</div>
        `;

        const hotelPopupHTML = `
          <div style="font-family:-apple-system,sans-serif;text-align:center;padding:4px 2px;">
            <p style="font-size:9px;text-transform:uppercase;letter-spacing:.12em;color:#856d47;margin:0 0 3px;font-weight:600;">Tu punto de partida</p>
            <h3 style="font-size:13px;font-weight:700;margin:0 0 4px;color:#0d221e;">Hotel El Encino</h3>
            <p style="font-size:11px;color:#666;margin:0;">Todos los lugares del directorio<br>están cerca de aquí</p>
          </div>`;

        const hotelPopup = new mlgl.Popup({
          offset: [0, -28],
          closeButton: false,
          maxWidth: '220px',
          className: 'encino-popup',
        }).setHTML(hotelPopupHTML);

        new mlgl.Marker({ element: hotelEl })
          .setLngLat([HOTEL_LNG, HOTEL_LAT])
          .setPopup(hotelPopup)
          .addTo(map);

        // ── 5. Marcadores de anunciantes ─────────────────────────────
        const bounds: [[number, number], [number, number]] = [
          [Infinity, Infinity],
          [-Infinity, -Infinity],
        ];

        for (const listing of mapListings) {
          // El hotel ya tiene su marker especial 🏨 — lo omitimos aquí
          if (listing.slug === 'hotel-el-encino') continue;

          const lng = listing.lng;
          const lat = listing.lat;

          if (lng < bounds[0][0]) bounds[0][0] = lng;
          if (lat < bounds[0][1]) bounds[0][1] = lat;
          if (lng > bounds[1][0]) bounds[1][0] = lng;
          if (lat > bounds[1][1]) bounds[1][1] = lat;

          const isHero  = listing.tier === 'hero';
          const emoji   = CATEGORY_ICON[listing.category] || '📍';
          const size    = isHero ? 44 : 36;
          const bgColor = isHero ? '#0d221e' : '#fff';
          const border  = isHero ? '#856d47' : '#0d221e';

          // MapLibre controla transform del wrapper para posicionar el marker.
          // El scale de hover va en el elemento HIJO — si lo ponemos en wrapper
          // sobreescribimos el translate(X,Y) de MapLibre y el marker "vuela".
          const wrapper = document.createElement('div');
          wrapper.style.cssText = `width:${size}px;height:${size}px;cursor:pointer;`;

          const el = document.createElement('div');
          el.style.cssText = `
            width:${size}px;height:${size}px;
            background:${bgColor};
            border:2.5px solid ${border};
            border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            font-size:${isHero ? 20 : 16}px;
            box-shadow:0 3px 12px rgba(13,34,30,0.28);
            transition:transform 150ms ease;
          `;
          el.textContent = emoji;
          wrapper.appendChild(el);
          wrapper.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.15)'; });
          wrapper.addEventListener('mouseleave', () => { el.style.transform = ''; });

          // Foto del anunciante en el popup
          const photoHTML = listing.src
            ? `<img src="${listing.src}" alt="${listing.alt || listing.name}"
                 style="width:100%;height:100px;object-fit:cover;border-radius:8px;margin-bottom:8px;display:block;" />`
            : '';

          const waBtn = listing.whatsapp
            ? `<a href="https://wa.me/${listing.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, vi ${listing.name} en el directorio del Hotel El Encino`)}"
                 target="_blank"
                 style="display:inline-flex;align-items:center;gap:5px;background:#25D366;color:#fff;padding:5px 13px;border-radius:999px;font-size:11px;text-decoration:none;">
                 <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.118.553 4.107 1.516 5.834L0 24l6.334-1.496A11.96 11.96 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.844 0-3.573-.49-5.063-1.346l-.363-.214-3.76.887.928-3.667-.236-.377A9.952 9.952 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                 WhatsApp
               </a>`
            : '';

          const popupHTML = `
            <div style="font-family:-apple-system,sans-serif;min-width:200px;max-width:260px;">
              ${photoHTML}
              <p style="font-size:9px;text-transform:uppercase;letter-spacing:0.12em;color:#856d47;margin:0 0 4px;font-weight:600;">${listing.categoryLabel}</p>
              <h3 style="font-size:14px;font-weight:700;margin:0 0 5px;color:#0d221e;line-height:1.3;">${listing.name}</h3>
              <p style="font-size:12px;color:#555;margin:0 0 6px;line-height:1.5;">${listing.shortDesc}</p>
              ${listing.priceRange ? `<p style="font-size:11px;color:#888;margin:0 0 2px;">💰 ${listing.priceRange}</p>` : ''}
              ${listing.distanceMin ? `<p style="font-size:11px;color:#888;margin:0 0 8px;">⏱ ${listing.distanceMin} min del hotel</p>` : ''}
              <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:8px;">
                <a href="/directorio/actividades/${listing.slug}"
                   style="display:inline-block;background:#0d221e;color:#fff;padding:5px 13px;border-radius:999px;font-size:11px;text-decoration:none;font-weight:600;">
                   Ver más →
                </a>
                ${waBtn}
              </div>
            </div>`;

          const popup = new mlgl.Popup({
            offset: [0, -(size / 2) - 4],
            closeButton: true,
            maxWidth: '280px',
            className: 'encino-popup',
          }).setHTML(popupHTML);

          new mlgl.Marker({ element: wrapper })
            .setLngLat([lng, lat])
            .setPopup(popup)
            .addTo(map);
        }

        // Fit bounds si hay más de 1 marker
        if (mapListings.length > 1 && bounds[0][0] !== Infinity) {
          map.fitBounds(bounds, { padding: 80, maxZoom: 14 });
        }
      });

      mapInstance.current = map;
    });

    return () => {
      destroyed = true;
      if (mapInstance.current) {
        (mapInstance.current as { remove(): void }).remove();
        mapInstance.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ position: 'relative', width: '100%', height: '100dvh' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      <style>{`
        /* ── Hotel pin pulsante ─────────────────────────────────── */
        .hotel-pin-wrapper {
          position: relative;
          width: 52px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .hotel-pin-core {
          position: relative;
          z-index: 2;
          width: 44px;
          height: 44px;
          background: #0d221e;
          border: 3px solid #856d47;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          box-shadow: 0 4px 16px rgba(13,34,30,0.45);
        }
        .hotel-pin-pulse {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: rgba(133,109,71,0.35);
          animation: hotelPulse 2s ease-out infinite;
          z-index: 1;
        }
        @keyframes hotelPulse {
          0%   { transform: scale(1);   opacity: 0.8; }
          70%  { transform: scale(1.8); opacity: 0;   }
          100% { transform: scale(1.8); opacity: 0;   }
        }

        /* ── Popups ─────────────────────────────────────────────── */
        .encino-popup .maplibregl-popup-content {
          border-radius: 14px !important;
          box-shadow: 0 8px 32px rgba(13,34,30,0.18) !important;
          border: 1px solid rgba(133,109,71,0.18) !important;
          padding: 14px 16px !important;
          font-family: -apple-system, sans-serif;
        }
        .encino-popup .maplibregl-popup-close-button {
          font-size: 16px !important;
          color: #999 !important;
          padding: 4px 8px !important;
          line-height: 1 !important;
        }
        .encino-popup .maplibregl-popup-tip { border-top-color: #fff !important; }

        /* ── Nav controls ───────────────────────────────────────── */
        .maplibregl-ctrl-group {
          border-radius: 12px !important;
          box-shadow: 0 2px 12px rgba(13,34,30,0.18) !important;
          border: 1px solid rgba(133,109,71,0.15) !important;
          overflow: hidden;
          margin-bottom: 72px !important;
          margin-right: 12px !important;
        }
        .maplibregl-ctrl-group button {
          border: none !important;
          color: #0d221e !important;
        }
        .maplibregl-ctrl-group button:hover { background: #f5ede0 !important; }

        /* ── Attribution ────────────────────────────────────────── */
        .maplibregl-ctrl-attrib {
          font-size: 9px !important;
          background: rgba(245,237,224,0.85) !important;
          backdrop-filter: blur(6px);
          color: #856d47 !important;
        }
        .maplibregl-ctrl-attrib a { color: #856d47 !important; }
      `}</style>

      {/* Counter badge */}
      <div style={{
        position: 'absolute', bottom: '42px', left: '12px', zIndex: 1000,
        background: 'rgba(13,34,30,0.88)',
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        border: '1px solid rgba(133,109,71,0.35)',
        borderRadius: '999px', padding: '7px 16px',
        fontFamily: 'var(--sans)', fontSize: '11px',
        letterSpacing: '0.08em', color: 'rgba(255,255,255,0.82)',
        pointerEvents: 'none',
      }}>
        {mapListings.length} lugares en Santiago, N.L.
      </div>

      {/* CTA registro */}
      <div style={{
        position: 'absolute', bottom: '42px', right: '52px', zIndex: 1000,
        background: 'rgba(245,237,224,0.95)',
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        border: '1px solid rgba(133,109,71,0.25)',
        borderRadius: '999px', padding: '7px 16px',
        fontFamily: 'var(--sans)', fontSize: '11px',
        color: 'rgba(0,0,0,0.5)', maxWidth: '200px',
        textAlign: 'center', lineHeight: 1.3,
      }}>
        ¿Tu negocio no aparece?{' '}
        <a href="/mi-negocio/registro"
           style={{ color: '#856d47', textDecoration: 'none', fontWeight: 600 }}>
          Regístralo gratis →
        </a>
      </div>
    </div>
  );
}
