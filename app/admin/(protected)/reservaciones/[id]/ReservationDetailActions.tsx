'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { patchReservationAction, resendConfirmedEmailAction, sendReceiptAction, cleanCalendarAction, reopenReservationAction } from '../../actions';
import { addToBlacklistAction, removeFromBlacklistAction } from '../../invoice-actions';
import EditReservationModal from './EditReservationModal';
import CheckinModal from './CheckinModal';
import type { LineItem } from '@/app/lib/emails';
import { getAnticipo, getBalanceDue } from '@/app/lib/balance';

interface Reservation {
  id: string;
  folio: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  status: string;
  payment_method: string;
  payment_id?: string;
  check_in: string;
  check_out: string;
  nights: number;
  total_mxn: number;
  rooms: number;
  adults: number;
  children: number;
  room_type: string;
  notes?: string;
  line_items?: LineItem[];
  // Identidad
  id_type?: string;
  id_number?: string;
  nationality?: string;
  id_verified?: boolean;
  checkin_at?: string;
}

type ActionModal = {
  action: string;
  title: string;
  description: string;
  confirmLabel: string;
  color: string;
} | null;

type CancelReason = {
  action: string;
  label: string;
  sublabel: string;
  color: string;
};

const CANCEL_REASONS: CancelReason[] = [
  { action: 'cancel:timeout',       label: '⏰ No confirmó en 2 horas',               color: '#991B1B', sublabel: 'Sin WhatsApp ni pago — se libera la fecha' },
  { action: 'cancel:client',        label: '👤 Cancelación a solicitud del cliente',  color: '#4a4a4a', sublabel: 'Sin pago previo — no requiere reembolso' },
  { action: 'cancel:refund',        label: '💳 Cliente pagó y quiere cancelar',       color: '#1565c0', sublabel: 'Quedará como "Reembolso pendiente" — tú autorizas' },
  { action: 'cancel:mp_incomplete', label: '⏳ Pago MP no completado',                color: '#9c6700', sublabel: 'El cliente inició el pago pero no lo finalizó — sin cargo' },
  { action: 'cancel:internal',      label: '🔧 Cancelación interna',                 color: '#555',    sublabel: 'Duplicado o error de registro — NO envía correo' },
];

