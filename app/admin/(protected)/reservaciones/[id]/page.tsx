/**
 * /admin/reservaciones/[id] — Detalle completo de una reservación
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseGet } from '@/app/lib/supabase';
import ReservationDetailActions from './ReservationDetailActions';
import InvoiceSection from './InvoiceSection';
import { getInvoicesForReservation } from '../../invoice-actions';
import { isFacturapiConfigured } from '@/app/lib/facturapi';
import { getBlacklistEntry } from '@/app/lib/blacklist';
import { getAnticipo, getBalanceDue } from '@/app/lib/balance';

interface LineItem {
  description: string;
  amount: number;
  date?: string;
  nights?: number;
}

interface EmailLogEntry {
  id: string;
  email_type: string;
  recipient_email: string;
  subject?: string;
  sent_at: string;
  opened_at?: string;
  clicked_at?: string;
  bounced_at?: string;
  delivered_at?: string;
}

interface FullReservation {
  id: string;
  folio: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  room_type: string;
  check_in: string;
  check_out: string;
  nights: number;
  adults: number;
  children: number;
  rooms: number;
  total_mxn: number;
  status: string;
  payment_method: string;
  payment_id?: string;
  paid_at?: string;
  notes?: string;
  source?: string;
  created_at: string;
  line_items?: LineItem[];
  edited_at?: string;
  edited_by?: string;
  // Identidad del huésped
  id_type?: string;
  id_number?: string;
  nationality?: string;
  date_of_birth?: string;
  id_verified?: boolean;
  id_verified_at?: string;
  checkin_at?: string;
}

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  confirmed:       { label: 'Confirmada',            bg: '#e8f5e9', color: '#2e7d32' },
  checked_out:     { label: '✓ Check-out realizado', bg: '#e3f2fd', color: '#1565c0' },
  pending:         { label: 'Pendiente',             bg: '#fff8e1', color: '#f57f17' },
  pending_payment: { label: '⏳ Pago MP en proceso',  bg: '#fff3e0', color: '#e65100' },
  waitlist:        { label: 'Lista de espera',       bg: '#f3e5f5', color: '#6a1b9a' },
  cancelled:       { label: 'Cancelada',             bg: '#f5f5f5', color: '#757575' },
  no_show:         { label: 'No se presentó',        bg: '#ffebee', color: '#c62828' },
  refund_pending:  { label: '💳 Reembolso pendiente', bg: '#fff3cd', color: '#856d47' },
};

const ROOM_LABELS: Record<string, string> = {
  suite: 'Suite Encino', doble: 'Habitación Doble', grupal: 'Habitación Grupal',
};

const PAYMENT_LABELS: Record<string, string> = {
  online: '💳 Mercado Pago (en línea)',
  pending: '🏨 Pago al llegar',
  cash: '💵 Efectivo',
  transfer: '🏦 Transferencia bancaria',
  card: '💳 Tarjeta en hotel',
};

const SOURCE_LABELS: Record<string, string> = {
  admin: '🛠 Panel de administración',
  web: '🌐 Página web',
  whatsapp: '💬 WhatsApp',
};

function fmt(n: number) {
  return n.toLocaleString('es-MX');
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

export default async function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const rows = await supabaseGet<FullReservation>('reservations', {
    id: `eq.${id}`,
    select: 'id,folio,guest_name,guest_email,guest_phone,room_type,check_in,check_out,nights,adults,children,rooms,total_mxn,status,payment_method,payment_id,paid_at,notes,source,created_at,line_items,edited_at,edited_by,id_type,id_number,nationality,date_of_birth,id_verified,id_verified_at,checkin_at',
  }, true);

  const r = rows[0];
  if (!r) notFound();

  const [invoices, blacklistEntry, emailLog] = await Promise.all([
    getInvoicesForReservation(r.id),
    getBlacklistEntry(r.guest_email),
    supabaseGet<EmailLogEntry>('email_log', {
      reservation_id: `eq.${r.id}`,
      select: 'id,email_type,recipient_email,subject,sent_at,opened_at,clicked_at,bounced_at,delivered_at',
      order: 'sent_at.desc',
    }),
  ]);

  const s = STATUS_LABELS[r.status] || { label: r.status, bg: '#f5f5f5', color: '#555' };

  const fieldStyle: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: '130px 1fr', gap: '6px 12px',
    padding: '10px 0', borderBottom: '1px solid #f0ece5',
    fontSize: '0.85rem', alignItems: 'start',
  };
  const labelStyle: React.CSSProperties = {
    color: '#999', fontWeight: 600, fontSize: '0.7rem',
    textTransform: 'uppercase', letterSpacing: '0.07em', paddingTop: '2px',
    flexShrink: 0,
  };
  const valueStyle: React.CSSProperties = {
    color: '#1a1a1a', minWidth: 0,
    overflowWrap: 'break-word', wordBreak: 'break-word',
  };

  const cardStyle: React.CSSProperties = {
    background: '#fff', border: '1px solid #e8e4de', borderRadius: '14px',
    padding: '18px 16px', overflow: 'hidden',
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <Link href="/admin/reservaciones" style={{ color: '#6b6b6b', textDecoration: 'none', fontSize: '0.85rem' }}>
          ← Reservaciones
        </Link>
        <h1 style={{ margin: 0, fontSize: '1.4rem', color: '#040404', fontFamily: 'monospace' }}>{r.folio}</h1>
        <span style={{
          background: s.bg, color: s.color,
          padding: '4px 12px', borderRadius: '980px',
          fontSize: '0.78rem', fontWeight: 700,
        }}>
          {s.label}
        </span>
      </div>

      <div style={{ display: 'grid', gap: '16px' }}>

        {/* Guest */}
        <div style={cardStyle}>
          <SectionTitle>Huésped</SectionTitle>
          <div style={fieldStyle}>
            <span style={labelStyle}>Nombre</span>
            <span style={{ ...valueStyle, fontWeight: 600, fontSize: '0.95rem' }}>{r.guest_name}</span>
          </div>
          <div style={fieldStyle}>
            <span style={labelStyle}>Email</span>
            <a href={`mailto:${r.guest_email}`} style={{ color: '#856d47', textDecoration: 'none' }}>{r.guest_email}</a>
          </div>
          <div style={fieldStyle}>
            <span style={labelStyle}>Teléfono</span>
            <span style={valueStyle}>
              {r.guest_phone
                ? <a href={`tel:${r.guest_phone}`} style={{ color: '#1a1a1a', textDecoration: 'none' }}>{r.guest_phone}</a>
                : <span style={{ color: '#bbb' }}>—</span>}
            </span>
          </div>
        </div>

        {/* Stay */}
        <div style={cardStyle}>
          <SectionTitle>Estancia</SectionTitle>
          <div style={fieldStyle}>
            <span style={labelStyle}>Habitación</span>
            <span style={valueStyle}>{ROOM_LABELS[r.room_type] || r.room_type}</span>
          </div>
          <div style={fieldStyle}>
            <span style={labelStyle}>Check-in</span>
            <span style={valueStyle}>{formatDate(r.check_in)}</span>
          </div>
          <div style={fieldStyle}>
            <span style={labelStyle}>Check-out</span>
            <span style={valueStyle}>{formatDate(r.check_out)}</span>
          </div>
          <div style={fieldStyle}>
            <span style={labelStyle}>Noches</span>
            <span style={valueStyle}>{r.nights}</span>
          </div>
          <div style={fieldStyle}>
            <span style={labelStyle}>Habitaciones</span>
            <span style={valueStyle}>{r.rooms || 1}</span>
          </div>
          <div style={fieldStyle}>
            <span style={labelStyle}>Huéspedes</span>
            <span style={valueStyle}>
              {r.adults ? `${r.adults} adulto${r.adults !== 1 ? 's' : ''}` : '—'}
              {r.children ? ` · ${r.children} niño${r.children !== 1 ? 's' : ''}` : ''}
            </span>
          </div>
          {r.notes && (
            <div style={fieldStyle}>
              <span style={labelStyle}>Notas</span>
              <span style={{ ...valueStyle, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{r.notes}</span>
            </div>
          )}
        </div>

        {/* Line items */}
        {Array.isArray(r.line_items) && r.line_items.length > 0 && (
          <div style={{ ...cardStyle, marginTop: 0 }}>
            <SectionTitle>Partidas del comprobante</SectionTitle>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', fontWeight: 700, color: '#999', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.07em', paddingBottom: '8px', borderBottom: '1px solid #f0ece5' }}>Concepto</th>
                  <th style={{ textAlign: 'right', fontWeight: 700, color: '#999', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.07em', paddingBottom: '8px', borderBottom: '1px solid #f0ece5' }}>Importe</th>
                </tr>
              </thead>
              <tbody>
                {r.line_items.map((item, i) => (
                  <tr key={i}>
                    <td style={{ padding: '8px 0 4px', color: '#1a1a1a', verticalAlign: 'top' }}>
                      {item.description}
                      {item.date && <span style={{ display: 'block', fontSize: '0.72rem', color: '#999' }}>{formatDate(item.date)}</span>}
                      {item.nights && <span style={{ display: 'block', fontSize: '0.72rem', color: '#999' }}>{item.nights} noche{item.nights !== 1 ? 's' : ''}</span>}
                    </td>
                    <td style={{ padding: '8px 0 4px', textAlign: 'right', whiteSpace: 'nowrap', color: '#1a1a1a' }}>${fmt(item.amount)} MXN</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td style={{ paddingTop: '10px', borderTop: '2px solid #e8e4de', fontWeight: 700, color: '#856d47' }}>Total</td>
                  <td style={{ paddingTop: '10px', borderTop: '2px solid #e8e4de', textAlign: 'right', fontWeight: 700, color: '#856d47' }}>${fmt(r.total_mxn)} MXN</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Check-in & Identity */}
        <div style={cardStyle}>
          <SectionTitle>Entrada y verificación de identidad</SectionTitle>

          {r.checkin_at ? (
            <>
              <div style={fieldStyle}>
                <span style={labelStyle}>Hora de entrada</span>
                <span style={{ ...valueStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '2px 10px', borderRadius: '980px', fontSize: '0.78rem', fontWeight: 700 }}>
                    ✓ Check-in registrado
                  </span>
                  {formatDateTime(r.checkin_at)}
                </span>
              </div>
              {r.id_type && (
                <div style={fieldStyle}>
                  <span style={labelStyle}>Documento</span>
                  <span style={valueStyle}>{r.id_type}{r.id_number ? ` · ${r.id_number}` : ''}</span>
                </div>
              )}
              {r.nationality && (
                <div style={fieldStyle}>
                  <span style={labelStyle}>Nacionalidad</span>
                  <span style={valueStyle}>{r.nationality}</span>
                </div>
              )}
              {r.date_of_birth && (
                <div style={fieldStyle}>
                  <span style={labelStyle}>Fecha de nacimiento</span>
                  <span style={valueStyle}>{formatDate(r.date_of_birth)}</span>
                </div>
              )}
              {r.id_verified_at && (
                <div style={fieldStyle}>
                  <span style={labelStyle}>ID verificado el</span>
                  <span style={{ ...valueStyle, color: '#2e7d32', fontSize: '0.8rem' }}>{formatDateTime(r.id_verified_at)}</span>
                </div>
              )}
            </>
          ) : r.status === 'confirmed' ? (
            <div style={{ background: '#fff8e1', border: '1px solid #f0d07040', borderRadius: '10px', padding: '12px 16px', fontSize: '0.82rem', color: '#856d47', lineHeight: 1.6 }}>
              <strong>Pendiente de registro.</strong> Cuando el huésped llegue al hotel, usa el botón <strong>🪪 Registrar entrada</strong> para capturar su identificación oficial y registrar la hora de entrada.
              {r.id_number && (
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f0d07060' }}>
                  Datos previos capturados: {r.id_type} {r.id_number}
                  {r.nationality ? ` · ${r.nationality}` : ''}
                </div>
              )}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#bbb' }}>
              {['cancelled', 'no_show'].includes(r.status)
                ? 'Sin registro de entrada (reservación no activa).'
                : 'Sin datos de identificación registrados.'}
            </p>
          )}
        </div>

        {/* Payment */}
        {(() => {
          const anticipo = getAnticipo(r);
          const saldoPendiente = anticipo !== null ? getBalanceDue(r) : null;
          const isPaidOnline = r.payment_method === 'online' && !!r.paid_at;
          return (
            <div style={cardStyle}>
              <SectionTitle>Pago</SectionTitle>
              <div style={fieldStyle}>
                <span style={labelStyle}>Total</span>
                <span style={{ ...valueStyle, fontSize: '1.25rem', fontWeight: 700, color: '#856d47' }}>${fmt(r.total_mxn)} MXN</span>
              </div>
              <div style={fieldStyle}>
                <span style={labelStyle}>Método</span>
                <span style={valueStyle}>{PAYMENT_LABELS[r.payment_method] || r.payment_method || '—'}</span>
              </div>
              {anticipo !== null && (
                <div style={fieldStyle}>
                  <span style={labelStyle}>Anticipo</span>
                  <span style={{ ...valueStyle, color: '#f57f17', fontWeight: 600 }}>${fmt(anticipo)} MXN <span style={{ fontSize: '0.72rem', color: '#999', fontWeight: 400 }}>· ya recibido</span></span>
                </div>
              )}
              {saldoPendiente !== null && !isPaidOnline && (
                <div style={fieldStyle}>
                  <span style={labelStyle}>Saldo al llegar</span>
                  <span style={{ ...valueStyle, fontSize: '1.05rem', fontWeight: 700, color: saldoPendiente > 0 ? '#2e7d32' : '#999' }}>
                    ${fmt(saldoPendiente)} MXN
                    {saldoPendiente === 0 && <span style={{ marginLeft: '8px', fontSize: '0.72rem', color: '#2e7d32', fontWeight: 600 }}>✓ pagado completo</span>}
                  </span>
                </div>
              )}
              {anticipo === null && !isPaidOnline && r.payment_method === 'pending' && (
                <div style={fieldStyle}>
                  <span style={labelStyle}>Saldo al llegar</span>
                  <span style={{ ...valueStyle, fontSize: '1.05rem', fontWeight: 700, color: '#2e7d32' }}>
                    ${fmt(r.total_mxn)} MXN
                    <span style={{ display: 'block', fontSize: '0.7rem', color: '#999', fontWeight: 400, marginTop: '2px' }}>
                      Sin anticipo registrado · si recibiste uno, agrégalo en Editar
                    </span>
                  </span>
                </div>
              )}
              {r.payment_id && (
                <div style={fieldStyle}>
                  <span style={labelStyle}>ID de pago (MP)</span>
                  <span style={{ ...valueStyle, fontFamily: 'monospace', fontSize: '0.8rem', color: '#555' }}>{r.payment_id}</span>
                </div>
              )}
              {r.paid_at && (
                <div style={fieldStyle}>
                  <span style={labelStyle}>Pagado el</span>
                  <span style={valueStyle}>{formatDateTime(r.paid_at)}</span>
                </div>
              )}
            </div>
          );
        })()}

        {/* Meta */}
        <div style={cardStyle}>
          <SectionTitle>Información del registro</SectionTitle>
          <div style={fieldStyle}>
            <span style={labelStyle}>Folio</span>
            <span style={{ ...valueStyle, fontFamily: 'monospace', fontWeight: 700, color: '#856d47' }}>{r.folio}</span>
          </div>
          <div style={fieldStyle}>
            <span style={labelStyle}>ID interno</span>
            <span style={{ ...valueStyle, fontFamily: 'monospace', fontSize: '0.75rem', color: '#999' }}>{r.id}</span>
          </div>
          <div style={fieldStyle}>
            <span style={labelStyle}>Origen</span>
            <span style={valueStyle}>{SOURCE_LABELS[r.source || ''] || r.source || '—'}</span>
          </div>
          <div style={fieldStyle}>
            <span style={labelStyle}>Creado el</span>
            <span style={valueStyle}>{formatDateTime(r.created_at)}</span>
          </div>
          {r.edited_at && (
            <div style={fieldStyle}>
              <span style={labelStyle}>Última edición</span>
              <span style={{ ...valueStyle, color: '#856d47' }}>{formatDateTime(r.edited_at)}{r.edited_by ? ` · por ${r.edited_by}` : ''}</span>
            </div>
          )}
        </div>

        {/* Email log */}
        <div style={cardStyle}>
          <SectionTitle>Correos enviados</SectionTitle>
          {emailLog.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: '#bbb', margin: 0 }}>Sin registros — los correos futuros aparecerán aquí.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', color: '#999', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', paddingBottom: '8px', borderBottom: '1px solid #f0ece5' }}>Tipo</th>
                  <th style={{ textAlign: 'left', color: '#999', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', paddingBottom: '8px', borderBottom: '1px solid #f0ece5' }}>Enviado</th>
                  <th style={{ textAlign: 'left', color: '#999', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', paddingBottom: '8px', borderBottom: '1px solid #f0ece5' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {emailLog.map(e => {
                  const typeLabel: Record<string, string> = {
                    confirmed: 'Confirmación',
                    payment_confirmed: 'Confirmación (MP)',
                    pending_cash: 'Solicitud recibida',
                    checkout: 'Recibo de estancia',
                    cancelled_timeout: 'Cancelación',
                    cancelled_client: 'Cancelación',
                    cancelled_refund: 'Cancelación + reembolso',
                    cancelled_mp: 'Cancelación (MP)',
                    cancelled_internal: 'Cancelación interna',
                    reminder: 'Recordatorio',
                    resend: 'Reenvío confirmación',
                  };
                  const label = typeLabel[e.email_type] ?? e.email_type;
                  const sentDate = new Date(e.sent_at).toLocaleString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City' });
                  const openedDate = e.opened_at ? new Date(e.opened_at).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City' }) : null;
                  const status = e.bounced_at
                    ? <span style={{ color: '#c62828', fontWeight: 600 }}>⚠ Rebotó</span>
                    : e.clicked_at
                    ? <span style={{ color: '#1565c0', fontWeight: 600 }}>🔗 Abrió link {new Date(e.clicked_at).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                    : e.opened_at
                    ? <span style={{ color: '#2e7d32', fontWeight: 600 }}>👁 Abierto {openedDate}</span>
                    : <span style={{ color: '#999' }}>✓ Enviado</span>;
                  return (
                    <tr key={e.id}>
                      <td style={{ padding: '8px 0 6px', color: '#1a1a1a', paddingRight: '16px' }}>{label}</td>
                      <td style={{ padding: '8px 0 6px', color: '#6b6b6b', paddingRight: '16px', whiteSpace: 'nowrap' }}>{sentDate}</td>
                      <td style={{ padding: '8px 0 6px' }}>{status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Actions */}
        <ReservationDetailActions
          reservation={{
            ...r,
            rooms: r.rooms || 1,
          }}
          isBlacklisted={!!blacklistEntry}
          blacklistReason={blacklistEntry?.reason}
        />


        {/* Facturación SAT */}
        <InvoiceSection
          reservation={{
            id:             r.id,
            folio:          r.folio,
            guest_name:     r.guest_name,
            guest_email:    r.guest_email,
            check_in:       r.check_in,
            nights:         r.nights,
            total_mxn:      r.total_mxn,
            payment_method: r.payment_method,
            line_items:     r.line_items,
          }}
          existingInvoices={invoices}
          configured={isFacturapiConfigured()}
        />

      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      margin: '0 0 12px', fontSize: '0.68rem', fontWeight: 700,
      letterSpacing: '0.12em', textTransform: 'uppercase', color: '#856d47',
    }}>
      {children}
    </p>
  );
}
