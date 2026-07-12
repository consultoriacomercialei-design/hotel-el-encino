'use client';

/**
 * MapaLocationPicker — mini Leaflet map to let a user drop a pin.
 *
 * Usage:
 *   <MapaLocationPicker value={coords} onChange={setCoords} />
 *
 * value: { lat: number; lng: number } | null
 * onChange: called whenever the user clicks or drags the marker
 */

import { useEffect, useRef } from 'react';

export interface LatLng { lat: number; lng: number }

interface Props {
  value: LatLng | null;
  onChange: (loc: LatLng) => void;
  height?: number;
  label?: string;
}

const SANTIAGO: [number, number] = [25.4219, -100.1435];

export default function MapaLocationPicker({
  value,
  onChange,
  height = 280,
  label = 'Toca el mapa para colocar tu pin',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<unknown>(null);
  const markerRef    = useRef<unknown>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let destroyed = false;

    import('leaflet').then((L) => {
      if (destroyed || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: value ? [value.lat, value.lng] : SANTIAGO,
        zoom: value ? 15 : 13,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OSM © CARTO',
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      // Custom pin icon
      const pinIcon = L.divIcon({
        html: `<div style="
          display:flex;flex-direction:column;align-items:center;
          filter:drop-shadow(0 3px 6px rgba(0,0,0,0.32));
          cursor:grab;
        ">
          <div style="
            width:32px;height:32px;
            background:#0d221e;
            border:3px solid #856d47;
            border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            display:flex;align-items:center;justify-content:center;
          ">
            <div style="
              width:10px;height:10px;
              background:#856d47;
              border-radius:50%;
              transform:rotate(45deg);
            "></div>
          </div>
        </div>`,
        className: '',
        iconSize: [32, 40],
        iconAnchor: [16, 40],
        popupAnchor: [0, -44],
      });

      // Click on map to place/move marker
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;

        if (markerRef.current) {
          (markerRef.current as L.Marker).setLatLng([lat, lng]);
        } else {
          const m = L.marker([lat, lng], { icon: pinIcon, draggable: true }).addTo(map);
          m.on('dragend', () => {
            const pos = m.getLatLng();
            onChange({ lat: +pos.lat.toFixed(6), lng: +pos.lng.toFixed(6) });
          });
          markerRef.current = m;
        }

        onChange({ lat: +lat.toFixed(6), lng: +lng.toFixed(6) });
      });

      // Restore existing pin if value provided
      if (value) {
        const m = L.marker([value.lat, value.lng], { icon: pinIcon, draggable: true }).addTo(map);
        m.on('dragend', () => {
          const pos = m.getLatLng();
          onChange({ lat: +pos.lat.toFixed(6), lng: +pos.lng.toFixed(6) });
        });
        markerRef.current = m;
      }

      // Add hint overlay via DOM (avoids L.control typing issues)
      if (containerRef.current) {
        const hintDiv = document.createElement('div');
        hintDiv.style.cssText = `
          position:absolute;bottom:42px;left:12px;z-index:1000;
          background:rgba(13,34,30,0.82);
          color:rgba(255,255,255,0.85);
          font-family:sans-serif;font-size:11px;
          padding:6px 12px;border-radius:999px;
          pointer-events:none;
          border:1px solid rgba(255,255,255,0.15);
          backdrop-filter:blur(8px);
        `;
        hintDiv.textContent = label;
        containerRef.current.appendChild(hintDiv);
      }

      mapRef.current = map;
    });

    return () => {
      destroyed = true;
      if (mapRef.current) {
        (mapRef.current as { remove(): void }).remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      {/* Map */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height,
          borderRadius: '14px',
          overflow: 'hidden',
          border: '1.5px solid rgba(0,0,0,0.10)',
          cursor: 'crosshair',
        }}
      />

      {/* Coordinate readout + clear */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '8px',
        minHeight: '22px',
      }}>
        {value ? (
          <p style={{
            fontFamily: 'system-ui', fontSize: '11px',
            color: '#2a7a4f', margin: 0,
            display: 'flex', alignItems: 'center', gap: '5px',
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            Ubicación fijada · {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
          </p>
        ) : (
          <p style={{ fontFamily: 'system-ui', fontSize: '11px', color: '#bbb', margin: 0 }}>
            Sin ubicación — toca el mapa para fijarla
          </p>
        )}
        {value && (
          <button
            type="button"
            onClick={() => {
              // Remove marker
              if (markerRef.current) {
                (markerRef.current as { remove(): void }).remove();
                markerRef.current = null;
              }
              onChange({ lat: 0, lng: 0 }); // signal clear
            }}
            style={{
              fontFamily: 'system-ui', fontSize: '11px',
              background: 'none', border: 'none',
              color: '#b0392a', cursor: 'pointer', padding: '2px 0',
            }}
            aria-label="Quitar ubicación"
          >
            Quitar
          </button>
        )}
      </div>

      {/* Leaflet popup/control overrides scoped to picker */}
      <style>{`
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
          border-radius: 10px !important;
          overflow: hidden;
        }
        .leaflet-control-zoom-in,
        .leaflet-control-zoom-out {
          border: none !important;
        }
        .leaflet-control-attribution { font-size: 9px !important; }
      `}</style>
    </div>
  );
}
