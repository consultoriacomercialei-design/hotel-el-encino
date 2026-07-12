'use client';

import { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { patchReservationAction, verifyMpPaymentAction, resendMpEmailAction, resendWaitlistEmailAction, generatePaymentLinkAction } from '../actions';
import { getAnticipo, getBalanceDue } from '@/app/lib/balance';

interface Reservation {
  id: string;
  folio: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  room_type: string;
  check_in: string;
  check_out: string;
  nights: number;
  total_mxn: number;
  adults?: number;
  children?: number;
  status: string;
  payment_method?: string;
  notes?: string;
  created_at: string;
}

type SortKey = 'folio' | 'created_at' | 'check_in' | 'total_mxn';
type CancelModal = { id: string; folio: string } | null;
type ActionModal = {
  id: string; folio: string; action: string; title: string;
  description: string; confirmLabel: string; color: string; guestName: string;
} | null;
type KebabMenu = { id: string; top: number; right: number } | null;

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  confirmed:       { label: 'Confirmada',         bg: '#e8f5e9', color: '#2e7d32' },
  checked_out:     { label: 'Check-out ✓',        bg: '#e3f2fd', color: '#1565c0' },
  pending:         { label: 'Pendiente',           bg: '#fff8e1', color: '#f57f17' },
  pending_payment: { label: 'Pago en proceso',     bg: '#e3f2fd', color: '#1565c0' },
  waitlist:        { label: 'En espera',           bg: '#f3e5f5', color: '#6a1b9a' },
  cancelled:       { label: 'Cancelada',           bg: '#f5f5f5', color: '#757575' },
  no_show:         { label: 'No show',             bg: '#ffebee', color: '#c62828' },
  refund_pending:  { label: 'Reembolso pendiente', bg: '#fff3cd', color: '#856d47' },
};

const PAYMENT: Record<string, { label: string; bg: string; color: string }> = {
  online:   { label: 'MercadoPago',   bg: '#e3f2fd', color: '#0277bd' },
  cash:     { label: 'Efectivo',      bg: '#e8f5e9', color: '#2e7d32' },
  transfer: { label: 'Transferencia', bg: '#ede7f6', color: '#5e35b1' },
  card:     { label: 'Tarjeta',       bg: '#fce4ec', color: '#c2185b' },
  pending:  { label: 'Al llegar',     bg: '#fff8e1', color: '#f57f17' },
};

const ROOM: Record<string, string> = {
  suite: 'Suite', doble: 'Doble', grupal: 'Grupal',
};

const CANCEL_REASONS = [
  { action: 'cancel:timeout',      label: 'No confirmó en 2 horas',    sub: 'Sin WhatsApp ni pago — se libera la fecha',               color: '#991B1B' },
  { action: 'cancel:client',       label: 'Solicitud del cliente',      sub: 'Sin pago previo — no requiere reembolso',                 color: '#4a4a4a' },
  { action: 'cancel:refund',       label: 'Cliente pagó y cancela',     sub: 'Queda como Reembolso pendiente — tú autorizas',           color: '#1565c0' },
  { action: 'cancel:mp_incomplete',label: 'Pago MP no completado',      sub: 'El cliente inició pago pero no finalizó — sin cargo',     color: '#9c6700' },
  { action: 'cancel:internal',     label: 'Cancelación interna',        sub: 'Duplicado o error operativo — NO envía correo al cliente', color: '#555'   },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}

/** Extract add-on names from the notes field ("...\nAdd-ons: Early check-in, Desayuno") */
function parseAddons(notes?: string): string[] {
  if (!notes) return [];
  const m = notes.match(/Add-ons:\s*(.+)/i);
  if (!m) return [];
  return m[1].split(',').map(s => s.trim()).filter(Boolean);
}

/** Return notes without the appended "Add-ons: ..." line */
function cleanNotes(notes?: string): string {
  if (!notes) return '';
  return notes.replace(/\nAdd-ons:.+/i, '').trim();
}

