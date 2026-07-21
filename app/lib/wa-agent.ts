/**
 * WhatsApp AI Agent — handles reservation conversations via Groq + function calling
 *
 * Tools available to the agent:
 *   verificar_disponibilidad — checks Supabase for conflicts
 *   crear_reservacion        — creates a reservation (status=pending)
 *   generar_link_pago        — creates a Mercado Pago preference
 *   buscar_reservacion       — looks up a reservation by phone or folio
 */

// ─── Pricing ─────────────────────────────────────────────────────────────────
// TODO: el bot está DORMIDO (nunca lanzado). Sus tarifas/capacidad están
// hardcodeadas aparte y NO conocen ocupación/temporadas de hotel_settings. Al
// relanzarlo, migrar a `app/lib/pricing.ts` + `fetchPricingConfig()` para que
// cotice igual que el modal web y el servidor.
// Doble: $1,500 entre semana · $2,500 viernes/sábado/domingo
const ROOM_PRICES_WEEKDAY: Record<string, number> = {
  doble:  1500,
  suite:  1500,
  grupal: 1800,
};
const ROOM_PRICES_WEEKEND: Record<string, number> = {
  doble:  2500,
  suite:  1500,
  grupal: 1800,
};
const ROOM_LABELS: Record<string, string> = {
  doble:  'Habitación Doble',
  suite:  'Suite Encino',
  grupal: 'Habitación Grupal',
};
const ROOM_CAPACITY: Record<string, number> = {
  suite: 1, doble: 3, grupal: 1,
};

/** Viernes, sábado y domingo cuentan como noche de fin de semana */
function isWeekendNight(dateStr: string): boolean {
  const day = new Date(dateStr + 'T12:00:00').getDay(); // 0=Dom, 5=Vie, 6=Sab
  return day === 0 || day === 5 || day === 6;
}

/** Calcula el precio total noche por noche (mixto entre semana / fin de semana) */
function calcRoomPricing(
  roomType: string,
  checkIn: string,
  checkOut: string,
): { total: number; pricePerNight: number; nights: number } {
  const start = new Date(checkIn + 'T12:00:00');
  const end   = new Date(checkOut + 'T12:00:00');
  const nights = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));

  let total = 0;
  const cur = new Date(start);
  for (let i = 0; i < nights; i++) {
    const dateStr = cur.toISOString().slice(0, 10);
    const price = isWeekendNight(dateStr)
      ? (ROOM_PRICES_WEEKEND[roomType] ?? 2000)
      : (ROOM_PRICES_WEEKDAY[roomType] ?? 1500);
    total += price;
    cur.setDate(cur.getDate() + 1);
  }

  return { total, pricePerNight: nights > 0 ? Math.round(total / nights) : 0, nights };
}
const BLOCKING_STATUSES = ['pending', 'confirmed', 'pending_payment'];

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GROQ_KEY     = process.env.GROQ_ENCINO_BOT;
const BASE_URL     = (process.env.SERVER_BASE_URL || 'https://hotelelencino.com').trim().replace(/\/+$/, '');
const MP_TOKEN     = process.env.MP_ACCESS_TOKEN;

// ─── Session management (wa_sessions table) ──────────────────────────────────

type Message = { role: string; content: string | null; tool_calls?: unknown[]; tool_call_id?: string };

async function getSession(phone: string): Promise<Message[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  const url = SUPABASE_URL.trim();
  const key = SUPABASE_KEY.trim();
  const res = await fetch(`${url}/rest/v1/wa_sessions?phone=eq.${encodeURIComponent(phone)}&select=messages,updated_at`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) return [];
  const rows: { messages: Message[]; updated_at: string }[] = await res.json();
  if (!rows.length) return [];
  // Reset session if inactive for 24h
  const updatedAt = new Date(rows[0].updated_at).getTime();
  if (Date.now() - updatedAt > 24 * 60 * 60 * 1000) return [];
  return rows[0].messages ?? [];
}

