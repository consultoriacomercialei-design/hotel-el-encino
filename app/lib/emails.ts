/**
 * Email functions via Resend API
 * All functions are fire-and-forget (catch errors internally)
 */

import { logEmailSent } from './supabase';
import { parseAnticipoFromNotes } from './balance';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const HOTEL_EMAIL = process.env.HOTEL_EMAIL || 'elencino_22@hotmail.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'consultoriacomercialei@gmail.com';
const FROM = 'Hotel El Encino <reservaciones@hotelelencino.com>';

export interface ReservationPayload {
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
  rooms?: number;
  notes?: string;
  source?: string;
}

export interface LineItem {
  description: string;
  amount: number;
  date?: string;
  nights?: number;
}

export interface FullReservation extends ReservationPayload {
  id: string;
  folio: string;
  status: string;
  payment_method?: string;
  payment_id?: string;
  paid_at?: string;
  line_items?: LineItem[];
  edited_at?: string;
  edited_by?: string;
  checkin_code?: string;
}

const HOTEL_PUBLIC_URL = (process.env.HOTEL_PUBLIC_URL || 'https://hotelelencino.com').replace(/\/$/, '');

/** Botón "Agregar a Wallet" para el correo (link a la página puente que detecta iPhone/Android). */
function walletButtonHtml(checkinCode?: string): string {
  if (!checkinCode) return '';
  const url = `${HOTEL_PUBLIC_URL}/wallet/${encodeURIComponent(checkinCode)}`;
  return `
          <div style="text-align:center;margin:0 0 20px">
            <a href="${url}" style="display:inline-block;padding:14px 26px;background:#283820;color:#D4AF37;text-decoration:none;border-radius:12px;font-weight:600;font-size:0.95rem">📲 Agregar mi pase a Wallet</a>
            <p style="color:#8a8a8a;font-size:0.78rem;margin:8px 0 0">Ábrelo desde tu teléfono: detecta si es iPhone o Android y guarda tu pase con QR para el check-in.</p>
          </div>`;
}

const ROOM_LABELS: Record<string, string> = {
  suite: 'Suite Encino',
  doble: 'Habitación Doble',
  grupal: 'Habitación Grupal',
};

