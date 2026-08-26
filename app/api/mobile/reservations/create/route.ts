import { NextRequest, NextResponse } from 'next/server';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import { supabasePost, getNextFolio } from '@/app/lib/supabase';
import { sendHotelPush } from '@/app/lib/apns-hotel';
import { parseOccupancy, quoteExpress, roomAvailability } from '@/app/lib/express-quote';
import { sendConfirmedEmails, type ReservationPayload } from '@/app/lib/emails';
import { createCalendarEvent, type CalendarPayload } from '@/app/lib/google-calendar';
import { recordManualPartialPayment } from '@/app/lib/payments';

export const dynamic = 'force-dynamic';

// POST /api/mobile/reservations/create — reserva EXPRÉS (walk-in) desde la
// app. b16: ocupación POR habitación [{adults,children}], cuartos físicos
// opcionales pre-asignados, aforo y topes validados server-side, y el cargo
// por adulto extra persistido aparte (occupancy_surcharge_mxn, como en b12).
// El total sigue siendo negociable: si el staff lo editó, ese manda.
export async function POST(req: NextRequest) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const b = (await req.json().catch(() => ({}))) as {
    guest_name?: string; guest_phone?: string; guest_email?: string;
    occupancy?: unknown; assigned_rooms?: unknown;
    adults?: number; rooms?: number; room_type?: string;
    check_in?: string; check_out?: string; total_mxn?: number; notes?: string;
    /** b22: pago recibido en el mostrador, registrado en el MISMO request. */
    payment_received?: { amount_mxn?: number | string; method?: string };
    /** b22: correo de confirmación al huésped (default true si hay correo). */
    notify?: boolean;
  };

  const name = (b.guest_name ?? '').trim().slice(0, 120);
  const checkIn = b.check_in ?? '';
  const checkOut = b.check_out ?? '';
  const total = Number(b.total_mxn);
  if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut) || checkOut <= checkIn) {
    console.error('[create] 400 payload', JSON.stringify({ name: name.slice(0, 20), checkIn, checkOut, total }));
    return NextResponse.json({ success: false, error: 'Faltan nombre o fechas válidas' }, { status: 400 });
  }
  if (!Number.isFinite(total) || total < 0 || total > 500_000) {
    return NextResponse.json({ success: false, error: 'Total inválido' }, { status: 400 });
  }

  let occupancy;
  try {
    // Compat con clientes viejos (b11-): sin occupancy[], adults plano = 1 hab.
    occupancy = parseOccupancy(
      Array.isArray(b.occupancy) && b.occupancy.length > 0
        ? b.occupancy
        : [{ adults: Math.min(Math.max(Number(b.adults) || 2, 1), 20), children: 0 }]
    );
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Ocupación inválida' }, { status: 400 });
  }

  let quote;
  let availability;
  try {
    [quote, availability] = await Promise.all([
      quoteExpress({ checkIn, checkOut, occupancy }),
      roomAvailability({ checkIn, checkOut }),
    ]);
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'No se pudo cotizar' }, { status: 400 });
  }

  // Aforo real en el rango.
  const roomsLeft = availability.totalRooms - availability.occupiedCount;
  if (occupancy.length > roomsLeft) {
    return NextResponse.json(
      { success: false, error: `Solo quedan ${Math.max(roomsLeft, 0)} habitación(es) libres en esas fechas` },
      { status: 409 }
    );
  }

  // Cuartos físicos pre-asignados (opcionales): existen, libres, ≤ habitaciones.
  const wanted = [...new Set(
    (Array.isArray(b.assigned_rooms) ? b.assigned_rooms : [])
      .filter((r): r is string => typeof r === 'string')
      .map((r) => r.trim())
      .filter(Boolean)
  )];
  if (wanted.length > occupancy.length) {
    return NextResponse.json(
      { success: false, error: `La reserva es de ${occupancy.length} habitación(es); no puedes asignar ${wanted.length}` },
      { status: 400 }
    );
  }
  const knownFree = new Set(availability.freeRooms);
  const clash = wanted.find((w) => !knownFree.has(w));
  if (clash) {
    return NextResponse.json(
      { success: false, error: availability.taken.has(clash)
          ? `El ${clash} ya está tomado por otra reserva en esas fechas`
          : availability.blocked.has(clash)
            ? `El ${clash} está bloqueado por mantenimiento`
            : `El cuarto "${clash}" no existe` },
      { status: 409 }
    );
  }

  const adults = occupancy.reduce((s, o) => s + o.adults, 0);
  const children = occupancy.reduce((s, o) => s + o.children, 0);
  const nights = quote.nights;

  const phone = (b.guest_phone ?? '').trim().slice(0, 30);
  const email = (b.guest_email ?? '').trim().slice(0, 120);
  const roomType = (b.room_type ?? 'doble').slice(0, 40);
  const notes = (b.notes ?? '').slice(0, 500);

  const folio = await getNextFolio();
  const row = await supabasePost<{ id: string; folio: string }>('reservations', {
    folio,
    guest_name: name,
    guest_phone: phone || null,
    guest_email: email || null,
    adults,
    children,
    occupancy,
    room_type: roomType,
    rooms: occupancy.length,
    assigned_rooms: wanted.length > 0 ? wanted : null,
    room: wanted[0] ?? null,
    check_in: checkIn,
    check_out: checkOut,
    nights,
    total_mxn: total,
    occupancy_surcharge_mxn: quote.surcharge_mxn,
    status: 'confirmed',
    source: 'walk-in-app',
    notes: notes || null,
  });
  if (!row) return NextResponse.json({ success: false, error: 'No se pudo crear' }, { status: 500 });

  // b22: pago del mostrador en el MISMO request (patrón del admin web). Antes
  // la app lo mandaba en una segunda llamada con `try?`: si fallaba, el dinero
  // se perdía en silencio y nadie se enteraba.
  let paidMxn = 0;
  let paymentError: string | null = null;
  const pay = b.payment_received;
  const payAmount = Number(pay?.amount_mxn);
  const payMethod = pay?.method ?? '';
  if (pay && Number.isFinite(payAmount) && payAmount > 0) {
    if (!['efectivo', 'terminal', 'transferencia'].includes(payMethod)) {
      paymentError = 'Método de pago inválido';
    } else if (payAmount > total + 0.01) {
      paymentError = 'El pago excede el total de la reserva';
    } else {
      const result = await recordManualPartialPayment({
        reservationId: row.id,
        amountMxn: payAmount,
        method: payMethod,
        registeredBy: staff.full_name,
      });
      if (result) paidMxn = result.paid;
      else paymentError = 'No se pudo registrar el pago';
    }
  }

  // b22: confirmación al huésped + evento en el calendario del hotel — las dos
  // cosas que el admin web SIEMPRE ha hecho y la reserva exprés nunca hizo
  // (RSV-186 se creó sin avisarle a la huésped). Awaited: Vercel congela la
  // función al responder y un envío suelto se pierde (incidente 24-ago).
  const wantsEmail = b.notify !== false && !!email;
  let emailSent = false;
  let emailError: string | null = null;
  {
    const calPayload: CalendarPayload = {
      guest_name: name, guest_phone: phone, guest_email: email,
      room_type: roomType, check_in: checkIn, check_out: checkOut,
      total_mxn: total, adults, children, rooms: occupancy.length, notes,
    };
    const mailPayload: ReservationPayload = {
      guest_name: name, guest_email: email, guest_phone: phone,
      room_type: roomType, check_in: checkIn, check_out: checkOut,
      nights, total_mxn: total, adults, children,
      rooms: occupancy.length, notes, source: 'walk-in-app',
    };
    const results = await Promise.allSettled([
      createCalendarEvent(calPayload, row.folio, '2'),
      wantsEmail
        ? sendConfirmedEmails(mailPayload, row.id, row.folio, { guestOnly: true, paidMxn })
        : Promise.resolve(null),
    ]);
    if (results[0].status === 'rejected') {
      console.error('[create] calendario falló (reserva ya guardada)', results[0].reason);
    }
    if (wantsEmail) {
      emailSent = results[1].status === 'fulfilled';
      if (!emailSent) {
        emailError = 'No se pudo enviar el correo al huésped';
        console.error('[create] correo al huésped falló', (results[1] as PromiseRejectedResult).reason);
      }
    }
  }

  // b11: aviso push al staff — AWAITED (Vercel congela tras responder;
  // un push sin await muere por timeout — incidente 24-ago).
  await sendHotelPush({
    title: `Reserva nueva · ${row.folio}`,
    body: `${name} · ${nights} noche(s) · $${Math.round(total).toLocaleString('es-MX')} · llega ${checkIn} (creada por ${staff.full_name})`,
  }).catch(() => undefined);

  return NextResponse.json({
    success: true,
    data: {
      id: row.id,
      folio: row.folio,
      suggested_total: quote.total_mxn,
      paid_mxn: paidMxn,
      email_sent: emailSent,
      // La reserva SÍ se creó: estos avisos son para que el mostrador sepa qué
      // quedó pendiente, no errores que tumben la operación.
      warnings: [paymentError, emailError].filter((w): w is string => !!w),
    },
  });
}
