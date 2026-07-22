/**
 * Pase de Apple Wallet (.pkpass) tipo `generic` de una reserva del Hotel El
 * Encino. El QR es el `checkin_code` opaco — el mismo valor que valida el
 * escáner del admin al hacer check-in.
 *
 * Certificados en env (base64 de PEM) — nunca en el repo. Reusa los del dueño
 * (misma cuenta Apple que Santiapp), puestos en el Vercel del hotel:
 *   WALLET_SIGNER_CERT · WALLET_SIGNER_KEY · WALLET_SIGNER_KEY_PASSWORD(opc)
 *   WALLET_WWDR_CERT · WALLET_PASS_TYPE_ID · WALLET_TEAM_ID
 */
import { PKPass } from 'passkit-generator';
import { WALLET_MODEL_IMAGES } from './model-images';

export interface HotelPassInput {
  serial: string; // reservation id — serialNumber del pase
  checkinCode: string; // contenido del QR
  folio: string;
  guestName: string;
  roomLabel: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
}

const GREEN = 'rgb(40,56,32)'; // #283820 verde marca
const WHITE = 'rgb(255,255,255)';
const GOLD = 'rgb(212,175,55)'; // #D4AF37 dorado

function requireEnvB64(name: string): Buffer {
  const v = process.env[name];
  if (!v) throw new Error(`wallet_env_missing:${name}`);
  return Buffer.from(v, 'base64');
}

/** true si los certificados de Apple Wallet están configurados. */
export function walletConfigured(): boolean {
  return Boolean(
    process.env.WALLET_SIGNER_CERT &&
      process.env.WALLET_SIGNER_KEY &&
      process.env.WALLET_WWDR_CERT &&
      process.env.WALLET_PASS_TYPE_ID &&
      process.env.WALLET_TEAM_ID
  );
}

function fmtDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00-06:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(d);
}

export async function buildHotelPass(input: HotelPassInput): Promise<Buffer> {
  const certificates = {
    wwdr: requireEnvB64('WALLET_WWDR_CERT'),
    signerCert: requireEnvB64('WALLET_SIGNER_CERT'),
    signerKey: requireEnvB64('WALLET_SIGNER_KEY'),
    signerKeyPassphrase: process.env.WALLET_SIGNER_KEY_PASSWORD || undefined,
  };

  const images: Record<string, Buffer> = {};
  for (const [name, b64] of Object.entries(WALLET_MODEL_IMAGES)) {
    images[name] = Buffer.from(b64, 'base64');
  }

  const pass = new PKPass(images, certificates, {
    passTypeIdentifier: process.env.WALLET_PASS_TYPE_ID!,
    teamIdentifier: process.env.WALLET_TEAM_ID!,
    serialNumber: input.serial,
    organizationName: 'Hotel El Encino',
    description: `Reservación — ${input.folio}`,
    logoText: 'Hotel El Encino',
    backgroundColor: GREEN,
    foregroundColor: WHITE,
    labelColor: GOLD,
  });

  pass.type = 'generic';

  pass.setBarcodes({
    message: input.checkinCode,
    format: 'PKBarcodeFormatQR',
    messageEncoding: 'iso-8859-1',
  });

  pass.primaryFields.push({
    key: 'folio',
    label: 'RESERVACIÓN',
    value: input.folio,
  });

  pass.secondaryFields.push(
    { key: 'checkin', label: 'LLEGADA', value: fmtDate(input.checkIn) },
    { key: 'checkout', label: 'SALIDA', value: fmtDate(input.checkOut) }
  );

  pass.auxiliaryFields.push(
    { key: 'room', label: 'HABITACIÓN', value: input.roomLabel },
    { key: 'holder', label: 'A NOMBRE DE', value: input.guestName }
  );

  return pass.getAsBuffer();
}