async function saveSession(phone: string, messages: Message[]): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  const url = SUPABASE_URL.trim();
  const key = SUPABASE_KEY.trim();
  const kept = messages.slice(-20); // keep last 20 messages
  await fetch(`${url}/rest/v1/wa_sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ phone, messages: kept, updated_at: new Date().toISOString() }),
  }).catch(e => console.error('[WA-AGENT] saveSession error:', e));
}

// ─── Tools implementation ─────────────────────────────────────────────────────

async function toolVerificarDisponibilidad(args: {
  check_in: string; check_out: string; room_type: string;
}): Promise<object> {
  const { check_in, check_out, room_type } = args;
  if (!SUPABASE_URL || !SUPABASE_KEY) return { available: true, note: 'DB not configured' };
  const url = SUPABASE_URL.trim();
  const key = SUPABASE_KEY.trim();
  const params = new URLSearchParams({
    room_type: `eq.${room_type}`,
    check_in:  `lt.${check_out}`,
    check_out: `gt.${check_in}`,
    select:    'id',
  });
  const res = await fetch(
    `${url}/rest/v1/reservations?${params}&status=in.(${BLOCKING_STATUSES.join(',')})`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  );
  if (!res.ok) return { available: true };
  const conflicts: unknown[] = await res.json();
  const capacity  = ROOM_CAPACITY[room_type] ?? 1;
  const available_rooms = Math.max(0, capacity - conflicts.length);
  const available = available_rooms > 0;
  const { total, pricePerNight, nights } = calcRoomPricing(room_type, check_in, check_out);
  return { available, available_rooms, capacity, room_type, label: ROOM_LABELS[room_type] ?? room_type, check_in, check_out, nights, price_per_night: pricePerNight, total_mxn: total };
}

async function toolCrearReservacion(args: {
  guest_name: string; guest_email: string; guest_phone: string;
  check_in: string; check_out: string; nights: number;
  room_type: string; total_mxn: number; notes?: string;
  payment_method: 'pending' | 'online';
}): Promise<object> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return { error: 'DB not configured' };
  const url = SUPABASE_URL.trim();
  const key = SUPABASE_KEY.trim();

  // Get next folio
  const folioRes = await fetch(`${url}/rest/v1/rpc/next_folio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` },
    body: '{}',
  });
  const folio: string = folioRes.ok ? await folioRes.json() : `RSV-WA-${Date.now()}`;

  const status = args.payment_method === 'online' ? 'pending_payment' : 'pending';

  const postRes = await fetch(`${url}/rest/v1/reservations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      guest_name:     args.guest_name,
      guest_email:    args.guest_email.toLowerCase().trim(),
      guest_phone:    args.guest_phone,
      room_type:      args.room_type,
      check_in:       args.check_in,
      check_out:      args.check_out,
      nights:         args.nights,
      total_mxn:      args.total_mxn,
      adults:         1,
      children:       0,
      rooms:          1,
      notes:          args.notes ?? '',
      folio,
      status,
      source:         'whatsapp',
      payment_method: args.payment_method,
    }),
  });
  if (!postRes.ok) return { error: 'Error al crear reservación: ' + await postRes.text() };
  const rows: { id: string }[] = await postRes.json();
  const id = rows[0]?.id;
  return { success: true, folio, reservation_id: id, status, total_mxn: args.total_mxn };
}

async function toolGenerarLinkPago(args: {
  reservation_id: string; folio: string; total_mxn: number;
  guest_name: string; guest_email: string;
  check_in: string; check_out: string; nights: number; room_type: string;
}): Promise<object> {
  if (!MP_TOKEN) return { error: 'Servicio de pago no configurado' };
  const preference = {
    items: [{ title: `Reservacion Hotel El Encino - ${args.folio}`, quantity: 1, unit_price: args.total_mxn, currency_id: 'MXN' }],
    payer: { name: args.guest_name, email: args.guest_email.toLowerCase().trim() },
    back_urls: { success: `${BASE_URL}/reservacion/confirmada`, failure: BASE_URL, pending: `${BASE_URL}/reservacion/confirmada` },
    external_reference: `${args.reservation_id}|${args.folio}`,
    statement_descriptor: 'Hotel El Encino',
  };
  const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: { Authorization: `Bearer ${MP_TOKEN.trim()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(preference),
  });
  if (!mpRes.ok) return { error: 'Error MP: ' + await mpRes.text() };
  const mpData = await mpRes.json();
  // Update preference_id in reservation
  if (SUPABASE_URL && SUPABASE_KEY) {
    await fetch(`${SUPABASE_URL.trim()}/rest/v1/reservations?id=eq.${args.reservation_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY.trim(), Authorization: `Bearer ${SUPABASE_KEY.trim()}`, Prefer: 'return=minimal' },
      body: JSON.stringify({ preference_id: mpData.id }),
    });
  }
  return { success: true, payment_url: mpData.init_point, preference_id: mpData.id };
}

