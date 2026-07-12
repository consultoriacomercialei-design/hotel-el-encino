/**
 * /directorio/ar — Experiencia WebAR con MindAR.js
 *
 * Cómo funciona:
 * 1. Usuario abre esta URL en su celular (Chrome/Safari iOS 15.4+)
 * 2. La cámara se activa automáticamente
 * 3. Al apuntar al marcador físico (el mapa impreso), se superpone un video
 *
 * MindAR.js — App-less WebAR via Image Tracking
 * Docs: https://hiukim.github.io/mind-ar-js-doc/
 */

import type { Metadata } from 'next';
import ArViewer from './ArViewer';

export const metadata: Metadata = {
  title: 'Mapa AR — Santiago, Nuevo León',
  description: 'Apunta tu cámara al mapa turístico para activar la Realidad Aumentada.',
  // Importante: desactiva zoom en móvil para una experiencia AR fluida
  other: {
    viewport: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no',
  },
};

export default function ArPage() {
  return (
    <main className="fixed inset-0 bg-black overflow-hidden">
      <ArViewer />
    </main>
  );
}
