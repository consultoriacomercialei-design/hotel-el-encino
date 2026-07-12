'use client';

/**
 * ArViewer — Cliente WebAR con MindAR.js
 *
 * Arquitectura:
 * - MindAR.js se carga desde CDN (no npm) porque necesita módulos WASM globales
 * - A-Frame se usa como motor 3D/video sobre el canvas de MindAR
 * - El marcador (.mind) se genera con el compilador online de MindAR
 *
 * Flujo para crear el marcador físico:
 * 1. Diseña el mapa en Canva (ver prompts abajo en comentarios)
 * 2. Exporta una imagen de alta resolución (PNG, mín 1000x1000px)
 * 3. Súbela a: https://hiukim.github.io/mind-ar-js-doc/tools/compile
 * 4. Descarga el archivo .mind y súbelo a /public/ar/
 * 5. Actualiza AR_MARKER_URL abajo
 *
 * Env vars opcionales:
 *   NEXT_PUBLIC_AR_MARKER_URL — URL del archivo .mind del marcador
 *   NEXT_PUBLIC_AR_VIDEO_URL  — URL del video a superponer (.mp4)
 */

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

// ── Configuración AR ───────────────────────────────────────

const AR_MARKER_URL =
  process.env.NEXT_PUBLIC_AR_MARKER_URL ?? '/ar/santiago-marker.mind';

const AR_VIDEO_URL =
  process.env.NEXT_PUBLIC_AR_VIDEO_URL ?? '/ar/santiago-intro.mp4';

// ── Tipos (A-Frame + MindAR son globals en runtime) ────────

declare global {
  interface Window {
    MINDAR: unknown;
  }
}

// ── Componente ─────────────────────────────────────────────

export default function ArViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [isScanning, setIsScanning] = useState(true);

  // Verifica permiso de cámara antes de montar la escena
  useEffect(() => {
    if (!scriptsLoaded) return;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then(() => {
        setIsScanning(true);
      })
      .catch(() => {
        setCameraError(true);
      });
  }, [scriptsLoaded]);

  // Escucha eventos de MindAR (target found / lost)
  useEffect(() => {
    if (!scriptsLoaded || cameraError) return;

    const scene = document.querySelector('a-scene');
    if (!scene) return;

    const handleTargetFound = () => setIsScanning(false);
    const handleTargetLost = () => setIsScanning(true);

    scene.addEventListener('targetFound', handleTargetFound);
    scene.addEventListener('targetLost', handleTargetLost);

    return () => {
      scene.removeEventListener('targetFound', handleTargetFound);
      scene.removeEventListener('targetLost', handleTargetLost);
    };
  }, [scriptsLoaded, cameraError]);

  if (cameraError) {
    return <CameraErrorScreen />;
  }

  return (
    <>
      {/* MindAR.js + A-Frame desde CDN */}
      <Script
        src="https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js"
        strategy="afterInteractive"
        onLoad={() => setScriptsLoaded(true)}
      />

      {/* Overlay UI — instrucciones */}
      {scriptsLoaded && (
        <ScanningOverlay isScanning={isScanning} />
      )}

      {/* Escena A-Frame + MindAR */}
      {scriptsLoaded && (
        <div ref={containerRef} className="absolute inset-0">
          {/*
           * IMPORTANTE: a-scene debe renderizarse como HTML estático.
           * Next.js no puede hidratarlo como JSX normal porque A-Frame
           * registra componentes globales en runtime.
           * Usamos dangerouslySetInnerHTML para inyectar la escena limpia.
           */}
          <div
            dangerouslySetInnerHTML={{
              __html: buildAFrameScene(AR_MARKER_URL, AR_VIDEO_URL),
            }}
          />
        </div>
      )}

      {/* Loading state */}
      {!scriptsLoaded && <LoadingScreen />}
    </>
  );
}

// ── Generador de escena A-Frame ─────────────────────────────

function buildAFrameScene(markerUrl: string, videoUrl: string): string {
  return `
    <a-scene
      mindar-image="imageTargetSrc: ${markerUrl}; autoStart: true; uiLoading: no; uiScanning: no; uiError: no;"
      color-space="sRGB"
      embedded
      renderer="colorManagement: true; physicallyCorrectLights: true"
      vr-mode-ui="enabled: false"
      device-orientation-permission-ui="enabled: false"
      style="position: absolute; inset: 0; width: 100%; height: 100%;"
    >
      <a-assets>
        <video
          id="ar-video"
          src="${videoUrl}"
          preload="auto"
          loop
          muted
          playsinline
          webkit-playsinline
          crossorigin="anonymous"
        ></video>
      </a-assets>

      <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>

      <a-entity mindar-image-target="targetIndex: 0">
        <!--
          Video superpuesto sobre el marcador.
          El plano tiene el mismo aspect ratio que la imagen del marcador.
          Ajusta width/height según el ratio de tu diseño en Canva.
          Ejemplo: marcador cuadrado → width: 1, height: 1
                   marcador A4 apaisado → width: 1.414, height: 1
        -->
        <a-plane
          src="#ar-video"
          position="0 0 0"
          height="1"
          width="1"
          rotation="0 0 0"
          material="shader: flat; src: #ar-video; transparent: false;"
        ></a-plane>
      </a-entity>
    </a-scene>
  `;
}

// ── Sub-componentes UI ──────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
      <div
        className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mb-4"
        style={{ borderColor: '#8B4513', borderTopColor: 'transparent' }}
      />
      <p className="text-sm text-stone font-body">Cargando experiencia AR…</p>
    </div>
  );
}

function ScanningOverlay({ isScanning }: { isScanning: boolean }) {
  if (!isScanning) return null;

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-end pb-16 pointer-events-none">
      {/* Marco de escaneo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div
          className="w-64 h-64 rounded-2xl"
          style={{
            border:    '2px solid rgba(139, 69, 19, 0.6)',
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
          }}
        >
          {/* Esquinas decorativas */}
          <Corner position="top-left" />
          <Corner position="top-right" />
          <Corner position="bottom-left" />
          <Corner position="bottom-right" />
        </div>
      </div>

      {/* Instrucción */}
      <div
        className="px-6 py-3 rounded-full text-center"
        style={{
          background: 'rgba(250,247,242,0.92)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <p className="text-sm font-body text-bark">
          Apunta al mapa turístico de Santiago
        </p>
      </div>
    </div>
  );
}

function Corner({ position }: { position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }) {
  const posStyles: Record<string, React.CSSProperties> = {
    'top-left':     { top: -2, left: -2, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 10 },
    'top-right':    { top: -2, right: -2, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 10 },
    'bottom-left':  { bottom: -2, left: -2, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 10 },
    'bottom-right': { bottom: -2, right: -2, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 10 },
  };

  return (
    <div
      className="absolute w-6 h-6"
      style={{
        ...posStyles[position],
        borderStyle: 'solid',
        borderColor: '#8B4513',
      }}
    />
  );
}

function CameraErrorScreen() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black px-8 text-center">
      <span className="text-4xl mb-4">📷</span>
      <h2 className="text-lg font-display text-cream mb-2">
        Se necesita acceso a la cámara
      </h2>
      <p className="text-sm font-body text-stone mb-6">
        Para la experiencia de Realidad Aumentada, permite el acceso a la cámara en la configuración de tu navegador.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-2.5 rounded-full text-sm font-body text-white"
        style={{ backgroundColor: '#8B4513' }}
      >
        Intentar de nuevo
      </button>
    </div>
  );
}