async function toolBuscarReservacion(args: { phone?: string; folio?: string }): Promise<object> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return { error: 'DB not configured' };
  const url = SUPABASE_URL.trim();
  const key = SUPABASE_KEY.trim();
  const filter = args.folio
    ? `folio=eq.${args.folio}`
    : `guest_phone=like.*${(args.phone ?? '').replace(/\D/g, '').slice(-10)}*`;
  const res = await fetch(
    `${url}/rest/v1/reservations?${filter}&select=folio,guest_name,status,check_in,check_out,total_mxn,payment_method&order=created_at.desc&limit=3`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  );
  if (!res.ok) return { error: 'Error al buscar reservación' };
  const rows = await res.json();
  return { found: rows.length > 0, reservations: rows };
}

// ─── Tool dispatcher ──────────────────────────────────────────────────────────

async function executeTool(name: string, args: Record<string, unknown>): Promise<object> {
  console.log(`[WA-AGENT] tool call: ${name}`, args);
  switch (name) {
    case 'verificar_disponibilidad': return toolVerificarDisponibilidad(args as Parameters<typeof toolVerificarDisponibilidad>[0]);
    case 'crear_reservacion':        return toolCrearReservacion(args as Parameters<typeof toolCrearReservacion>[0]);
    case 'generar_link_pago':        return toolGenerarLinkPago(args as Parameters<typeof toolGenerarLinkPago>[0]);
    case 'buscar_reservacion':       return toolBuscarReservacion(args as Parameters<typeof toolBuscarReservacion>[0]);
    default: return { error: `Tool desconocida: ${name}` };
  }
}

