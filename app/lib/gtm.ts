/**
 * Type-safe dataLayer utility — Hotel El Encino
 *
 * Compliant with Google Tag Platform Enhanced Conversions spec:
 * https://developers.google.com/tag-platform/tag-manager/enhanced-conversions
 *
 * All PII is hashed with SHA-256 (WebCrypto) before hitting the wire.
 */

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtag?: (...args: any[]) => void;
  }
}

// ── Core push ────────────────────────────────────────────────────────────────

export function pushDataLayer(obj: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(obj);
}

// ── Enhanced Conversions — SHA-256 hashing ──────────────────────────────────

/** SHA-256 hash per Google's Enhanced Conversions spec (lowercase hex) */
export async function sha256(value: string): Promise<string> {
  const normalized = value.trim().toLowerCase();
  const encoded = new TextEncoder().encode(normalized);
  const buffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Normalize Mexican phone numbers to E.164 format before hashing */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+52${digits}`;
  if (digits.length === 12 && digits.startsWith('52')) return `+${digits}`;
  return `+${digits}`;
}

/**
 * Push hashed user_data to dataLayer.
 * MUST be called BEFORE the purchase event for Enhanced Conversions to work.
 *
 * GTM reads this via the "user_data" DataLayer variable.
 * Google Ads uses it to improve conversion matching.
 */
export async function pushEnhancedUserData({
  email,
  phone,
  guestName,
}: {
  email: string;
  phone: string;
  guestName: string;
}): Promise<void> {
  const parts = guestName.trim().split(/\s+/);
  const firstName = (parts[0] ?? '').toLowerCase();
  const lastName = parts.slice(1).join(' ').toLowerCase() || undefined;

  const [hashedEmail, hashedPhone] = await Promise.all([
    sha256(email),
    sha256(normalizePhone(phone)),
  ]);

  pushDataLayer({
    event: 'user_data',
    user_data: {
      email: hashedEmail,
      phone_number: hashedPhone,
      address: {
        first_name: firstName,
        ...(lastName && { last_name: lastName }),
        country: 'MX',
      },
    },
  });
}

// ── Ecommerce events ─────────────────────────────────────────────────────────

/**
 * GA4 purchase event — triggers GTM "purchase" trigger.
 * Configure your Google Ads conversion action in GTM to fire on this event.
 */
export function pushPurchase({
  folio,
  total,
  roomLabel,
  nights,
}: {
  folio: string;
  total: number;
  roomLabel: string;
  nights: number;
}): void {
  pushDataLayer({
    event: 'purchase',
    ecommerce: {
      transaction_id: folio,
      value: total,
      currency: 'MXN',
      items: [
        {
          item_id: 'habitacion-encino',
          item_name: roomLabel,
          item_category: 'Habitación',
          quantity: nights,
          price: Math.round(total / Math.max(nights, 1)),
        },
      ],
    },
  });
}

// ── Google Ads direct conversion (belt-and-suspenders) ──────────────────────

/**
 * Fire a Google Ads conversion directly via gtag.
 * Use this as fallback while the GTM conversion tag is being configured.
 * Once GTM is fully set up, this becomes a no-op safety net.
 */
export function fireGAdsConversion({
  sendTo,
  value,
  transactionId,
}: {
  sendTo: string;
  value: number;
  transactionId: string;
}): void {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', 'conversion', {
    send_to: sendTo,
    value,
    currency: 'MXN',
    transaction_id: transactionId,
  });
}
