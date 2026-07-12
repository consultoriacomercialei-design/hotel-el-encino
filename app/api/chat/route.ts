import { NextRequest, NextResponse } from 'next/server';
import { limiters, getClientIP, tooManyRequests, isPayloadTooLarge } from '@/app/lib/rate-limit';

const SYSTEM_PROMPT = `Eres el asistente virtual de Hotel El Encino, un boutique hotel en el Centro Histórico de Santiago, Nuevo León, México.

INFORMACIÓN DEL HOTEL:
- Nombre: Hotel El Encino
- Ubicación: Hermenegildo Galeana 200, Santiago, Nuevo León, Centro Histórico
- A minutos del Parque La Huasteca, el Cañón de la Huasteca y el centro de Santiago
- WhatsApp: +52 (81) 2381 6588

HABITACIONES:
- Contamos con habitaciones dobles, familiares y suites
- Capacidad hasta 4 personas por habitación
- Todas incluyen WiFi, A/C, TV, agua caliente
- Estacionamiento incluido en el hotel

SERVICIOS INCLUIDOS EN LA TARIFA:
- Check-in: 3:00 PM (15:00 hrs) / Check-out: 12:00 PM
- Estacionamiento privado gratuito
- WiFi de alta velocidad en todo el hotel
- Áreas comunes y terraza
- Agua caliente y A/C en todas las habitaciones

SERVICIOS NO INCLUIDOS (se cobran por separado):
- Desayuno: NO está incluido en la tarifa (se puede contratar como add-on al reservar)
- Room service: NO disponible
- Alberca: el hotel NO cuenta con alberca
- Spa: el hotel NO cuenta con spa
- Bar o restaurante dentro del hotel: NO disponible — hay excelentes opciones a pasos del hotel
- Lavandería: NO disponible en el hotel
- Transfer aeropuerto: NO incluido (se puede contratar como add-on al reservar)

ADD-ONS DISPONIBLES AL RESERVAR (se agregan en el proceso de reserva):
- 🥐 Desayuno continental para 2 personas (café, fruta y pan)
- ⏰ Late check-out — salida hasta las 2:00 PM (check-out regular es 12:00 PM)
- 🌅 Early check-in — entrada desde las 10:00 AM (check-in regular es 15:00 hrs)
- 🎉 Decoración especial (globos, flores y mensaje personalizado) — ideal para cumpleaños y aniversarios
- 🍷 Botella de vino de bienvenida

ATRACCIONES CERCANAS:
- Parroquia de Santiago (a pasos)
- Parque La Huasteca (15 min)
- Cañón de la Huasteca (15 min)
- Cascadas de Cola de Caballo (20 min)
- Festival Cielo Mágico (temporada octubre-noviembre)
- Zona de restaurantes y bares del centro (a pasos)

POLÍTICAS:
- No se permiten mascotas
- No smoking dentro de las habitaciones
- Al hacer una reserva, el huésped tiene 2 horas para confirmar por WhatsApp con un administrador, de lo contrario la reserva se libera
- Check-in anticipado y late check-out solo con reservación y sujeto a disponibilidad

INSTRUCCIONES:
- Responde SIEMPRE en español, de forma amable, cálida y concisa (máximo 3-4 oraciones)
- NO menciones precios, tarifas ni costos bajo ninguna circunstancia — para eso invita a hacer una reserva en la página o a contactar por WhatsApp
- Cuando pregunten por servicios NO incluidos (alberca, spa, restaurante, desayuno, lavandería, etc.), sé honesto y claro: indica que no está disponible o que se cobra por separado, y menciona que algunos add-ons se pueden agregar al reservar en línea
- Para disponibilidad específica, invita a usar el botón "Reservar" en la página
- Si no sabes algo, di honestamente que no tienes esa información y sugiere contactar por WhatsApp
- Mantén un tono hospitalario y cálido, como si fuera el recepcionista del hotel`;

export async function POST(req: NextRequest) {
  if (!limiters.chat(getClientIP(req))) return tooManyRequests(60);
  if (isPayloadTooLarge(req, 20_000)) return NextResponse.json({ error: 'Payload demasiado grande' }, { status: 413 });

  try {
    const body = await req.json().catch(() => ({}));
    const message = body?.message;
    const rawHistory = Array.isArray(body?.history) ? body.history : [];

    if (!message || typeof message !== 'string' || message.length > 500) {
      return NextResponse.json({ error: 'Mensaje inválido' }, { status: 400 });
    }

    // Validate and sanitize history: cap at 10 items, each role+content string capped
    const history = rawHistory
      .slice(-10)
      .filter((m: unknown) =>
        m !== null && typeof m === 'object' &&
        typeof (m as { role?: unknown }).role === 'string' &&
        typeof (m as { content?: unknown }).content === 'string'
      )
      .map((m: { role: string; content: string }) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content.slice(0, 1000),
      }));

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.slice(-6),
      { role: 'user', content: message as string },
    ];

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_ENCINO_BOT}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content ?? '';

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json(
      { reply: 'Lo siento, hubo un problema. Por favor contáctanos por WhatsApp al +52 (81) 2381 6588.' },
      { status: 200 }
    );
  }
}
