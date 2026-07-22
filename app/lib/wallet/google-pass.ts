/**
 * Google Wallet — pase "Save to Google Wallet" de una reserva del hotel, vía
 * JWT firmado (skinny JWT: GenericClass + GenericObject embebidos, sin llamadas
 * REST). Sin dependencia npm — solo node:crypto. El QR es el mismo checkin_code
 * que el pase de Apple.
 *
 * Env (reusa las del dueño, mismo issuer que Santiapp):
 *   GOOGLE_WALLET_ISSUER_ID · GOOGLE_WALLET_SA_JSON_B64 (o GOOGLE_WALLET_SA_JSON)
 */
import { createSign } from 'node:crypto';

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

function loadServiceAccount(): ServiceAccount | null {
  try {
    const b64 = process.env.GOOGLE_WALLET_SA_JSON_B64;
    const raw = b64
      ? Buffer.from(b64, 'base64').toString('utf8')
      : process.env.GOOGLE_WALLET_SA_JSON;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ServiceAccount;
    if (!parsed.client_email || !parsed.private_key) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function googleWalletConfigured(): boolean {
  return Boolean(process.env.GOOGLE_WALLET_ISSUER_ID && loadServiceAccount());
}

export interface GoogleHotelPassInput {
  reservationId: string;
  checkinCode: string;
  folio: string;
  guestName: string;
  roomLabel: string;
  guests: number;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function safeId(s: string): string {
  return s.replace(/[^A-Za-z0-9_.-]/g, '_');
}

const HOTEL_BASE = (process.env.HOTEL_PUBLIC_URL || 'https://hotelelencino.com').replace(/\/$/, '');

/** URL "Save to Google Wallet" para una reserva del hotel. */
export function buildGoogleHotelSaveUrl(input: GoogleHotelPassInput): string {
  const issuer = process.env.GOOGLE_WALLET_ISSUER_ID;
  const sa = loadServiceAccount();
  if (!issuer || !sa) throw new Error('google_wallet_env_missing');

  const classId = `${issuer}.hotel_el_encino`;
  const objectId = `${issuer}.res_${safeId(input.reservationId)}`;

  const genericClass: Record<string, unknown> = { id: classId };

  const genericObject: Record<string, unknown> = {
    id: objectId,
    classId,
    state: 'ACTIVE',
    cardTitle: { defaultValue: { language: 'es-419', value: 'Hotel El Encino' } },
    subheader: { defaultValue: { language: 'es-419', value: input.roomLabel } },
    header: { defaultValue: { language: 'es-419', value: input.folio } },
    textModulesData: [
      { id: 'checkin', header: 'LLEGADA', body: input.checkIn },
      { id: 'checkout', header: 'SALIDA', body: input.checkOut },
      { id: 'guests', header: 'HUÉSPEDES', body: String(input.guests) },
      { id: 'holder', header: 'A NOMBRE DE', body: input.guestName },
    ],
    barcode: {
      type: 'QR_CODE',
      value: input.checkinCode,
      alternateText: 'Muestra este código en recepción',
    },
    hexBackgroundColor: '#283820',
    logo: {
      sourceUri: { uri: `${HOTEL_BASE}/logo.png` },
      contentDescription: {
        defaultValue: { language: 'es-419', value: 'Hotel El Encino' },
      },
    },
    linksModuleData: {
      uris: [
        {
          uri: `${HOTEL_BASE}/wallet/${encodeURIComponent(input.checkinCode)}`,
          description: 'Ver mi reservación',
          id: 'reserva-web',
        },
      ],
    },
  };

  const claims = {
    iss: sa.client_email,
    aud: 'google',
    typ: 'savetowallet',
    iat: Math.floor(Date.now() / 1000),
    origins: [HOTEL_BASE],
    payload: {
      genericClasses: [genericClass],
      genericObjects: [genericObject],
    },
  };

  const header = { alg: 'RS256', typ: 'JWT' };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
  const signature = createSign('RSA-SHA256').update(signingInput).sign(sa.private_key);
  return `https://pay.google.com/gp/v/save/${signingInput}.${b64url(signature)}`;
}
