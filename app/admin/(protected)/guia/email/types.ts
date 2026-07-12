/* ─────────────────────────────────────────────────────────────
   Email Block Types
   ───────────────────────────────────────────────────────────── */

export type BlockType =
  | 'header'
  | 'text'
  | 'image'
  | 'button'
  | 'divider'
  | 'spacer'
  | 'columns'
  | 'callout';

interface BaseBlock {
  id: string;
  type: BlockType;
}

export interface HeaderBlock extends BaseBlock {
  type: 'header';
  title: string;
  subtitle: string;
  align: 'left' | 'center' | 'right';
  bgColor: string;
  textColor: string;
  showBadge: boolean;
}

export interface TextBlock extends BaseBlock {
  type: 'text';
  html: string;       // inner HTML (bold/italic/links etc.)
  align: 'left' | 'center' | 'right';
}

export interface ImageBlock extends BaseBlock {
  type: 'image';
  src: string;
  alt: string;
  align: 'left' | 'center' | 'right' | 'full';
  maxWidthPct: number;   // 30–100
  caption: string;
  link: string;
}

export interface ButtonBlock extends BaseBlock {
  type: 'button';
  text: string;
  url: string;
  align: 'left' | 'center' | 'right';
  bgColor: string;
  textColor: string;
  radius: 'pill' | 'rounded' | 'square';
  size: 'sm' | 'md' | 'lg';
}

export interface DividerBlock extends BaseBlock {
  type: 'divider';
  style: 'solid' | 'dashed' | 'dotted';
  color: string;
  widthPct: number;   // 20–100
  thickness: number;  // 1–8 px
}

export interface SpacerBlock extends BaseBlock {
  type: 'spacer';
  height: number;  // px 8–80
}

export interface ColumnsBlock extends BaseBlock {
  type: 'columns';
  leftHtml: string;
  rightHtml: string;
  rightImageSrc: string;    // if non-empty, right side shows image instead of html
  rightImageAlt: string;
  leftWidthPct: number;     // 30–70
}

export interface CalloutBlock extends BaseBlock {
  type: 'callout';
  html: string;
  bgColor: string;
  borderColor: string;
  radius: number;  // px 0–20
}

export type EmailBlock =
  | HeaderBlock
  | TextBlock
  | ImageBlock
  | ButtonBlock
  | DividerBlock
  | SpacerBlock
  | ColumnsBlock
  | CalloutBlock;

/* ── Design options (global for the email) ──────────────────── */
export interface DesignOptions {
  headerBg: string;
  accentColor: string;
  footerBg: string;
  bodyBg: string;
  font: 'serif' | 'sans';
  btnRadius: 'pill' | 'rounded';
  showHotelBadge: boolean;
}

/* ── Full email state ────────────────────────────────────────── */
export interface EmailState {
  subject: string;
  preheader: string;
  design: DesignOptions;
  blocks: EmailBlock[];
}

/* ── Factory helpers ─────────────────────────────────────────── */
function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

export const DEFAULT_DESIGN: DesignOptions = {
  headerBg: '#0d221e',
  accentColor: '#856d47',
  footerBg: '#f0eee9',
  bodyBg: '#f5f4f0',
  font: 'serif',
  btnRadius: 'pill',
  showHotelBadge: true,
};

export function makeHeader(): HeaderBlock {
  return {
    id: uid(), type: 'header',
    title: 'Título del email', subtitle: '',
    align: 'center', bgColor: '#0d221e', textColor: '#faf8f4', showBadge: true,
  };
}
export function makeText(): TextBlock {
  return { id: uid(), type: 'text', html: '<p>Escribe aquí tu mensaje…</p>', align: 'left' };
}
export function makeImage(): ImageBlock {
  return { id: uid(), type: 'image', src: '', alt: '', align: 'center', maxWidthPct: 100, caption: '', link: '' };
}
export function makeButton(): ButtonBlock {
  return {
    id: uid(), type: 'button',
    text: 'Ver más →', url: 'https://hotelelencino.com',
    align: 'center', bgColor: '#856d47', textColor: '#ffffff',
    radius: 'pill', size: 'md',
  };
}
export function makeDivider(): DividerBlock {
  return { id: uid(), type: 'divider', style: 'solid', color: '#e0ddd8', widthPct: 80, thickness: 1 };
}
export function makeSpacer(): SpacerBlock {
  return { id: uid(), type: 'spacer', height: 24 };
}
export function makeColumns(): ColumnsBlock {
  return {
    id: uid(), type: 'columns',
    leftHtml: '<p><strong>Columna izquierda</strong></p>',
    rightHtml: '<p>Columna derecha</p>',
    rightImageSrc: '', rightImageAlt: '',
    leftWidthPct: 50,
  };
}
export function makeCallout(): CalloutBlock {
  return {
    id: uid(), type: 'callout',
    html: '<p><strong>Nota importante</strong> — texto de aviso aquí.</p>',
    bgColor: 'rgba(133,109,71,0.08)', borderColor: '#856d47', radius: 10,
  };
}

export const BLOCK_PALETTE: { type: BlockType; emoji: string; label: string }[] = [
  { type: 'header',   emoji: '🏷️', label: 'Encabezado' },
  { type: 'text',     emoji: '✏️', label: 'Texto' },
  { type: 'image',    emoji: '🖼️', label: 'Imagen' },
  { type: 'button',   emoji: '🔲', label: 'Botón CTA' },
  { type: 'columns',  emoji: '⬛⬜', label: '2 Columnas' },
  { type: 'callout',  emoji: '📣', label: 'Callout' },
  { type: 'divider',  emoji: '─',  label: 'Divisor' },
  { type: 'spacer',   emoji: '↕️', label: 'Espacio' },
];

export function makeBlock(type: BlockType): EmailBlock {
  switch (type) {
    case 'header':  return makeHeader();
    case 'text':    return makeText();
    case 'image':   return makeImage();
    case 'button':  return makeButton();
    case 'divider': return makeDivider();
    case 'spacer':  return makeSpacer();
    case 'columns': return makeColumns();
    case 'callout': return makeCallout();
  }
}
