/**
 * Primitivas de UI compartidas para el panel de hospedajes (estilo del portal
 * Mi Negocio: CSS vars --forest/--serif/--sans/--ink/--warm, tarjetas 16px,
 * botones pill). Componentes presentacionales — el estado vive en las páginas.
 */
import React from 'react';

export const C = {
  forest: 'var(--forest, #0d221e)',
  warm: 'var(--warm, #856d47)',
  ink: 'var(--ink, #040404)',
  paper: 'var(--paper, #faf8f4)',
  serif: 'var(--serif, Georgia, serif)',
  sans: 'var(--sans, system-ui, sans-serif)',
};

export const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid rgba(0,0,0,0.07)',
  borderRadius: '16px',
  padding: '1.25rem 1.5rem',
};

export const eyebrow: React.CSSProperties = {
  fontFamily: C.sans, fontSize: '0.65rem', letterSpacing: '0.18em',
  textTransform: 'uppercase', color: C.warm, marginBottom: '0.4rem',
};
export const h1: React.CSSProperties = {
  fontFamily: C.serif, fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', fontWeight: 400,
  color: C.forest, letterSpacing: '-0.02em', margin: '0 0 0.25rem',
};
export const h2: React.CSSProperties = {
  fontFamily: C.serif, fontSize: '1.25rem', fontWeight: 400, color: C.ink, margin: 0,
};
export const muted: React.CSSProperties = {
  fontFamily: C.sans, fontSize: '0.82rem', color: 'rgba(0,0,0,0.45)', margin: 0, lineHeight: 1.5,
};

export function Button({
  children, onClick, variant = 'primary', type = 'button', disabled, style, full,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  type?: 'button' | 'submit';
  disabled?: boolean;
  full?: boolean;
  style?: React.CSSProperties;
}) {
  const base: React.CSSProperties = {
    fontFamily: C.sans, fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase',
    padding: '10px 20px', borderRadius: '980px', cursor: disabled ? 'not-allowed' : 'pointer',
    border: '1px solid transparent', whiteSpace: 'nowrap', transition: 'opacity .15s',
    opacity: disabled ? 0.5 : 1, width: full ? '100%' : undefined,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
  };
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: C.forest, color: C.paper },
    outline: { background: 'none', color: C.ink, borderColor: 'rgba(0,0,0,0.15)' },
    ghost: { background: 'none', color: 'rgba(0,0,0,0.55)', borderColor: 'transparent' },
    danger: { background: 'none', color: '#b0392a', borderColor: 'rgba(176,57,42,0.3)' },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: '1rem' }}>
      <span style={{ display: 'block', fontFamily: C.sans, fontSize: '0.72rem', letterSpacing: '0.04em', color: 'rgba(0,0,0,0.6)', marginBottom: '6px', fontWeight: 500 }}>
        {label}
      </span>
      {children}
      {hint && <span style={{ display: 'block', fontFamily: C.sans, fontSize: '0.68rem', color: 'rgba(0,0,0,0.4)', marginTop: '5px' }}>{hint}</span>}
    </label>
  );
}

const inputBase: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', fontFamily: C.sans, fontSize: '0.9rem',
  padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.14)',
  background: '#fff', color: C.ink, outline: 'none',
};

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...inputBase, ...props.style }} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} style={{ ...inputBase, minHeight: '90px', resize: 'vertical', ...props.style }} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} style={{ ...inputBase, appearance: 'auto', ...props.style }} />;
}

export function Badge({ children, color = 'rgba(0,0,0,0.55)', bg = 'rgba(0,0,0,0.06)' }: { children: React.ReactNode; color?: string; bg?: string }) {
  return (
    <span style={{
      fontFamily: C.sans, fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase',
      padding: '3px 10px', borderRadius: '999px', background: bg, color, whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

export function Banner({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'error' | 'success'; children: React.ReactNode }) {
  const tones: Record<string, { bg: string; color: string }> = {
    info: { bg: 'rgba(13,34,30,0.06)', color: C.forest as string },
    warn: { bg: 'rgba(176,125,62,0.1)', color: '#8a5a1e' },
    error: { bg: 'rgba(176,57,42,0.08)', color: '#b0392a' },
    success: { bg: 'rgba(42,122,79,0.1)', color: '#2a7a4f' },
  };
  const t = tones[tone];
  return (
    <div style={{ background: t.bg, color: t.color, borderRadius: '12px', padding: '0.85rem 1.1rem', fontFamily: C.sans, fontSize: '0.8rem', lineHeight: 1.5, marginBottom: '1rem' }}>
      {children}
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} style={{ fontFamily: C.sans, fontSize: '0.75rem', color: 'rgba(0,0,0,0.5)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px', marginBottom: '1.25rem' }}>
      <span style={{ fontSize: '1rem' }}>‹</span> {children}
    </a>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem', fontFamily: C.sans, fontSize: '0.85rem', color: 'rgba(0,0,0,0.4)' }}>
      {label ?? 'Cargando…'}
    </div>
  );
}
