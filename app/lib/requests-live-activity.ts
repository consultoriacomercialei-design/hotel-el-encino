/**
 * Live Activity de solicitudes de servicio (El Encino Manager b9).
 * Regla de la spec: UNA sola activity — muestra la request más VIEJA abierta
 * + contador "+N más"; botones Tomar/Listo viven en la extensión iOS.
 *
 * Tokens (hotel_live_activity_tokens):
 *  - kind 'requests_start'  → push-to-start token del dispositivo (inicia la activity).
 *  - kind 'requests_update' → token de la activity VIVA (updates/end); lo reporta
 *    la app al arrancar la activity. Se borra al terminar o morir.
 * Best-effort en todos los caminos: jamás rompe el flujo que lo llama.
 */

import { supabaseGet } from './supabase';
import { sendLiveActivityEvent } from './apns-hotel';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TYPE_LABEL: Record<string, string> = {
  limpieza: 'Limpieza de habitación',
  toallas: 'Toallas extra',
  agua: 'Agua embotellada',
  problema: 'Reporte de problema',
  otro: 'Otra solicitud',
};

/** Nombre EXACTO del struct ActivityAttributes en la extensión iOS. */
const ATTRIBUTES_TYPE = 'RequestsActivityAttributes';

interface OpenRequest {
  id: string;
  room_number: string;
  request_type: string;
  note: string | null;
  status: string;
  created_at: string;
}

interface TokenRow { token: string; kind: string; user_id: string | null }

async function deleteToken(token: string): Promise<void> {
  if (!SUPABASE_URL || !SERVICE_KEY) return;
  await fetch(
    `${SUPABASE_URL}/rest/v1/hotel_live_activity_tokens?token=eq.${encodeURIComponent(token)}`,
    {
      method: 'DELETE',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Prefer: 'return=minimal' },
    }
  ).catch(() => undefined);
}

/**
 * Reconcilia la Live Activity con el estado real de las solicitudes.
 * `alertNew` = true cuando entra una request nueva (suena en la isla).
 */
export async function syncRequestsLiveActivity(alertNew = false): Promise<void> {
  try {
    const [open, tokens] = await Promise.all([
      supabaseGet<OpenRequest>('service_requests', {
        select: 'id,room_number,request_type,note,status,created_at',
        status: 'in.(pending,in_progress)',
        order: 'created_at.asc',
        limit: '50',
      }),
      supabaseGet<TokenRow>('hotel_live_activity_tokens', {
        select: 'token,kind,user_id',
        limit: '100',
      }),
    ]);

    const updateTokens = tokens.filter((t) => t.kind === 'requests_update');
    const startTokens = tokens.filter((t) => t.kind === 'requests_start');

    if (open.length === 0) {
      // Nada abierto: terminar activities vivas y olvidar sus tokens.
      await Promise.all(
        updateTokens.map(async (t) => {
          const r = await sendLiveActivityEvent({
            token: t.token,
            event: 'end',
            contentState: emptyState(),
          });
          if (r.ok || r.dead) await deleteToken(t.token);
        })
      );
      return;
    }

    const oldest = open[0];
    const contentState = {
      requestId: oldest.id,
      room: oldest.room_number,
      request: TYPE_LABEL[oldest.request_type] ?? oldest.request_type,
      note: oldest.note ?? '',
      status: oldest.status,
      startedAt: oldest.created_at,
      extraCount: open.length - 1,
    };
    const alert = alertNew
      ? {
          title: `Habitación ${oldest.room_number}`,
          body: contentState.request,
          sound: 'default',
        }
      : undefined;

    // Updates a las activities vivas.
    const liveUserIds = new Set<string>();
    await Promise.all(
      updateTokens.map(async (t) => {
        const r = await sendLiveActivityEvent({
          token: t.token,
          event: 'update',
          contentState,
          alert,
        });
        if (r.dead) await deleteToken(t.token);
        else if (r.ok && t.user_id) liveUserIds.add(t.user_id);
      })
    );

    // Start SOLO en dispositivos de usuarios sin activity viva (evita duplicados).
    await Promise.all(
      startTokens
        .filter((t) => !t.user_id || !liveUserIds.has(t.user_id))
        .map(async (t) => {
          const r = await sendLiveActivityEvent({
            token: t.token,
            event: 'start',
            attributesType: ATTRIBUTES_TYPE,
            attributes: {},
            contentState,
            alert,
          });
          if (r.dead) await deleteToken(t.token);
        })
    );
  } catch (err) {
    console.error('[requests-live-activity] sync failed', err);
  }
}

function emptyState() {
  return {
    requestId: '',
    room: '',
    request: '',
    note: '',
    status: 'resolved',
    startedAt: new Date().toISOString(),
    extraCount: 0,
  };
}