// ─── Groq tool definitions ────────────────────────────────────────────────────

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'verificar_disponibilidad',
      description: 'Verifica si hay habitaciones disponibles para las fechas solicitadas y calcula el precio total',
      parameters: {
        type: 'object',
        properties: {
          check_in:  { type: 'string', description: 'Fecha de entrada YYYY-MM-DD' },
          check_out: { type: 'string', description: 'Fecha de salida YYYY-MM-DD' },
          room_type: { type: 'string', enum: ['doble', 'suite', 'grupal'], description: 'Tipo de habitación' },
        },
        required: ['check_in', 'check_out', 'room_type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'crear_reservacion',
      description: 'Crea una nueva reservación en el sistema una vez que el huésped confirmó todos los datos',
      parameters: {
        type: 'object',
        properties: {
          guest_name:     { type: 'string' },
          guest_email:    { type: 'string', description: 'Email del huésped — REQUERIDO, debes pedirlo' },
          guest_phone:    { type: 'string', description: 'Número de teléfono con código de país' },
          check_in:       { type: 'string', description: 'YYYY-MM-DD' },
          check_out:      { type: 'string', description: 'YYYY-MM-DD' },
          nights:         { type: 'number' },
          room_type:      { type: 'string', enum: ['doble', 'suite', 'grupal'] },
          total_mxn:      { type: 'number' },
          notes:          { type: 'string' },
          payment_method: { type: 'string', enum: ['pending', 'online'], description: 'pending=paga al llegar, online=link de pago MP' },
        },
        required: ['guest_name', 'guest_email', 'guest_phone', 'check_in', 'check_out', 'nights', 'room_type', 'total_mxn', 'payment_method'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generar_link_pago',
      description: 'Genera un link de pago de Mercado Pago para una reservación ya creada',
      parameters: {
        type: 'object',
        properties: {
          reservation_id: { type: 'string' },
          folio:          { type: 'string' },
          total_mxn:      { type: 'number' },
          guest_name:     { type: 'string' },
          guest_email:    { type: 'string' },
          check_in:       { type: 'string' },
          check_out:      { type: 'string' },
          nights:         { type: 'number' },
          room_type:      { type: 'string' },
        },
        required: ['reservation_id', 'folio', 'total_mxn', 'guest_name', 'guest_email', 'check_in', 'check_out', 'nights', 'room_type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'buscar_reservacion',
      description: 'Busca reservaciones existentes del huésped por teléfono o folio',
      parameters: {
        type: 'object',
        properties: {
          phone: { type: 'string', description: 'Número de teléfono' },
          folio: { type: 'string', description: 'Folio de la reservación (ej: RSV-25)' },
        },
      },
    },
  },
];

// ─── System prompt ────────────────────────────────────────────────────────────

function systemPrompt(guestName: string): string {
  const today = new Date().toISOString().split('T')[0];
  return `Eres el agente de reservaciones de *Hotel El Encino*, Santiago, N.L. Tu nombre es Encino.
Fecha de hoy: ${today}

HOTEL:
- Ubicación: Hermenegildo Galeana 200, Centro Histórico de Santiago, N.L.
- Check-in: 3:00 PM · Check-out: 12:00 PM
- Incluye: WiFi, A/C, TV, estacionamiento, agua caliente
- WhatsApp: +52 (81) 2381 6588

HABITACIONES Y PRECIOS:
- Habitación Doble (hasta 2 personas): $1,500 entre semana · $2,500 vie/sáb/dom
- Suite Encino (1 persona o pareja, exclusiva): $1,500 MXN/noche
- Habitación Grupal (para grupos): $1,800 MXN/noche
IMPORTANTE: El precio varía por noche según el día. Siempre usa la herramienta verificar_disponibilidad para calcular el total exacto — nunca des un precio sin verificar.

ADD-ONS (menciónalos solo si el huésped pregunta o si es relevante):
- Desayuno continental para 2: +$200
- Early check-in (desde 10am): +$200
- Late check-out (hasta 2pm): +$200
- Decoración especial: +$350
- Botella de vino: +$300

CLIENTE ACTUAL: ${guestName}
SU TELÉFONO YA LO TIENES (es el que usa para WhatsApp, no lo pidas).

PROCESO DE RESERVACIÓN:
1. Pregunta fechas (check_in, check_out)
2. Verifica disponibilidad con la herramienta
3. Muestra el precio total
4. Pide: nombre completo, email
5. Pregunta: ¿pagar en línea (link MP) o al llegar en efectivo/transferencia?
6. Crea la reservación
7. Si paga en línea: genera el link y mándalo
8. Si paga al llegar: informa que tiene 2 horas para que el admin confirme; deja pending

REGLAS IMPORTANTES:
- Mensajes CORTOS (WhatsApp). Máximo 3-4 líneas por mensaje.
- Sin markdown complejo. Usa *negrita* para énfasis, saltos de línea para listas.
- SIEMPRE en español, tono cálido pero eficiente.
- NO inventes disponibilidad — siempre verifica con la herramienta.
- NO crees reservación sin tener email del huésped.
- Si el huésped pregunta por una reservación existente, búscala primero.
- Ante dudas operativas, sugiere llamar al +52 (81) 2381 6588.`;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function handleWAMessage(phone: string, name: string, message: string): Promise<string> {
  const history = await getSession(phone);

  const messages: Message[] = [
    ...history,
    { role: 'user', content: message },
  ];

  let finalText = 'Lo siento, hubo un problema. Por favor llámanos al +52 (81) 2381 6588.';

  for (let i = 0; i < 6; i++) {
    const payload = {
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt(name) },
        ...messages.map(m => {
          // Groq needs tool messages to have tool_call_id
          if (m.role === 'tool') return { role: 'tool', tool_call_id: m.tool_call_id, content: m.content };
          if (m.role === 'assistant' && m.tool_calls) return { role: 'assistant', content: m.content, tool_calls: m.tool_calls };
          return { role: m.role, content: m.content };
        }),
      ],
      tools: TOOLS,
      tool_choice: 'auto',
      max_tokens: 500,
      temperature: 0.4,
    };

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error('[WA-AGENT] Groq error:', await res.text());
      break;
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    const msg = choice?.message;

    if (!msg) break;

    if (choice.finish_reason === 'tool_calls' && msg.tool_calls?.length) {
      // Execute all tool calls
      messages.push({ role: 'assistant', content: msg.content ?? null, tool_calls: msg.tool_calls });

      for (const tc of msg.tool_calls) {
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(tc.function.arguments ?? '{}'); } catch { /* ignore */ }
        const result = await executeTool(tc.function.name, args);
        messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });
      }
      continue; // next iteration with tool results
    }

    // Text response
    finalText = msg.content ?? finalText;
    messages.push({ role: 'assistant', content: finalText });
    break;
  }

  // Save updated session (without system prompt)
  await saveSession(phone, messages);

  return finalText;
}