function timeAgo(iso: string): { text: string; hours: number } {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  return { text: days >= 1 ? `hace ${days}d` : hours >= 1 ? `hace ${hours}h` : `hace ${mins}m`, hours };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Pill({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '980px', background: bg, color, fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

function KebabItem({
  label, onClick, disabled = false, destructive = false,
}: { label: string; onClick: () => void; disabled?: boolean; destructive?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'block', width: '100%', padding: '9px 16px', background: 'none', border: 'none',
        borderBottom: '1px solid #f5f3ef', textAlign: 'left', fontFamily: 'var(--sans)',
        fontSize: '0.82rem', color: disabled ? '#ccc' : destructive ? '#c62828' : '#1a1a1a',
        cursor: disabled ? 'not-allowed' : 'pointer', lineHeight: 1.4,
      }}
    >
      {label}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ReservationTable({ initialData }: { initialData: Reservation[] }) {
  const [rows,        setRows]        = useState(initialData);
  const [loading,     setLoading]     = useState<string | null>(null);
  const [error,       setError]       = useState('');
  const [cancelModal, setCancelModal] = useState<CancelModal>(null);
  const [actionModal, setActionModal] = useState<ActionModal>(null);
  const [isPending,   startTransition] = useTransition();
  const [sortKey,     setSortKey]     = useState<SortKey | null>(null);
  const [sortDir,     setSortDir]     = useState<'asc' | 'desc'>('asc');
  const [kebab,       setKebab]       = useState<KebabMenu>(null);
  const [mpVerifying, setMpVerifying] = useState<string | null>(null);
  const [mpResult,    setMpResult]    = useState<Record<string, string>>({});
  const [mpResending,        setMpResending]        = useState<string | null>(null);
  const [mpResendMsg,        setMpResendMsg]        = useState<Record<string, string>>({});
  const [waitlistResending,  setWaitlistResending]  = useState<string | null>(null);
  const [waitlistResendMsg,  setWaitlistResendMsg]  = useState<Record<string, string>>({});
  const [payLinkLoading,     setPayLinkLoading]     = useState<string | null>(null);
  const [payLinkMsg,         setPayLinkMsg]         = useState<Record<string, string>>({});
  const router = useRouter();

  // Close kebab when clicking outside
  useEffect(() => {
    if (!kebab) return;
    const close = () => setKebab(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [kebab]);

  const handleSort = (key: SortKey) => {
    const newDir = sortKey === key && sortDir === 'asc' ? 'desc' : 'asc';
    setSortKey(key); setSortDir(newDir);
    setRows(prev => [...prev].sort((a, b) => {
      const av = a[key] ?? ''; const bv = b[key] ?? '';
      return newDir === 'asc' ? (av < bv ? -1 : av > bv ? 1 : 0) : (av > bv ? -1 : av < bv ? 1 : 0);
    }));
  };

  const sortIcon = (key: SortKey) => sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  const openKebab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (kebab?.id === id) { setKebab(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setKebab({ id, top: rect.bottom + 6, right: window.innerWidth - rect.right });
  };

  const doAction = (id: string, action: string) => {
    setLoading(`${id}:${action}`); setError('');
    startTransition(async () => {
      try {
        const result = await patchReservationAction(id, action);
        if (result.status) setRows(prev => prev.map(r => r.id === id ? { ...r, status: result.status as string } : r));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error al actualizar');
      } finally {
        setLoading(null); setCancelModal(null); setActionModal(null);
      }
    });
  };

  const openConfirmModal = (r: Reservation) => {
    setKebab(null);
    const anticipo = getAnticipo(r);
    const saldo    = getBalanceDue(r);
    const desc = [
      `El correo se enviará con:`,
      `• Total: $${r.total_mxn.toLocaleString('es-MX')} MXN`,
      anticipo ? `• Anticipo ya recibido: $${anticipo.toLocaleString('es-MX')} MXN` : null,
      anticipo ? `• Saldo a cobrar al check-in: $${saldo.toLocaleString('es-MX')} MXN` : null,
      ``,
      `Verifica que el precio sea correcto antes de confirmar.`,
    ].filter(Boolean).join('\n');
    setActionModal({
      id: r.id, folio: r.folio, action: 'confirm', guestName: r.guest_name,
      title: 'Confirmar reservación',
      description: desc,
      confirmLabel: 'Confirmar',
      color: '#2e7d32',
    });
  };

  const openConfirmMpModal = (r: Reservation) => {
    setKebab(null);
    setActionModal({
      id: r.id, folio: r.folio, action: 'confirm', guestName: r.guest_name,
      title: 'Confirmar pago de MercadoPago',
      description: 'Usa esto solo si el pago ya aparece en tu app de MP y el botón "Verificar MP" no funcionó. Enviará el correo de pago recibido al cliente.',
      confirmLabel: 'Confirmar pago',
      color: '#0277bd',
    });
  };

  const openPaidModal = (r: Reservation) => {
    setKebab(null);
    setActionModal({
      id: r.id, folio: r.folio, action: 'mark_paid', guestName: r.guest_name,
      title: 'Marcar como pagado',
      description: 'Registra pago en efectivo o transferencia en el hotel. Confirma la reservación sin enviar liga de MP.',
      confirmLabel: 'Marcar pagado',
      color: '#1565c0',
    });
  };

  const openRefundModal = (r: Reservation) => {
    setKebab(null);
    setActionModal({
      id: r.id, folio: r.folio, action: 'refund', guestName: r.guest_name,
      title: 'Autorizar reembolso',
      description: 'Se procesará el reembolso completo a través de MercadoPago a la tarjeta original. Esta acción no se puede deshacer. El cliente recibirá la notificación de MP (3-10 días hábiles).',
      confirmLabel: 'Procesar reembolso',
      color: '#856d47',
    });
  };

  const handleVerifyMp = async (id: string) => {
    setMpVerifying(id); setMpResult(prev => ({ ...prev, [id]: '' }));
    try {
      const result = await verifyMpPaymentAction(id);
      if (result.ok && result.status === 'confirmed') {
        setRows(prev => prev.map(r => r.id === id ? { ...r, status: 'confirmed' } : r));
        setMpResult(prev => ({ ...prev, [id]: result.message ?? 'Confirmado' }));
      } else {
        setMpResult(prev => ({ ...prev, [id]: result.error ?? `Estado MP: ${result.mpStatus ?? '?'}` }));
      }
    } catch (err: unknown) {
      setMpResult(prev => ({ ...prev, [id]: err instanceof Error ? err.message : 'Error' }));
    } finally {
      setMpVerifying(null);
    }
  };

  const handleResendMp = async (id: string) => {
    setKebab(null); setMpResending(id);
    setMpResendMsg(prev => ({ ...prev, [id]: '' }));
    try {
      const result = await resendMpEmailAction(id);
      setMpResendMsg(prev => ({ ...prev, [id]: result.ok ? 'Correo reenviado' : (result.error ?? 'Error') }));
    } catch (err: unknown) {
      setMpResendMsg(prev => ({ ...prev, [id]: err instanceof Error ? err.message : 'Error' }));
    } finally {
      setMpResending(null);
    }
  };

  const handleResendWaitlist = async (id: string) => {
    setKebab(null); setWaitlistResending(id);
    setWaitlistResendMsg(prev => ({ ...prev, [id]: '' }));
    try {
      const result = await resendWaitlistEmailAction(id);
      setWaitlistResendMsg(prev => ({ ...prev, [id]: result.ok ? 'Correo reenviado ✓' : (result.error ?? 'Error') }));
    } catch (err: unknown) {
      setWaitlistResendMsg(prev => ({ ...prev, [id]: err instanceof Error ? err.message : 'Error' }));
    } finally {
      setWaitlistResending(null);
    }
  };

  const handleGeneratePayLink = async (id: string) => {
    setKebab(null); setPayLinkLoading(id);
    setPayLinkMsg(prev => ({ ...prev, [id]: '' }));
    try {
      const result = await generatePaymentLinkAction(id);
      if (result.ok) {
        setPayLinkMsg(prev => ({ ...prev, [id]: `✓ Link enviado a ${result.guest_email}` }));
        // Refresh the row status (it moved to pending_payment)
        setRows(prev => prev.map(r => r.id === id ? { ...r, status: 'pending_payment', payment_method: 'online' } : r));
      } else {
        setPayLinkMsg(prev => ({ ...prev, [id]: result.error ?? 'Error' }));
      }
    } catch (err: unknown) {
      setPayLinkMsg(prev => ({ ...prev, [id]: err instanceof Error ? err.message : 'Error' }));
    } finally {
      setPayLinkLoading(null);
    }
  };

  // Row data for the open kebab
  const kebabRow = kebab ? rows.find(r => r.id === kebab.id) ?? null : null;

  if (!rows.length) {
    return <p style={{ color: '#6b6b6b', padding: '32px 0', textAlign: 'center' }}>Sin reservaciones para los filtros seleccionados.</p>;
  }

  return (
    <div>
      {/* ── Action confirmation modal ───────────────────────────────────────── */}
      {actionModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', maxWidth: '400px', width: '90%', boxShadow: '0 16px 48px rgba(0,0,0,0.18)' }}>
            <h3 style={{ fontFamily: 'var(--sans)', fontSize: '1rem', fontWeight: 700, color: '#1a1a1a', margin: '0 0 6px' }}>
              {actionModal.title}
            </h3>
            <p style={{ fontFamily: 'var(--sans)', fontSize: '0.8rem', color: '#6b6b6b', margin: '0 0 6px' }}>
              <span style={{ fontFamily: 'monospace', color: '#856d47', fontWeight: 700 }}>{actionModal.folio}</span> · {actionModal.guestName}
            </p>
            <div style={{ background: `${actionModal.color}0d`, border: `1px solid ${actionModal.color}30`, borderRadius: '8px', padding: '12px 14px', margin: '16px 0', fontFamily: 'var(--sans)', fontSize: '0.82rem', color: '#3a3a3a', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {actionModal.description}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => doAction(actionModal.id, actionModal.action)}
                disabled={loading !== null}
                style={{ flex: 1, padding: '10px 0', borderRadius: '8px', border: 'none', background: actionModal.color, color: '#fff', fontFamily: 'var(--sans)', fontSize: '0.85rem', fontWeight: 700, cursor: loading !== null ? 'not-allowed' : 'pointer', opacity: loading !== null ? 0.6 : 1 }}
              >
                {loading !== null ? 'Procesando…' : actionModal.confirmLabel}
              </button>
              <button
                onClick={() => setActionModal(null)}
                style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #e0dbd4', background: '#fff', fontFamily: 'var(--sans)', fontSize: '0.82rem', color: '#6b6b6b', cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel reason modal ─────────────────────────────────────────────── */}
      {cancelModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', maxWidth: '400px', width: '90%', boxShadow: '0 16px 48px rgba(0,0,0,0.18)' }}>
            <h3 style={{ fontFamily: 'var(--sans)', fontSize: '1rem', fontWeight: 700, color: '#1a1a1a', margin: '0 0 4px' }}>
              Cancelar {cancelModal.folio}
            </h3>
            <p style={{ fontFamily: 'var(--sans)', fontSize: '0.8rem', color: '#6b6b6b', margin: '0 0 18px' }}>
              Elige el motivo — se enviará correo al cliente excepto en cancelación interna.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {CANCEL_REASONS.map(({ action, label, sub, color }) => (
                <button key={action} onClick={() => doAction(cancelModal.id, action)}
                  style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${color}20`, background: `${color}08`, color, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left', lineHeight: 1.4, fontFamily: 'var(--sans)' }}>
                  {label}
                  <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 400, opacity: 0.7 }}>{sub}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setCancelModal(null)} style={{ marginTop: '14px', background: 'none', border: 'none', fontFamily: 'var(--sans)', fontSize: '0.8rem', color: '#aaa', cursor: 'pointer', width: '100%' }}>
              Volver sin cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Kebab dropdown (fixed, outside table overflow) ──────────────────── */}
      {kebab && kebabRow && (
        <div
          onClick={e => e.stopPropagation()}
          style={{ position: 'fixed', top: kebab.top, right: kebab.right, zIndex: 400, background: '#fff', border: '1px solid #e0dbd4', borderRadius: '10px', boxShadow: '0 6px 24px rgba(0,0,0,0.12)', minWidth: '180px', overflow: 'hidden' }}
        >
          {(() => {
            const r = kebabRow;
            const isLoading = !!loading?.startsWith(r.id);
            const isConfirmedMP = r.status === 'confirmed' && r.payment_method === 'online';
            const canCancel = !['cancelled', 'no_show', 'refund_pending', 'checked_out'].includes(r.status);
            const canPaid   = r.status === 'pending' || r.status === 'confirmed';
            return (
              <>
                {r.status === 'pending_payment' && (
                  <KebabItem label="Confirmar manual" onClick={() => openConfirmMpModal(r)} disabled={isLoading} />
                )}
                {canPaid && (
                  <KebabItem label="Marcar pagado" onClick={() => openPaidModal(r)} disabled={isLoading} />
                )}
                {isConfirmedMP && (
                  <KebabItem label={mpResending === r.id ? 'Enviando…' : 'Reenviar correo MP'} onClick={() => handleResendMp(r.id)} disabled={isLoading || mpResending === r.id} />
                )}
                {r.status === 'waitlist' && (
                  <KebabItem label={waitlistResending === r.id ? 'Enviando…' : 'Reenviar correo espera'} onClick={() => handleResendWaitlist(r.id)} disabled={isLoading || waitlistResending === r.id} />
                )}
                {(r.status === 'waitlist' || r.status === 'pending') && (
                  <KebabItem
                    label={payLinkLoading === r.id ? 'Generando…' : '💳 Enviar link de pago MP'}
                    onClick={() => handleGeneratePayLink(r.id)}
                    disabled={isLoading || payLinkLoading === r.id}
                  />
                )}
                <a
                  href={`mailto:${r.guest_email}`}
                  onClick={() => setKebab(null)}
                  style={{ display: 'block', padding: '9px 16px', fontSize: '0.82rem', color: '#1a1a1a', textDecoration: 'none', borderBottom: '1px solid #f5f3ef', fontFamily: 'var(--sans)' }}
                >
                  Enviar email
                </a>
                {canCancel && (
                  <KebabItem label="Cancelar reservación" onClick={() => { setKebab(null); setCancelModal({ id: r.id, folio: r.folio }); }} destructive />
                )}
              </>
            );
          })()}
        </div>
      )}

      {error && <p style={{ color: '#c0392b', margin: '0 0 12px', fontSize: '0.82rem' }}>{error}</p>}

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
          <thead>
            <tr style={{ background: '#f5f3ef', borderBottom: '2px solid #e8e4de' }}>
              {([
                { label: 'Folio',      key: 'folio'      as SortKey },
                { label: 'Huésped',    key: null },
                { label: 'Pago',       key: null },
                { label: 'Habitación', key: null },
                { label: 'Llegada',    key: 'check_in'   as SortKey },
                { label: 'Noches',     key: null },
                { label: 'Total',      key: 'total_mxn'  as SortKey },
                { label: 'Estado',     key: null },
                { label: 'Acciones',   key: null },
              ] as { label: string; key: SortKey | null }[]).map(({ label, key }) => (
                <th
                  key={label}
                  onClick={key ? () => handleSort(key) : undefined}
                  style={{
                    padding: '10px 14px', textAlign: 'left', fontWeight: 600,
                    color: '#4a4a4a', fontSize: '0.75rem', letterSpacing: '0.04em',
                    whiteSpace: 'nowrap', cursor: key ? 'pointer' : 'default',
                    userSelect: 'none',
                  }}
                >
                  {label}{key ? sortIcon(key) : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const s          = STATUS[r.status] || { label: r.status, bg: '#f5f5f5', color: '#555' };
              const pay        = PAYMENT[r.payment_method ?? ''];
              const isLoading  = loading?.startsWith(r.id);
              const ago        = timeAgo(r.created_at);
              const needsAction = r.status === 'pending' && ago.hours >= 2;
              const isPendingMP = r.status === 'pending_payment';
              const mpWebhookLate = isPendingMP && ago.hours >= 1;

              // Guests compact: "2A · 1N"
              const guestParts: string[] = [];
              if (r.adults)   guestParts.push(`${r.adults}A`);
              if (r.children) guestParts.push(`${r.children}N`);
              const guestCompact = guestParts.join(' · ');

              // Add-ons and notes
              const addons     = parseAddons(r.notes);
              const noteClean  = cleanNotes(r.notes);

              return (
                <tr
                  key={r.id}
                  onClick={() => router.push(`/admin/reservaciones/${r.id}`)}
                  style={{
                    borderBottom: '1px solid #e8e4de',
                    background: needsAction ? '#fff5f5' : i % 2 === 0 ? '#fff' : '#fafaf8',
                    cursor: 'pointer',
                  }}
                >
                  {/* Folio */}
                  <td style={{ padding: '12px 14px' }} onClick={e => e.stopPropagation()}>
                    <Link href={`/admin/reservaciones/${r.id}`} style={{ fontFamily: 'monospace', color: '#856d47', fontWeight: 700, textDecoration: 'none', fontSize: '0.85rem' }}>
                      {r.folio}
                    </Link>
                    <div style={{ fontSize: '0.68rem', color: needsAction ? '#c62828' : '#aaa', marginTop: '2px', fontWeight: needsAction ? 700 : 400 }}>
                      {needsAction ? 'Atención requerida' : ago.text}
                    </div>
                  </td>

                  {/* Huésped */}
                  <td style={{ padding: '12px 14px', maxWidth: '200px' }}>
                    <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.guest_name}
                      {noteClean && (
                        <span
                          title={`Nota: ${noteClean}`}
                          style={{ marginLeft: '5px', fontSize: '0.65rem', color: '#b8956a', cursor: 'default' }}
                        >●</span>
                      )}
                      {addons.length > 0 && (
                        <span
                          title={`Add-ons: ${addons.join(' · ')}`}
                          style={{ marginLeft: noteClean ? '3px' : '5px', fontSize: '0.65rem', color: '#0891b2', cursor: 'default' }}
                        >●</span>
                      )}
                    </div>
                    <div style={{ color: '#6b6b6b', fontSize: '0.75rem', marginTop: '1px' }}>
                      {r.guest_phone}
                      {guestCompact && (
                        <span style={{ marginLeft: '6px', fontSize: '0.68rem', color: '#aaa' }}>{guestCompact}</span>
                      )}
                    </div>
                    {addons.length > 0 && (
                      <div style={{ marginTop: '3px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {addons.map(a => (
                          <span key={a} style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '980px', background: '#e0f2fe', color: '#0277bd', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {a}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* Pago */}
                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                    {pay ? (
                      <Pill label={pay.label} bg={pay.bg} color={pay.color} />
                    ) : (
                      <span style={{ color: '#aaa', fontSize: '0.75rem' }}>—</span>
                    )}
                    {isPendingMP && (
                      <div style={{ fontSize: '0.68rem', color: mpWebhookLate ? '#c62828' : '#1565c0', marginTop: '4px', fontWeight: 600 }}>
                        {mpWebhookLate ? 'Webhook tardó — verificar' : 'Esperando confirmación…'}
                      </div>
                    )}
                    {r.status === 'confirmed' && r.payment_method === 'online' && (
                      <div style={{ fontSize: '0.68rem', color: '#2e7d32', marginTop: '4px' }}>Pago recibido</div>
                    )}
                    {mpResendMsg[r.id] && (
                      <div style={{ fontSize: '0.68rem', color: mpResendMsg[r.id] === 'Correo reenviado' ? '#2e7d32' : '#c62828', marginTop: '3px' }}>
                        {mpResendMsg[r.id]}
                      </div>
                    )}
                    {waitlistResendMsg[r.id] && (
                      <div style={{ fontSize: '0.68rem', color: waitlistResendMsg[r.id].includes('✓') ? '#2e7d32' : '#c62828', marginTop: '3px' }}>
                        {waitlistResendMsg[r.id]}
                      </div>
                    )}
                    {payLinkMsg[r.id] && (
                      <div style={{ fontSize: '0.68rem', color: payLinkMsg[r.id].includes('✓') ? '#2e7d32' : '#c62828', marginTop: '3px' }}>
                        {payLinkMsg[r.id]}
                      </div>
                    )}
                  </td>

                  {/* Habitación */}
                  <td style={{ padding: '12px 14px', color: '#4a4a4a' }}>
                    {ROOM[r.room_type] || r.room_type}
                  </td>

                  {/* Llegada */}
                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', color: '#1a1a1a' }}>
                    {formatDate(r.check_in)}
                  </td>

                  {/* Noches */}
                  <td style={{ padding: '12px 14px', color: '#6b6b6b', textAlign: 'center' }}>
                    {r.nights ?? '—'}
                  </td>

                  {/* Total */}
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: '#1a1a1a', whiteSpace: 'nowrap' }}>
                    ${r.total_mxn.toLocaleString('es-MX')}
                  </td>

                  {/* Estado */}
                  <td style={{ padding: '12px 14px' }}>
                    <Pill label={s.label} bg={s.bg} color={s.color} />
                  </td>

                  {/* Acciones */}
                  <td style={{ padding: '12px 14px' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {/* Primary action */}
                      {(r.status === 'pending' || r.status === 'waitlist') && (
                        <ActionBtn label="Confirmar" color="#2e7d32" disabled={!!isLoading} onClick={() => openConfirmModal(r)} />
                      )}
                      {isPendingMP && (
                        <>
                          <ActionBtn
                            label={mpVerifying === r.id ? 'Verificando…' : 'Verificar MP'}
                            color="#0277bd"
                            disabled={!!isLoading || mpVerifying === r.id}
                            onClick={() => handleVerifyMp(r.id)}
                          />
                          {mpResult[r.id] && (
                            <span style={{ fontSize: '0.68rem', color: mpResult[r.id].toLowerCase().includes('confirm') ? '#2e7d32' : '#c62828' }}>
                              {mpResult[r.id]}
                            </span>
                          )}
                        </>
                      )}
                      {r.status === 'refund_pending' && (
                        <ActionBtn label="Reembolsar" color="#856d47" disabled={!!isLoading} onClick={() => openRefundModal(r)} />
                      )}

                      {/* Kebab menu trigger */}
                      {!['no_show'].includes(r.status) && (
                        <button
                          onClick={e => openKebab(e, r.id)}
                          disabled={!!isLoading}
                          style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #e0dbd4', background: '#fff', color: '#4a4a4a', fontSize: '0.9rem', cursor: isLoading ? 'not-allowed' : 'pointer', lineHeight: 1, opacity: isLoading ? 0.4 : 1 }}
                          aria-label="Más acciones"
                        >
                          ⋯
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function ActionBtn({
  label, color, disabled, onClick,
}: { label: string; color: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '5px 12px', borderRadius: '6px', border: `1px solid ${color}`,
        background: 'transparent', color, fontSize: '0.75rem', fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  );
}