export default function ReservationDetailActions({
  reservation: r,
  isBlacklisted,
  blacklistReason,
}: {
  reservation: Reservation;
  isBlacklisted: boolean;
  blacklistReason?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modal, setModal] = useState<ActionModal>(null);
  const [showCancelMenu, setShowCancelMenu] = useState(false);
  const [showBlacklistForm, setShowBlacklistForm] = useState(false);
  const [blacklistReason2, setBlacklistReason2] = useState('');
  const [error, setError] = useState('');
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [receiptStatus, setReceiptStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [calCleanStatus, setCalCleanStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [calCleanMsg, setCalCleanMsg] = useState('');
  const [reopenStatus, setReopenStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');

  const handleResend = () => {
    setResendStatus('sending');
    startTransition(async () => {
      try {
        const result = await resendConfirmedEmailAction(r.id);
        setResendStatus(result.ok ? 'ok' : 'error');
        if (!result.ok) setError(result.error ?? 'Error al reenviar');
      } catch (err: unknown) {
        setResendStatus('error');
        setError(err instanceof Error ? err.message : 'Error al reenviar');
      }
      setTimeout(() => setResendStatus('idle'), 4000);
    });
  };

  const handleReceipt = () => {
    setReceiptStatus('sending');
    startTransition(async () => {
      try {
        const result = await sendReceiptAction(r.id);
        setReceiptStatus(result.ok ? 'ok' : 'error');
        if (!result.ok) setError(result.error ?? 'Error al enviar recibo');
      } catch (err: unknown) {
        setReceiptStatus('error');
        setError(err instanceof Error ? err.message : 'Error al enviar recibo');
      }
      setTimeout(() => setReceiptStatus('idle'), 4000);
    });
  };

  const doAction = (action: string) => {
    setError('');
    startTransition(async () => {
      try {
        if (action === '__reopen__') {
          await reopenReservationAction(r.id);
        } else {
          await patchReservationAction(r.id, action);
        }
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error al actualizar');
      } finally {
        setModal(null);
        setShowCancelMenu(false);
      }
    });
  };

  const btnStyle = (color: string, outline = false): React.CSSProperties => ({
    padding: '10px 20px', borderRadius: '8px', fontWeight: 600, fontSize: '0.83rem',
    cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.5 : 1,
    border: outline ? `1.5px solid ${color}` : 'none',
    background: outline ? 'transparent' : color,
    color: outline ? color : '#fff',
  });

  const handleBlacklist = () => {
    startTransition(async () => {
      try {
        await addToBlacklistAction({
          reservation_id: r.id,
          guest_email:    r.guest_email,
          guest_phone:    r.guest_phone,
          guest_name:     r.guest_name,
          reason:         blacklistReason2 || 'Sin especificar',
        });
        setShowBlacklistForm(false);
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error');
      }
    });
  };

  const handleRemoveBlacklist = () => {
    startTransition(async () => {
      try {
        await removeFromBlacklistAction(r.guest_email);
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error');
      }
    });
  };

  const canConfirm       = r.status === 'pending' || r.status === 'waitlist' || r.status === 'pending_payment';
  const canMarkPaid      = r.status === 'pending' || r.status === 'confirmed';
  const canRefund        = r.status === 'refund_pending';
  const canCancel        = !['cancelled', 'no_show', 'refund_pending', 'checked_out'].includes(r.status);
  const canNoShow        = r.status === 'confirmed';
  const canCheckout      = r.status === 'confirmed';
  const canResendReceipt = r.status === 'checked_out';
  // Check-in: huésped llegó, aún no registramos entrada
  const canCheckin       = r.status === 'confirmed' && !r.checkin_at;
  // Reabrir: solo para canceladas (permite corregir errores)
  const canReopen        = r.status === 'cancelled';
  // Limpiar evento de Calendar: solo cuando la reserva ya no es activa (evita limpiar historial útil)
  const canCleanCal      = ['cancelled', 'no_show', 'refund_pending'].includes(r.status);

  const handleCleanCalendar = () => {
    setCalCleanStatus('loading');
    setCalCleanMsg('');
    startTransition(async () => {
      try {
        const result = await cleanCalendarAction(r.id);
        if (result.ok) {
          setCalCleanStatus('ok');
          setCalCleanMsg('Evento eliminado de Google Calendar.');
        } else {
          setCalCleanStatus('error');
          setCalCleanMsg(result.error ?? 'Error al limpiar el evento.');
        }
      } catch (err: unknown) {
        setCalCleanStatus('error');
        setCalCleanMsg(err instanceof Error ? err.message : 'Error');
      }
    });
  };

  const handleReopen = () => {
    setReopenStatus('loading');
    startTransition(async () => {
      try {
        await reopenReservationAction(r.id);
        setReopenStatus('ok');
        router.refresh();
      } catch (err: unknown) {
        setReopenStatus('error');
        setError(err instanceof Error ? err.message : 'Error al reabrir');
      }
    });
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e4de', borderRadius: '14px', padding: '22px 24px' }}>
      <p style={{ margin: '0 0 12px', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#856d47' }}>
        Acciones
      </p>

      {error && <p style={{ color: '#c0392b', fontSize: '0.82rem', marginBottom: '12px' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {/* Email */}
        <a href={`mailto:${r.guest_email}`} style={{ ...btnStyle('#4a4a4a', true), textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
          ✉ Email
        </a>

        {/* Editar */}
        <button style={btnStyle('#856d47', true)} onClick={() => setShowEditModal(true)} disabled={isPending}>
          ✏️ Editar
        </button>

        {/* Reenviar correo confirmación */}
        <button
          onClick={handleResend}
          disabled={isPending || resendStatus === 'sending'}
          style={{
            ...btnStyle(
              resendStatus === 'ok' ? '#2e7d32' : resendStatus === 'error' ? '#c62828' : '#856d47',
              true
            ),
          }}
        >
          {resendStatus === 'sending' ? 'Enviando…' : resendStatus === 'ok' ? '✓ Correo enviado' : resendStatus === 'error' ? '✗ Error al enviar' : 'Reenviar correo'}
        </button>

        {/* Confirm */}
        {canConfirm && (
          <button style={btnStyle('#2e7d32')} onClick={() => {
            const anticipo = getAnticipo(r);
            const saldo    = getBalanceDue(r);
            const priceDesc = r.status === 'pending_payment'
              ? `Úsalo si ya verificaste que el pago apareció en tu app de MP. El sistema registrará la reservación como confirmada y enviará el correo "¡Pago recibido!" al cliente.`
              : [
                  `El correo de confirmación se enviará con:`,
                  `• Total: $${r.total_mxn.toLocaleString('es-MX')} MXN`,
                  anticipo ? `• Anticipo ya recibido: $${anticipo.toLocaleString('es-MX')} MXN` : null,
                  anticipo ? `• Saldo a cobrar al check-in: $${saldo.toLocaleString('es-MX')} MXN` : null,
                  ``,
                  `Verifica que el precio sea correcto antes de confirmar.`,
                ].filter(Boolean).join('\n');
            setModal({
              action: 'confirm',
              title: r.status === 'pending_payment' ? 'Confirmar pago de Mercado Pago' : 'Confirmar reservación',
              description: priceDesc,
              confirmLabel: r.status === 'pending_payment' ? '💳 Sí, confirmar pago' : '✓ Sí, confirmar',
              color: '#2e7d32',
            });
          }}>
            {r.status === 'pending_payment' ? '✓ Confirmar pago MP' : '✓ Confirmar'}
          </button>
        )}

        {/* Mark paid */}
        {canMarkPaid && (
          <button style={btnStyle('#1565c0')} onClick={() => setModal({
            action: 'mark_paid',
            title: 'Marcar como pagado',
            description: 'Registra que el cliente pagó en efectivo o transferencia en el hotel. Confirmará la reservación.',
            confirmLabel: '💵 Sí, marcar pagado',
            color: '#1565c0',
          })}>
            💵 Pagado
          </button>
        )}

        {/* Refund */}
        {canRefund && (
          <button style={btnStyle('#856d47')} onClick={() => setModal({
            action: 'refund',
            title: '¿Autorizar reembolso?',
            description: 'Se procesará el reembolso completo a través de Mercado Pago. Esta acción no se puede deshacer.',
            confirmLabel: '💳 Sí, reembolsar',
            color: '#856d47',
          })}>
            💳 Reembolsar
          </button>
        )}

        {/* Check-out */}
        {canCheckout && (
          <button style={btnStyle('#1565c0')} onClick={() => setModal({
            action: 'checkout',
            title: 'Registrar check-out',
            description: `Se marcará la reservación como completada y se enviará a ${r.guest_email} un correo de "Gracias por tu estancia" con el recibo de su estancia adjunto.`,
            confirmLabel: '✓ Sí, registrar check-out',
            color: '#1565c0',
          })}>
            ✓ Check-out
          </button>
        )}

        {/* Reenviar recibo */}
        {canResendReceipt && (
          <button
            onClick={handleReceipt}
            disabled={isPending || receiptStatus === 'sending'}
            style={{
              ...btnStyle(
                receiptStatus === 'ok' ? '#2e7d32' : receiptStatus === 'error' ? '#c62828' : '#1565c0',
                true
              ),
            }}
          >
            {receiptStatus === 'sending' ? 'Enviando…' : receiptStatus === 'ok' ? '✓ Recibo enviado' : receiptStatus === 'error' ? '✗ Error al enviar' : '📄 Reenviar recibo'}
          </button>
        )}

        {/* Check-in / Registrar entrada */}
        {canCheckin && (
          <button style={btnStyle('#040404')} onClick={() => setShowCheckinModal(true)}>
            🪪 Registrar entrada
          </button>
        )}

        {/* No show */}
        {canNoShow && (
          <button style={btnStyle('#7f8c8d', true)} onClick={() => setModal({
            action: 'no_show',
            title: 'Marcar como No Show',
            description: 'El cliente no se presentó. Se registrará para control interno. Esta acción no envía correo.',
            confirmLabel: 'Sí, marcar como no show',
            color: '#7f8c8d',
          })}>
            No show
          </button>
        )}

        {/* Cancel */}
        {canCancel && (
          <button style={btnStyle('#c62828', true)} onClick={() => setShowCancelMenu(true)}>
            Cancelar
          </button>
        )}

        {/* Reabrir reservación cancelada */}
        {canReopen && (
          <button
            style={btnStyle('#856d47', true)}
            disabled={isPending || reopenStatus === 'loading'}
            onClick={() => setModal({
              action: '__reopen__',
              title: 'Reabrir reservación',
              description: 'Cambiará el estado a "Pendiente" para que puedas gestionarla de nuevo.\n\nNota: no se reenvía correo automáticamente ni se recrea el evento de calendario. Puedes hacerlo manualmente después.',
              confirmLabel: '↩ Sí, reabrir como pendiente',
              color: '#856d47',
            })}
          >
            ↩ Reabrir
          </button>
        )}
      </div>

      {/* Blacklist status */}
      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f0ece5' }}>
        {isBlacklisted ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ background: '#ffebee', color: '#c62828', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
              🚫 En lista negra{blacklistReason ? ` — ${blacklistReason}` : ''}
            </span>
            <button onClick={handleRemoveBlacklist} disabled={isPending} style={{
              padding: '5px 12px', borderRadius: '6px', border: '1px solid #888', background: 'transparent',
              color: '#666', fontSize: '0.73rem', cursor: 'pointer',
            }}>
              Quitar de lista negra
            </button>
          </div>
        ) : (
          !showBlacklistForm ? (
            <button onClick={() => setShowBlacklistForm(true)} style={{
              padding: '6px 12px', borderRadius: '6px', border: '1px solid #c6282840',
              background: '#ffebee', color: '#c62828', fontSize: '0.73rem',
              fontWeight: 600, cursor: 'pointer',
            }}>
              🚫 Agregar a lista negra
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                autoFocus
                placeholder="Motivo (ej: pagó y no vino)"
                value={blacklistReason2}
                onChange={e => setBlacklistReason2(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '0.8rem', flex: 1, minWidth: '180px' }}
              />
              <button onClick={handleBlacklist} disabled={isPending} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#c62828', color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                Confirmar
              </button>
              <button onClick={() => setShowBlacklistForm(false)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #ddd', background: '#fff', color: '#888', fontSize: '0.78rem', cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          )
        )}
      </div>

      {/* Cancel reason menu */}
      {showCancelMenu && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', maxWidth: '420px', width: '90%', boxShadow: '0 16px 48px rgba(0,0,0,0.18)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1a1a1a', margin: '0 0 4px' }}>
              Cancelar {r.folio}
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#6b6b6b', margin: '0 0 18px' }}>
              ¿Cuál es el motivo?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {CANCEL_REASONS.map(cr => (
                <button key={cr.action} onClick={() => doAction(cr.action)} disabled={isPending} style={{
                  padding: '10px 14px', borderRadius: '10px', border: `1px solid ${cr.color}20`,
                  background: `${cr.color}08`, color: cr.color, fontSize: '0.82rem', fontWeight: 600,
                  cursor: isPending ? 'not-allowed' : 'pointer', textAlign: 'left', lineHeight: 1.4,
                }}>
                  {cr.label}
                  <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 400, opacity: 0.7 }}>{cr.sublabel}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowCancelMenu(false)} style={{ marginTop: '16px', background: 'none', border: 'none', fontSize: '0.8rem', color: '#aaa', cursor: 'pointer', width: '100%' }}>
              ← Volver sin cancelar
            </button>
          </div>
        </div>
      )}

      {/* Confirm action modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', maxWidth: '400px', width: '90%', boxShadow: '0 16px 48px rgba(0,0,0,0.18)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1a1a1a', margin: '0 0 6px' }}>{modal.title}</h3>
            <p style={{ fontSize: '0.8rem', color: '#6b6b6b', margin: '0 0 6px' }}>
              Folio: <strong style={{ color: '#856d47', fontFamily: 'monospace' }}>{r.folio}</strong> · {r.guest_name}
            </p>
            <div style={{ background: `${modal.color}0d`, border: `1px solid ${modal.color}30`, borderRadius: '8px', padding: '12px 14px', margin: '16px 0', fontSize: '0.82rem', color: '#3a3a3a', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {modal.description}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => doAction(modal.action)} disabled={isPending} style={{
                flex: 1, padding: '10px 0', borderRadius: '8px', border: 'none',
                background: modal.color, color: '#fff', fontSize: '0.85rem', fontWeight: 700,
                cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.6 : 1,
              }}>
                {isPending ? 'Procesando…' : modal.confirmLabel}
              </button>
              <button onClick={() => setModal(null)} style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #e0dbd4', background: '#fff', fontSize: '0.82rem', color: '#6b6b6b', cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {showEditModal && (
        <EditReservationModal
          reservation={r}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {/* Check-in / identity verification modal */}
      {showCheckinModal && (
        <CheckinModal
          reservationId={r.id}
          folio={r.folio}
          guestName={r.guest_name}
          checkIn={r.check_in}
          currentIdType={r.id_type}
          currentIdNumber={r.id_number}
          currentNationality={r.nationality}
          onClose={() => setShowCheckinModal(false)}
          onSuccess={() => { setShowCheckinModal(false); router.refresh(); }}
        />
      )}

      {/* ── Utilidades del evento de calendario ─────────────────────────────────
          Solo visible para reservaciones ya cerradas donde puede haber un
          evento huérfano en Google Calendar que no se borró correctamente. */}
      {canCleanCal && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f0ece5' }}>
          <p style={{ margin: '0 0 8px', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb' }}>
            Utilidades de calendario
          </p>
          <p style={{ margin: '0 0 10px', fontSize: '0.76rem', color: '#999', lineHeight: 1.5 }}>
            Si esta reservación sigue apareciendo en <strong>Google Calendar</strong> después de haber sido cancelada, usa este botón para eliminar el evento. Esto no afecta el historial de reservaciones.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={handleCleanCalendar}
              disabled={isPending || calCleanStatus === 'loading' || calCleanStatus === 'ok'}
              style={{
                padding: '7px 14px', borderRadius: '7px',
                border: '1px solid #e0dbd4', background: '#fff',
                color: calCleanStatus === 'ok' ? '#2e7d32' : calCleanStatus === 'error' ? '#c62828' : '#6b6b6b',
                fontSize: '0.78rem', fontWeight: 600, cursor: calCleanStatus === 'loading' || calCleanStatus === 'ok' ? 'not-allowed' : 'pointer',
                opacity: calCleanStatus === 'loading' ? 0.5 : 1,
              }}
            >
              {calCleanStatus === 'loading' ? 'Eliminando…'
                : calCleanStatus === 'ok' ? '✓ Evento eliminado'
                : calCleanStatus === 'error' ? '✗ Error'
                : '🗓 Eliminar evento de Google Calendar'}
            </button>
            {calCleanMsg && (
              <span style={{ fontSize: '0.75rem', color: calCleanStatus === 'ok' ? '#2e7d32' : '#c62828' }}>
                {calCleanMsg}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