function formatDate(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

const parseAnticipo = parseAnticipoFromNotes;

function guestRowsHtml(payload: ReservationPayload): string {
  return [
    payload.adults   ? `<p style="margin:0 0 8px"><strong>Adultos:</strong> ${payload.adults}</p>` : '',
    payload.children ? `<p style="margin:0 0 8px"><strong>Niños:</strong> ${payload.children}</p>` : '',
    payload.rooms && payload.rooms > 1 ? `<p style="margin:0 0 8px"><strong>Habitaciones:</strong> ${payload.rooms}</p>` : '',
  ].join('');
}

function guestRowsText(payload: ReservationPayload): string {
  return [
    payload.adults   ? `<p><strong>Adultos:</strong> ${payload.adults}</p>` : '',
    payload.children ? `<p><strong>Niños:</strong> ${payload.children}</p>` : '',
    payload.rooms && payload.rooms > 1 ? `<p><strong>Habitaciones:</strong> ${payload.rooms}</p>` : '',
  ].join('');
}

export function generateICS(payload: ReservationPayload, reservationId: string, folio: string): string {
  const fmt = (d: string) => d.replace(/-/g, '');
  const nowUTC = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const room = ROOM_LABELS[payload.room_type] || payload.room_type;

  const desc = [
    `Folio: ${folio}`,
    `Habitación: ${room}`,
    `Huésped: ${payload.guest_name}`,
    `Tel: ${payload.guest_phone}`,
    `Email: ${payload.guest_email}`,
    payload.adults   ? `Adultos: ${payload.adults}`   : '',
    payload.children ? `Niños: ${payload.children}`   : '',
    payload.rooms && payload.rooms > 1 ? `Habitaciones: ${payload.rooms}` : '',
    `Total: $${payload.total_mxn.toLocaleString('es-MX')} MXN`,
    payload.notes ? `Notas: ${payload.notes}` : '',
  ].filter(Boolean).join('\\n');

  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0',
    'PRODID:-//Hotel El Encino//Reservaciones//ES',
    'CALSCALE:GREGORIAN', 'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${reservationId}@hotelelencino.com`,
    `DTSTAMP:${nowUTC}`,
    `DTSTART;VALUE=DATE:${fmt(payload.check_in)}`,
    `DTEND;VALUE=DATE:${fmt(payload.check_out)}`,
    `SUMMARY:🏨 ${payload.guest_name} · ${room}`,
    `DESCRIPTION:${desc}`,
    'LOCATION:Hotel El Encino\\, Hermenegildo Galeana 200\\, Santiago\\, Nuevo León',
    'STATUS:CONFIRMED',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}

async function sendEmail(body: Record<string, unknown>): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!RESEND_API_KEY) {
    console.log('[EMAILS] Omitido (RESEND_API_KEY no configurado)');
    return { ok: false, error: 'RESEND_API_KEY no configurado' };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '(no body)');
      console.error(`[EMAILS] Error HTTP ${res.status} → to: ${JSON.stringify((body as { to?: unknown }).to)}: ${errText}`);
      return { ok: false, error: `HTTP ${res.status}: ${errText.slice(0, 200)}` };
    }
    const data = await res.json().catch(() => ({})) as { id?: string };
    return { ok: true, id: data.id };
  } catch (e) {
    console.error('[EMAILS] Error de red:', e);
    return { ok: false, error: String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIRMED — reserva confirmada (pagar al llegar)
// ─────────────────────────────────────────────────────────────────────────────

export async function sendConfirmedEmails(
  payload: ReservationPayload,
  reservationId: string,
  folio: string
) {
  const room = ROOM_LABELS[payload.room_type] || payload.room_type;
  const icsContent = generateICS(payload, reservationId, folio);
  const icsBase64 = Buffer.from(icsContent).toString('base64');
  const icsAttachment = { filename: `reservacion-${folio}.ics`, content: icsBase64 };

  const anticipo  = parseAnticipo(payload.notes);
  const saldo     = anticipo ? Math.max(0, payload.total_mxn - anticipo) : payload.total_mxn;

  const paymentBlock = anticipo
    ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 16px;margin-bottom:16px">
        <p style="margin:0 0 6px;color:#166534;font-size:0.88rem">✓ <strong>Anticipo recibido:</strong> $${anticipo.toLocaleString('es-MX')} MXN</p>
        <p style="margin:0;color:#166534;font-size:0.88rem">💳 <strong>Saldo a liquidar al check-in:</strong> $${saldo.toLocaleString('es-MX')} MXN</p>
      </div>`
    : `<p style="color:#6b6b6b;font-size:0.85rem;margin-bottom:16px">El saldo total de <strong>$${payload.total_mxn.toLocaleString('es-MX')} MXN</strong> se liquida al check-in.</p>`;

  // Notas visibles al cliente solo si NO son solo el anticipo (no mostrar info interna)
  const notesForGuest = payload.notes
    ? payload.notes.replace(/(?:anticipo|depósito|deposito|adelanto)[:\s]*\$?\s*[\d,]+/gi, '').replace(/\s{2,}/g, ' ').trim()
    : '';

  const [guestResult] = await Promise.all([
    // Huésped
    sendEmail({
      from: FROM, to: [payload.guest_email],
      subject: `Reservación confirmada — Hotel El Encino · ${folio}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#fafaf8;border-radius:16px">
          <h2 style="font-size:1.4rem;color:#040404;margin-bottom:8px">¡Reservación confirmada!</h2>
          <p style="color:#4a4a4a;margin-bottom:24px">Hola <strong>${payload.guest_name}</strong>, tu reservación en Hotel El Encino está confirmada. ¡Te esperamos!</p>
          <div style="background:#fff;border:1px solid #e8e4de;border-radius:12px;padding:20px;margin-bottom:20px">
            <p style="margin:0 0 8px"><strong>Folio:</strong> <span style="color:#856d47;font-family:monospace;font-size:1.1em">${folio}</span></p>
            <p style="margin:0 0 8px"><strong>Habitación:</strong> ${room}</p>
            <p style="margin:0 0 8px"><strong>Llegada:</strong> ${formatDate(payload.check_in)} · <span style="color:#856d47">Check-in: 3:00 PM</span></p>
            <p style="margin:0 0 8px"><strong>Salida:</strong> ${formatDate(payload.check_out)} · <span style="color:#6b6b6b">Check-out: 12:00 PM</span></p>
            <p style="margin:0 0 8px"><strong>Noches:</strong> ${payload.nights}</p>
            ${guestRowsHtml(payload)}
            <p style="margin:0"><strong>Total:</strong> $${payload.total_mxn.toLocaleString('es-MX')} MXN</p>
            ${notesForGuest ? `<p style="margin:8px 0 0;color:#6b6b6b;font-size:0.85rem"><em>${notesForGuest}</em></p>` : ''}
          </div>
          ${paymentBlock}
          <p style="color:#6b6b6b;font-size:0.85rem">📍 Hermenegildo Galeana 200, Santiago, N.L. · 📞 +52 (81) 2381 6588</p>
          <a href="https://wa.me/528123816588" style="display:inline-block;margin-top:12px;padding:10px 22px;background:#25D366;color:#fff;text-decoration:none;border-radius:980px;font-size:0.85rem">Contactar por WhatsApp</a>
        </div>
      `,
    }),
    // Hotel + Admin
    sendEmail({
      from: FROM, to: [HOTEL_EMAIL, ADMIN_EMAIL],
      subject: `🏨 Nueva reservación — ${payload.guest_name} · ${formatDate(payload.check_in)}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
          <h3>Nueva reservación confirmada</h3>
          <p><strong>Folio:</strong> ${folio}</p>
          <p><strong>Nombre:</strong> ${payload.guest_name}</p>
          <p><strong>Email:</strong> ${payload.guest_email}</p>
          <p><strong>Teléfono:</strong> ${payload.guest_phone}</p>
          <p><strong>Habitación:</strong> ${room}</p>
          <p><strong>Llegada:</strong> ${formatDate(payload.check_in)} (check-in 15:00)</p>
          <p><strong>Salida:</strong> ${formatDate(payload.check_out)} (check-out 12:00)</p>
          <p><strong>Noches:</strong> ${payload.nights}</p>
          ${guestRowsText(payload)}
          <p><strong>Total:</strong> $${payload.total_mxn.toLocaleString('es-MX')} MXN</p>
          ${anticipo ? `<p style="color:#166534"><strong>Anticipo recibido:</strong> $${anticipo.toLocaleString('es-MX')} MXN · <strong>Saldo:</strong> $${saldo.toLocaleString('es-MX')} MXN</p>` : ''}
          ${payload.notes ? `<p><strong>Notas:</strong> ${payload.notes}</p>` : ''}
          <hr />
          <p style="font-size:0.85rem;color:#856d47"><strong>${anticipo ? `Anticipo $${anticipo.toLocaleString('es-MX')} recibido. Cobrar $${saldo.toLocaleString('es-MX')} al check-in.` : 'El huésped pagará el total al llegar.'}</strong></p>
          <p style="font-size:0.8rem;color:#6b6b6b">Adjunto: .ics para abrir en calendario. O suscribe al feed: <a href="https://hotelelencino.com/api/calendar">hotelelencino.com/api/calendar</a></p>
        </div>
      `,
      attachments: [icsAttachment],
    }),
  ]);
  logEmailSent({
    reservation_id: reservationId,
    email_type: 'confirmed',
    recipient_email: payload.guest_email,
    subject: `Reservación confirmada — Hotel El Encino · ${folio}`,
    resend_id: guestResult.id,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PENDING CASH — solicitud efectivo/WhatsApp recibida, pendiente de confirmar
// ─────────────────────────────────────────────────────────────────────────────

export async function sendPendingCashEmails(
  payload: ReservationPayload,
  reservationId: string,
  folio: string
) {
  const room = ROOM_LABELS[payload.room_type] || payload.room_type;

  const [guestPendingResult] = await Promise.all([
    // Huésped: "recibimos tu solicitud, confirma por WhatsApp"
    sendEmail({
      from: FROM, to: [payload.guest_email],
      subject: `Solicitud recibida — pendiente de confirmar · ${folio}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#fafaf8;border-radius:16px">
          <h2 style="font-size:1.4rem;color:#040404;margin-bottom:8px">¡Recibimos tu solicitud!</h2>
          <p style="color:#4a4a4a;margin-bottom:24px">Hola <strong>${payload.guest_name}</strong>, ya tenemos los datos de tu reservación. Para confirmarla necesitas ponerte en contacto con nosotros por WhatsApp.</p>
          <div style="background:#fff;border:1px solid #e8e4de;border-radius:12px;padding:20px;margin-bottom:20px">
            <p style="margin:0 0 8px"><strong>Folio:</strong> <span style="color:#856d47;font-family:monospace;font-size:1.1em">${folio}</span></p>
            <p style="margin:0 0 8px"><strong>Habitación:</strong> ${room}</p>
            <p style="margin:0 0 8px"><strong>Llegada:</strong> ${formatDate(payload.check_in)} · <span style="color:#856d47">Check-in: 3:00 PM</span></p>
            <p style="margin:0 0 8px"><strong>Salida:</strong> ${formatDate(payload.check_out)} · <span style="color:#6b6b6b">Check-out: 12:00 PM</span></p>
            <p style="margin:0 0 8px"><strong>Noches:</strong> ${payload.nights}</p>
            ${guestRowsHtml(payload)}
            <p style="margin:0"><strong>Total:</strong> $${payload.total_mxn.toLocaleString('es-MX')} MXN</p>
          </div>
          <div style="background:#fff8e1;border:1px solid #f0d060;border-radius:10px;padding:14px 16px;margin-bottom:20px">
            <p style="margin:0;color:#7a5c00;font-size:0.88rem;font-weight:600">⏳ Tienes <strong>2 horas</strong> para confirmar tu reservación por WhatsApp.</p>
            <p style="margin:6px 0 0;color:#7a5c00;font-size:0.82rem">Si no recibimos tu mensaje en ese tiempo, el lugar quedará disponible para otros huéspedes.</p>
          </div>
          <a href="https://wa.me/528123816588?text=Hola%2C+quiero+confirmar+mi+reservaci%C3%B3n+${folio}" style="display:inline-block;padding:12px 28px;background:#25D366;color:#fff;text-decoration:none;border-radius:980px;font-size:0.9rem;font-weight:600">Confirmar por WhatsApp</a>
          <p style="color:#6b6b6b;font-size:0.85rem;margin-top:20px">📍 Hermenegildo Galeana 200, Santiago, N.L. · 📞 +52 (81) 2381 6588</p>
        </div>
      `,
    }),
    // Hotel + Admin: alerta clara de que ES PENDIENTE, no confirmada
    sendEmail({
      from: FROM, to: [HOTEL_EMAIL, ADMIN_EMAIL],
      subject: `🔔 NUEVA SOLICITUD — ${payload.guest_name} · ${formatDate(payload.check_in)} · efectivo/WhatsApp`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
          <h3 style="color:#7a5c00">🔔 Nueva solicitud — pendiente de confirmar por WhatsApp</h3>
          <p style="background:#fff8e1;border:1px solid #f0d060;border-radius:8px;padding:10px 14px;color:#7a5c00;font-size:0.88rem;font-weight:600">
            ⏳ El huésped eligió pago en efectivo / confirmación por WhatsApp. Tienes 2 horas para contactarlo. Hasta que confirmes desde el admin, la reservación está PENDIENTE.
          </p>
          <p><strong>Folio:</strong> ${folio}</p>
          <p><strong>Nombre:</strong> ${payload.guest_name}</p>
          <p><strong>Email:</strong> ${payload.guest_email}</p>
          <p><strong>Teléfono:</strong> <a href="https://wa.me/52${payload.guest_phone.replace(/\D/g, '')}">${payload.guest_phone}</a></p>
          <p><strong>Habitación:</strong> ${room}</p>
          <p><strong>Llegada:</strong> ${formatDate(payload.check_in)} (check-in 15:00)</p>
          <p><strong>Salida:</strong> ${formatDate(payload.check_out)} (check-out 12:00)</p>
          <p><strong>Noches:</strong> ${payload.nights}</p>
          ${guestRowsText(payload)}
          <p><strong>Total:</strong> $${payload.total_mxn.toLocaleString('es-MX')} MXN (paga al llegar)</p>
          ${payload.notes ? `<p><strong>Notas:</strong> ${payload.notes}</p>` : ''}
          <hr />
          <p style="font-size:0.85rem;color:#7a5c00"><strong>Confirma desde el panel admin una vez que el huésped te contacte por WhatsApp.</strong></p>
        </div>
      `,
    }),
  ]);
  logEmailSent({
    reservation_id: reservationId,
    email_type: 'pending_cash',
    recipient_email: payload.guest_email,
    subject: `Solicitud recibida — pendiente de confirmar · ${folio}`,
    resend_id: guestPendingResult.id,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// WAITLIST — sobrecupo
// ─────────────────────────────────────────────────────────────────────────────

export async function sendWaitlistEmails(
  payload: ReservationPayload,
  reservationId: string,
  folio: string
) {
  const room = ROOM_LABELS[payload.room_type] || payload.room_type;

  await Promise.all([
    // Admin: alerta de sobrecupo
    sendEmail({
      from: FROM, to: [HOTEL_EMAIL, ADMIN_EMAIL],
      subject: `⚠ SOBRECUPO — ${payload.guest_name} · ${formatDate(payload.check_in)} → ${formatDate(payload.check_out)} · ${folio}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
          <h3 style="color:#c0392b">⚠ Lista de espera — se necesita alojamiento alternativo</h3>
          <p><strong>Folio:</strong> ${folio}</p>
          <p><strong>Nombre:</strong> ${payload.guest_name}</p>
          <p><strong>Email:</strong> ${payload.guest_email}</p>
          <p><strong>Teléfono:</strong> ${payload.guest_phone}</p>
          <p><strong>Habitación solicitada:</strong> ${room}</p>
          <p><strong>Llegada:</strong> ${formatDate(payload.check_in)}</p>
          <p><strong>Salida:</strong> ${formatDate(payload.check_out)}</p>
          <p><strong>Noches:</strong> ${payload.nights}</p>
          ${guestRowsText(payload)}
          <p><strong>Total estimado:</strong> $${payload.total_mxn.toLocaleString('es-MX')} MXN</p>
          ${payload.notes ? `<p><strong>Notas:</strong> ${payload.notes}</p>` : ''}
          <hr />
          <p style="color:#c0392b;font-weight:bold">Acción requerida: buscar alojamiento alternativo y contactar al huésped.</p>
        </div>
      `,
    }),
    // Huésped: copy neutro
    sendEmail({
      from: FROM, to: [payload.guest_email],
      subject: `Tu solicitud en Hotel El Encino — ${folio}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#fafaf8;border-radius:16px">
          <h2 style="font-size:1.4rem;color:#040404;margin-bottom:8px">¡Recibimos tu solicitud!</h2>
          <p style="color:#4a4a4a;margin-bottom:24px">Hola <strong>${payload.guest_name}</strong>, gracias por tu interés en Hotel El Encino.</p>
          <div style="background:#fff;border:1px solid #e8e4de;border-radius:12px;padding:20px;margin-bottom:20px">
            <p style="margin:0 0 8px"><strong>Folio:</strong> <span style="color:#856d47;font-family:monospace;font-size:1.1em">${folio}</span></p>
            <p style="margin:0 0 8px"><strong>Fechas solicitadas:</strong> ${formatDate(payload.check_in)} → ${formatDate(payload.check_out)}</p>
            <p style="margin:0 0 8px"><strong>Noches:</strong> ${payload.nights}</p>
            ${guestRowsHtml(payload)}
          </div>
          <p style="color:#4a4a4a">Estamos buscando las mejores opciones para tus fechas y te contactaremos a la brevedad para confirmar los detalles.</p>
          <p style="color:#6b6b6b;font-size:0.85rem">📍 Hermenegildo Galeana 200, Santiago, N.L. · 📞 +52 (81) 2381 6588</p>
          <a href="https://wa.me/528123816588" style="display:inline-block;margin-top:12px;padding:10px 22px;background:#25D366;color:#fff;text-decoration:none;border-radius:980px;font-size:0.85rem">Contactar por WhatsApp</a>
        </div>
      `,
    }),
  ]);

  logEmailSent({ reservation_id: reservationId, email_type: 'waitlist', recipient_email: payload.guest_email });
}

// ─────────────────────────────────────────────────────────────────────────────
// PENDING PAYMENT — pago en línea iniciado
// ─────────────────────────────────────────────────────────────────────────────

export async function sendPendingPaymentEmails(
  payload: ReservationPayload,
  folio: string,
  checkoutUrl: string,
  reservationId?: string,
) {
  const room = ROOM_LABELS[payload.room_type] || payload.room_type;
  const subject = `Completa tu pago — Hotel El Encino · ${folio}`;

  const [guestResult] = await Promise.all([
    sendEmail({
      from: FROM, to: [payload.guest_email],
      subject,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#fafaf8;border-radius:16px">
          <h2 style="font-size:1.4rem;color:#040404;margin-bottom:8px">Tu reservación está pendiente de pago</h2>
          <p style="color:#4a4a4a;margin-bottom:24px">Hola <strong>${payload.guest_name}</strong>, completa tu pago para confirmar la reservación.</p>
          <div style="background:#fff;border:1px solid #e8e4de;border-radius:12px;padding:20px;margin-bottom:20px">
            <p style="margin:0 0 8px"><strong>Folio:</strong> <span style="color:#856d47;font-family:monospace;font-size:1.1em">${folio}</span></p>
            <p style="margin:0 0 8px"><strong>Habitación:</strong> ${room}</p>
            <p style="margin:0 0 8px"><strong>Llegada:</strong> ${formatDate(payload.check_in)}</p>
            <p style="margin:0 0 8px"><strong>Salida:</strong> ${formatDate(payload.check_out)}</p>
            <p style="margin:0 0 8px"><strong>Noches:</strong> ${payload.nights}</p>
            ${guestRowsHtml(payload)}
            <p style="margin:0"><strong>Total:</strong> $${payload.total_mxn.toLocaleString('es-MX')} MXN</p>
          </div>
          <a href="${checkoutUrl}" style="display:inline-block;padding:14px 32px;background:#009ee3;color:#fff;text-decoration:none;border-radius:980px;font-family:sans-serif;font-size:0.9rem;font-weight:600">Pagar ahora con Mercado Pago</a>
          <p style="color:#991B1B;font-size:0.82rem;font-weight:700;margin-top:16px">⚠ Tienes 2 horas para confirmar tu reserva por WhatsApp con un administrador, de lo contrario será liberada.</p>
          <p style="color:#6b6b6b;font-size:0.8rem;margin-top:8px">El link expira. Si tienes problemas contacta por WhatsApp.</p>
        </div>
      `,
    }),
    sendEmail({
      from: FROM, to: [HOTEL_EMAIL, ADMIN_EMAIL],
      subject: `💳 Pago en proceso — ${payload.guest_name} · ${folio}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
          <h3>Reservación con pago en línea iniciado</h3>
          <p><strong>Folio:</strong> ${folio}</p>
          <p><strong>Nombre:</strong> ${payload.guest_name}</p>
          <p><strong>Email:</strong> ${payload.guest_email}</p>
          <p><strong>Teléfono:</strong> ${payload.guest_phone}</p>
          <p><strong>Llegada:</strong> ${formatDate(payload.check_in)}</p>
          <p><strong>Salida:</strong> ${formatDate(payload.check_out)}</p>
          <p><strong>Total:</strong> $${payload.total_mxn.toLocaleString('es-MX')} MXN</p>
          <p style="color:#856d47">Estado: PENDIENTE DE PAGO — se confirmará automáticamente al recibir pago.</p>
        </div>
      `,
    }),
  ]);

  // Log to email_log so duplicate sends are visible during debugging
  if (reservationId) {
    logEmailSent({
      reservation_id:  reservationId,
      email_type:      'pending_payment',
      recipient_email: payload.guest_email,
      subject,
      resend_id:       guestResult?.id,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CANCELLED — reserva liberada por falta de confirmación o pago
// ─────────────────────────────────────────────────────────────────────────────

function cancelDetailsHtml(payload: ReservationPayload, folio: string, room: string): string {
  return `
    <div style="background:#fff;border:1px solid #e8e4de;border-radius:12px;padding:20px;margin-bottom:20px">
      <p style="margin:0 0 8px"><strong>Folio:</strong> <span style="color:#856d47;font-family:monospace">${folio}</span></p>
      <p style="margin:0 0 8px"><strong>Habitación:</strong> ${room}</p>
      <p style="margin:0 0 8px"><strong>Fechas:</strong> ${formatDate(payload.check_in)} → ${formatDate(payload.check_out)}</p>
      <p style="margin:0"><strong>Total:</strong> $${payload.total_mxn.toLocaleString('es-MX')} MXN</p>
    </div>`;
}

// Motivo: no confirmó en 2 horas (timeout WhatsApp / sin pago)
export async function sendCancelledTimeoutEmail(payload: ReservationPayload, folio: string) {
  const room = ROOM_LABELS[payload.room_type] || payload.room_type;
  await sendEmail({
    from: FROM, to: [payload.guest_email],
    subject: `Reservación liberada — Hotel El Encino · ${folio}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#fafaf8;border-radius:16px">
        <h2 style="font-size:1.3rem;color:#040404;margin-bottom:8px">Reservación liberada</h2>
        <p style="color:#4a4a4a;margin-bottom:20px">Hola <strong>${payload.guest_name}</strong>, tu reservación no pudo confirmarse y el lugar fue liberado.</p>
        ${cancelDetailsHtml(payload, folio, room)}
        <p style="color:#4a4a4a;font-size:0.88rem;line-height:1.6">
          Al hacer una reserva tienes <strong>2 horas</strong> para confirmar con un administrador por WhatsApp o completar el pago en línea. Al no recibir confirmación en ese plazo, el lugar queda disponible para otros huéspedes.
        </p>
        <p style="color:#4a4a4a;font-size:0.88rem;margin-top:12px">Si aún deseas hospedarte con nosotros, con gusto podemos hacer una nueva reservación sujeta a disponibilidad.</p>
        <a href="https://hotelelencino.com/#reservar" style="display:inline-block;margin-top:16px;padding:10px 22px;background:#856d47;color:#fff;text-decoration:none;border-radius:980px;font-size:0.85rem">Hacer nueva reservación</a>
        <p style="color:#aaa;font-size:0.78rem;margin-top:20px">📍 Hermenegildo Galeana 200, Santiago, N.L.</p>
      </div>`,
  });
}

// Motivo: cliente solicitó cancelación (sin pago previo)
export async function sendCancelledByRequestEmail(payload: ReservationPayload, folio: string) {
  const room = ROOM_LABELS[payload.room_type] || payload.room_type;
  await sendEmail({
    from: FROM, to: [payload.guest_email],
    subject: `Reservación cancelada — Hotel El Encino · ${folio}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#fafaf8;border-radius:16px">
        <h2 style="font-size:1.3rem;color:#040404;margin-bottom:8px">Reservación cancelada</h2>
        <p style="color:#4a4a4a;margin-bottom:20px">Hola <strong>${payload.guest_name}</strong>, tu reservación fue cancelada según lo solicitado.</p>
        ${cancelDetailsHtml(payload, folio, room)}
        <p style="color:#4a4a4a;font-size:0.88rem;line-height:1.6">Esperamos tenerte como huésped en una próxima ocasión.</p>
        <a href="https://hotelelencino.com/#reservar" style="display:inline-block;margin-top:16px;padding:10px 22px;background:#856d47;color:#fff;text-decoration:none;border-radius:980px;font-size:0.85rem">Hacer nueva reservación</a>
        <p style="color:#aaa;font-size:0.78rem;margin-top:20px">📍 Hermenegildo Galeana 200, Santiago, N.L.</p>
      </div>`,
  });
}

// Motivo: cliente pagó en línea y solicita cancelación → reembolso pendiente de autorización
export async function sendCancelledRefundPendingEmail(
  payload: ReservationPayload,
  folio: string,
  paymentId?: string
) {
  const room = ROOM_LABELS[payload.room_type] || payload.room_type;
  const referenceBlock = paymentId
    ? `<p style="margin:8px 0 0;color:#6b6b6b;font-size:0.82rem">Número de referencia MP: <strong style="font-family:monospace">${paymentId}</strong></p>`
    : '';
  await sendEmail({
    from: FROM, to: [payload.guest_email],
    subject: `Cancelación recibida — reembolso en proceso · ${folio}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#fafaf8;border-radius:16px">
        <h2 style="font-size:1.3rem;color:#040404;margin-bottom:8px">Cancelación recibida</h2>
        <p style="color:#4a4a4a;margin-bottom:20px">Hola <strong>${payload.guest_name}</strong>, recibimos tu solicitud de cancelación.</p>
        ${cancelDetailsHtml(payload, folio, room)}
        <div style="background:#fff8e1;border:1px solid #f0e68c;border-radius:10px;padding:16px;margin-bottom:20px">
          <p style="margin:0;color:#856d47;font-size:0.88rem;line-height:1.6">
            <strong>Reembolso en proceso:</strong> Tu pago está siendo revisado por el equipo de Hotel El Encino.
            Una vez autorizado, el reembolso será procesado por Mercado Pago directamente a tu método de pago original.
            Los tiempos de acreditación dependen de tu banco (generalmente 3–10 días hábiles).
          </p>
          ${referenceBlock}
        </div>
        <p style="color:#4a4a4a;font-size:0.88rem">Si tienes dudas sobre tu reembolso, comunícate con nosotros mencionando tu folio <strong>${folio}</strong>.</p>
        <a href="https://wa.me/528123816588" style="display:inline-block;margin-top:16px;padding:10px 22px;background:#25D366;color:#fff;text-decoration:none;border-radius:980px;font-size:0.85rem">Contactar por WhatsApp</a>
        <p style="color:#aaa;font-size:0.78rem;margin-top:20px">📍 Hermenegildo Galeana 200, Santiago, N.L.</p>
      </div>`,
  });
}

// Motivo: pago MP iniciado pero no completado (checkout abandonado, link expirado)
export async function sendCancelledMpIncompleteEmail(payload: ReservationPayload, folio: string) {
  const room = ROOM_LABELS[payload.room_type] || payload.room_type;
  await sendEmail({
    from: FROM, to: [payload.guest_email],
    subject: `Pago no completado — Hotel El Encino · ${folio}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#fafaf8;border-radius:16px">
        <h2 style="font-size:1.3rem;color:#040404;margin-bottom:8px">Tu pago no se completó</h2>
        <p style="color:#4a4a4a;margin-bottom:20px">Hola <strong>${payload.guest_name}</strong>, el proceso de pago no se finalizó y el lugar quedó disponible.</p>
        ${cancelDetailsHtml(payload, folio, room)}
        <div style="background:#f0f4ff;border:1px solid #c7d2fe;border-radius:10px;padding:16px;margin-bottom:20px">
          <p style="margin:0;color:#3730a3;font-size:0.88rem;line-height:1.6">
            <strong>No se realizó ningún cargo.</strong> El enlace de pago expiró o el proceso fue interrumpido antes de completarse.
            Si deseas hospedarte con nosotros, puedes hacer una nueva reservación en cualquier momento.
          </p>
        </div>
        <a href="https://hotelelencino.com/#reservar" style="display:inline-block;margin-top:4px;padding:12px 28px;background:#856d47;color:#fff;text-decoration:none;border-radius:980px;font-size:0.88rem;font-weight:600">Reservar de nuevo</a>
        <p style="color:#6b6b6b;font-size:0.82rem;margin-top:20px">¿Tuviste algún problema con el pago? Escríbenos por WhatsApp y con gusto te ayudamos.</p>
        <a href="https://wa.me/528123816588" style="display:inline-block;padding:9px 20px;background:#25D366;color:#fff;text-decoration:none;border-radius:980px;font-size:0.82rem">WhatsApp</a>
        <p style="color:#aaa;font-size:0.78rem;margin-top:20px">📍 Hermenegildo Galeana 200, Santiago, N.L.</p>
      </div>`,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT CONFIRMED — webhook MP confirmó el pago
// ─────────────────────────────────────────────────────────────────────────────

export async function sendPaymentConfirmedEmails(reservation: FullReservation) {
  const room = ROOM_LABELS[reservation.room_type] || reservation.room_type;
  const icsContent = generateICS(reservation, reservation.id, reservation.folio);
  const icsBase64 = Buffer.from(icsContent).toString('base64');
  const icsAttachment = { filename: `reservacion-${reservation.folio}.ics`, content: icsBase64 };

  const [guestMpResult] = await Promise.all([
    sendEmail({
      from: FROM, to: [reservation.guest_email],
      subject: `¡Pago recibido! Reservación confirmada — Hotel El Encino · ${reservation.folio}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#fafaf8;border-radius:16px">
          <h2 style="font-size:1.4rem;color:#040404;margin-bottom:8px">¡Pago recibido — reservación confirmada!</h2>
          <p style="color:#4a4a4a;margin-bottom:24px">Hola <strong>${reservation.guest_name}</strong>, tu pago fue procesado exitosamente. ¡Te esperamos!</p>
          <div style="background:#fff;border:1px solid #e8e4de;border-radius:12px;padding:20px;margin-bottom:20px">
            <p style="margin:0 0 8px"><strong>Folio:</strong> <span style="color:#856d47;font-family:monospace;font-size:1.1em">${reservation.folio}</span></p>
            <p style="margin:0 0 8px"><strong>Habitación:</strong> ${room}</p>
            <p style="margin:0 0 8px"><strong>Llegada:</strong> ${formatDate(reservation.check_in)}</p>
            <p style="margin:0 0 8px"><strong>Salida:</strong> ${formatDate(reservation.check_out)}</p>
            <p style="margin:0 0 8px"><strong>Noches:</strong> ${reservation.nights}</p>
            ${guestRowsHtml(reservation)}
            <p style="margin:0"><strong>Total pagado:</strong> $${reservation.total_mxn.toLocaleString('es-MX')} MXN</p>
          </div>
          ${walletButtonHtml(reservation.checkin_code)}
          <p style="color:#6b6b6b;font-size:0.85rem">📍 Hermenegildo Galeana 200, Santiago, N.L. · 📞 +52 (81) 2381 6588</p>
          <a href="https://wa.me/528123816588" style="display:inline-block;margin-top:12px;padding:10px 22px;background:#25D366;color:#fff;text-decoration:none;border-radius:980px;font-size:0.85rem">Contactar por WhatsApp</a>
        </div>
      `,
      attachments: [icsAttachment],
    }),
    sendEmail({
      from: FROM, to: [HOTEL_EMAIL, ADMIN_EMAIL],
      subject: `✅ PAGO CONFIRMADO — ${reservation.guest_name} · ${reservation.folio}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
          <h3 style="color:#27ae60">✅ Pago recibido — reservación confirmada</h3>
          <p><strong>Folio:</strong> ${reservation.folio}</p>
          <p><strong>Nombre:</strong> ${reservation.guest_name}</p>
          <p><strong>Email:</strong> ${reservation.guest_email}</p>
          <p><strong>Teléfono:</strong> ${reservation.guest_phone}</p>
          <p><strong>Habitación:</strong> ${room}</p>
          <p><strong>Llegada:</strong> ${formatDate(reservation.check_in)}</p>
          <p><strong>Salida:</strong> ${formatDate(reservation.check_out)}</p>
          <p><strong>Total cobrado:</strong> $${reservation.total_mxn.toLocaleString('es-MX')} MXN</p>
          <p><strong>Payment ID:</strong> ${reservation.payment_id || 'N/A'}</p>
          ${reservation.notes ? `<p><strong>Notas:</strong> ${reservation.notes}</p>` : ''}
        </div>
      `,
      attachments: [icsAttachment],
    }),
  ]);
  logEmailSent({
    reservation_id: reservation.id,
    email_type: 'payment_confirmed',
    recipient_email: reservation.guest_email,
    subject: `¡Pago recibido! Reservación confirmada — Hotel El Encino · ${reservation.folio}`,
    resend_id: guestMpResult.id,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// REMINDER — recordatorio 90 min: reserva pending sin confirmar
// ─────────────────────────────────────────────────────────────────────────────

export async function sendReminderEmails(reservation: {
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
  rooms?: number;
  notes?: string;
}) {
  const room = ROOM_LABELS[reservation.room_type] || reservation.room_type;
  const waConfirmUrl = `https://wa.me/528123816588?text=${encodeURIComponent(
    `Hola, quiero confirmar mi reservación ${reservation.folio}. Llego el ${reservation.check_in}.`
  )}`;
  const waGuestUrl = reservation.guest_phone
    ? `https://wa.me/52${reservation.guest_phone.replace(/\D/g, '')}`
    : null;

  await Promise.all([
    // Huésped: urgencia, link directo a WhatsApp
    sendEmail({
      from: FROM,
      to: [reservation.guest_email],
      subject: `⏰ Tu reservación expira pronto — confírmala ahora · ${reservation.folio}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#fafaf8;border-radius:16px">
          <h2 style="font-size:1.4rem;color:#040404;margin-bottom:8px">¡Tu reservación está por expirar!</h2>
          <p style="color:#4a4a4a;margin-bottom:20px">Hola <strong>${reservation.guest_name}</strong>, tu solicitud en Hotel El Encino aún está pendiente de confirmar y <strong>expira en aproximadamente 30 minutos</strong>.</p>
          <div style="background:#fff8e1;border:1px solid #f0d060;border-radius:10px;padding:14px 16px;margin-bottom:20px">
            <p style="margin:0;color:#7a5c00;font-weight:600;font-size:0.9rem">⚠️ Si no confirmas pronto, el lugar quedará disponible para otros huéspedes.</p>
          </div>
          <div style="background:#fff;border:1px solid #e8e4de;border-radius:12px;padding:20px;margin-bottom:20px">
            <p style="margin:0 0 8px"><strong>Folio:</strong> <span style="color:#856d47;font-family:monospace;font-size:1.1em">${reservation.folio}</span></p>
            <p style="margin:0 0 8px"><strong>Habitación:</strong> ${room}</p>
            <p style="margin:0 0 8px"><strong>Llegada:</strong> ${formatDate(reservation.check_in)} · <span style="color:#856d47">Check-in: 3:00 PM</span></p>
            <p style="margin:0 0 8px"><strong>Salida:</strong> ${formatDate(reservation.check_out)} · <span style="color:#6b6b6b">Check-out: 12:00 PM</span></p>
            <p style="margin:0 0 8px"><strong>Noches:</strong> ${reservation.nights}</p>
            ${reservation.adults ? `<p style="margin:0 0 8px"><strong>Adultos:</strong> ${reservation.adults}</p>` : ''}
            ${reservation.children ? `<p style="margin:0 0 8px"><strong>Niños:</strong> ${reservation.children}</p>` : ''}
            <p style="margin:0"><strong>Total:</strong> $${reservation.total_mxn.toLocaleString('es-MX')} MXN</p>
          </div>
          <a href="${waConfirmUrl}" style="display:inline-block;padding:14px 32px;background:#25D366;color:#fff;text-decoration:none;border-radius:980px;font-size:1rem;font-weight:700">Confirmar por WhatsApp ahora</a>
          <p style="color:#6b6b6b;font-size:0.8rem;margin-top:20px">Si ya no deseas la reservación, simplemente ignora este correo y el lugar se liberará automáticamente.</p>
          <p style="color:#6b6b6b;font-size:0.85rem">📍 Hermenegildo Galeana 200, Santiago, N.L. · 📞 +52 (81) 2381 6588</p>
        </div>
      `,
    }),
    // Admin: alerta con datos de contacto directo
    sendEmail({
      from: FROM,
      to: [HOTEL_EMAIL, ADMIN_EMAIL],
      subject: `⏰ ${reservation.folio} lleva 90 min sin confirmar — ${reservation.guest_name}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
          <h3 style="color:#7a5c00">⏰ Reservación sin confirmar — expira en ~30 min</h3>
          <p style="background:#fff8e1;border:1px solid #f0d060;border-radius:8px;padding:10px 14px;color:#7a5c00;font-size:0.88rem;font-weight:600">
            Esta reservación lleva 90 minutos en estado pendiente. Si no la confirmas desde el admin antes de las 2 horas, se cancelará automáticamente.
          </p>
          <p><strong>Folio:</strong> ${reservation.folio}</p>
          <p><strong>Nombre:</strong> ${reservation.guest_name}</p>
          <p><strong>Email:</strong> <a href="mailto:${reservation.guest_email}">${reservation.guest_email}</a></p>
          <p><strong>Teléfono:</strong> ${waGuestUrl ? `<a href="${waGuestUrl}">${reservation.guest_phone}</a>` : reservation.guest_phone}</p>
          <p><strong>Habitación:</strong> ${room}</p>
          <p><strong>Llegada:</strong> ${formatDate(reservation.check_in)}</p>
          <p><strong>Salida:</strong> ${formatDate(reservation.check_out)} · ${reservation.nights} noches</p>
          <p><strong>Total:</strong> $${reservation.total_mxn.toLocaleString('es-MX')} MXN</p>
          ${reservation.notes ? `<p><strong>Notas:</strong> ${reservation.notes}</p>` : ''}
          <hr />
          <p style="font-size:0.85rem">
            ${waGuestUrl ? `<a href="${waGuestUrl}" style="padding:10px 20px;background:#25D366;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Contactar por WhatsApp</a>` : ''}
            &nbsp;
            <a href="https://hotelelencino.com/admin/reservaciones" style="padding:10px 20px;background:#856d47;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Abrir Admin</a>
          </p>
        </div>
      `,
    }),
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECKOUT — gracias por tu estancia + recibo informal
// ─────────────────────────────────────────────────────────────────────────────

const PAYMENT_LABELS_RECEIPT: Record<string, string> = {
  online:   'Mercado Pago (en línea)',
  cash:     'Efectivo',
  transfer: 'Transferencia bancaria',
  card:     'Tarjeta en hotel',
  pending:  'Pago al llegar',
};

export async function sendCheckoutEmail(r: FullReservation): Promise<{ ok: boolean; error?: string }> {
  const room = ROOM_LABELS[r.room_type] || r.room_type;
  const paymentMethod = PAYMENT_LABELS_RECEIPT[r.payment_method ?? ''] || r.payment_method || 'No especificado';
  const paidDate = r.paid_at
    ? new Date(r.paid_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;
  const paymentRow = paidDate
    ? `<p style="margin:0 0 8px;font-size:0.85rem"><strong>Fecha de pago:</strong> ${paidDate}</p>`
    : '';
  const guestCount = [
    r.adults   ? `${r.adults} adulto${r.adults !== 1 ? 's' : ''}` : '',
    r.children ? `${r.children} niño${r.children !== 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ');

  // Determine whether to render a line-items breakdown
  const items = Array.isArray(r.line_items) && r.line_items.length > 0 ? r.line_items : null;

  const chargesHtml = items
    ? `
      <table style="width:100%;border-collapse:collapse;font-size:0.85rem;margin-bottom:6px">
        <thead>
          <tr>
            <th style="text-align:left;font-weight:700;color:#4a4a4a;padding:4px 0;border-bottom:1px solid #f0ece5">Concepto</th>
            <th style="text-align:right;font-weight:700;color:#4a4a4a;padding:4px 0;border-bottom:1px solid #f0ece5">Importe</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td style="padding:8px 0 4px;color:#1a1a1a;vertical-align:top">
                ${item.description}
                ${item.date ? `<br><span style="font-size:0.75rem;color:#999">${formatDate(item.date)}</span>` : ''}
                ${item.nights ? `<br><span style="font-size:0.75rem;color:#999">${item.nights} noche${item.nights !== 1 ? 's' : ''}</span>` : ''}
              </td>
              <td style="padding:8px 0 4px;text-align:right;white-space:nowrap;color:#1a1a1a">$${item.amount.toLocaleString('es-MX')} MXN</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td style="padding:10px 0 0;border-top:2px solid #e8e4de;font-weight:700;font-size:1rem;color:#856d47">Total pagado</td>
            <td style="padding:10px 0 0;border-top:2px solid #e8e4de;text-align:right;font-weight:700;font-size:1rem;color:#856d47">$${r.total_mxn.toLocaleString('es-MX')} MXN</td>
          </tr>
        </tfoot>
      </table>
    `
    : `
      <p style="margin:0 0 8px;font-size:0.85rem"><strong>Noches:</strong> ${r.nights}</p>
      ${guestCount ? `<p style="margin:0 0 8px;font-size:0.85rem"><strong>Huéspedes:</strong> ${guestCount}</p>` : ''}
      ${r.rooms && r.rooms > 1 ? `<p style="margin:0 0 8px;font-size:0.85rem"><strong>Habitaciones:</strong> ${r.rooms}</p>` : ''}
      <div style="border-top:1px solid #f0ece5;margin:14px 0"></div>
      <p style="margin:0 0 8px;font-size:0.85rem"><strong>Forma de pago:</strong> ${paymentMethod}</p>
      ${paymentRow}
      <p style="margin:0;font-size:1.1rem;font-weight:700;color:#856d47">
        Total pagado: $${r.total_mxn.toLocaleString('es-MX')} MXN
      </p>
    `;

  const result = await sendEmail({
    from: FROM,
    to:   [r.guest_email],
    subject: `Recibo de tu estancia — Hotel El Encino · ${r.folio}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#fafaf8;border-radius:16px">

        <h2 style="font-size:1.5rem;color:#040404;margin:0 0 6px">¡Gracias por quedarte con nosotros, ${r.guest_name}!</h2>
        <p style="color:#6b6b6b;margin:0 0 28px;font-size:0.95rem">Fue un placer hospedarte en Hotel El Encino. Esperamos verte pronto. 🏨</p>

        <!-- Recibo -->
        <div style="background:#fff;border:1px solid #e8e4de;border-radius:14px;padding:22px 24px;margin-bottom:20px">

          <p style="margin:0 0 14px;font-size:0.68rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#856d47">
            Recibo de tu estancia
          </p>

          <p style="margin:0 0 8px;font-size:0.85rem"><strong>Folio:</strong>
            <span style="color:#856d47;font-family:monospace;font-size:1rem;font-weight:700">${r.folio}</span>
          </p>
          <p style="margin:0 0 8px;font-size:0.85rem"><strong>Check-in:</strong> ${formatDate(r.check_in)}</p>
          <p style="margin:0 0 8px;font-size:0.85rem"><strong>Check-out:</strong> ${formatDate(r.check_out)}</p>

          ${items
            ? `<p style="margin:0 0 12px;font-size:0.85rem"><strong>Estancias incluidas:</strong></p>${chargesHtml}`
            : `<p style="margin:0 0 8px;font-size:0.85rem"><strong>Habitación:</strong> ${room}</p>${chargesHtml}`
          }

          ${items ? `
            <div style="margin-top:12px;border-top:1px solid #f0ece5;padding-top:10px">
              <p style="margin:0 0 8px;font-size:0.85rem"><strong>Forma de pago:</strong> ${paymentMethod}</p>
              ${paymentRow}
            </div>
          ` : ''}
        </div>

        <!-- Nota fiscal -->
        <p style="font-size:0.78rem;color:#999;margin:0 0 24px">
          Recibo de pago, sin validez fiscal.
        </p>

        <!-- CTAs -->
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:24px">
          <a href="https://wa.me/528123816588" style="display:inline-block;padding:10px 20px;background:#25D366;color:#fff;text-decoration:none;border-radius:980px;font-size:0.85rem;font-weight:600">
            Escríbenos en WhatsApp
          </a>
          <a href="https://g.page/r/CYF4JxWqQ2M8EBM/review" style="display:inline-block;padding:10px 20px;background:#fff;border:1.5px solid #e8e4de;color:#4a4a4a;text-decoration:none;border-radius:980px;font-size:0.85rem;font-weight:600">
            ⭐ Déjanos una reseña
          </a>
        </div>

        <p style="font-size:0.78rem;color:#aaa;margin:0">
          📍 Hermenegildo Galeana 200, Santiago, N.L. · 📞 +52 (81) 2381 6588 · hotelelencino.com
        </p>
      </div>
    `,
  });
  logEmailSent({
    reservation_id: r.id,
    email_type: 'checkout',
    recipient_email: r.guest_email,
    subject: `Recibo de tu estancia — Hotel El Encino · ${r.folio}`,
  });
  return result;
}
