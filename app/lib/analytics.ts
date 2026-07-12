/**
 * GA4 event helpers — safe to call from client components.
 * gtag is loaded globally in layout.tsx; this module just wraps calls
 * with a safety check so they don't throw on SSR or if GA is blocked.
 */

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtag?: (...args: any[]) => void;
  }
}

function track(eventName: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', eventName, params);
}

// ── Booking funnel ────────────────────────────────────────────────────────────

/** Fired when the booking modal is opened */
export function trackBeginCheckout(roomType: string, nights: number, value: number) {
  track('begin_checkout', {
    currency: 'MXN',
    value,
    items: [{ item_id: 'habitacion', item_name: roomType, quantity: nights, price: value / Math.max(nights, 1) }],
  });
}

/** Fired when a reservation is confirmed (MP payment approved or manual) */
export function trackPurchase(folio: string, value: number, paymentMethod: 'mercadopago' | 'hotel') {
  track('purchase', {
    transaction_id: folio,
    currency: 'MXN',
    value,
    payment_type: paymentMethod,
    items: [{ item_id: 'habitacion', item_name: 'Habitación Hotel El Encino', quantity: 1, price: value }],
  });
}

// ── Directorio ────────────────────────────────────────────────────────────────

/** Fired when a listing detail page is viewed */
export function trackListingView(slug: string, name: string, category: string) {
  track('view_item', {
    items: [{ item_id: slug, item_name: name, item_category: category }],
  });
}

/** Fired when the directory search query changes (debounced by caller) */
export function trackDirectorySearch(query: string) {
  if (!query || query.length < 2) return;
  track('search', { search_term: query });
}

/** Fired when a category filter is selected */
export function trackCategoryFilter(category: string) {
  track('select_content', { content_type: 'directorio_category', item_id: category });
}

// ── CTAs ─────────────────────────────────────────────────────────────────────

/** Fired on WhatsApp / phone / website link clicks */
export function trackCtaClick(cta: 'whatsapp' | 'phone' | 'website' | 'instagram' | 'facebook', context: string) {
  track('cta_click', { cta_type: cta, cta_context: context });
}

/** Fired when push notification subscription is toggled */
export function trackPushToggle(action: 'subscribed' | 'unsubscribed') {
  track('push_notification', { action });
}

// ── Booking modal ─────────────────────────────────────────────────────────────

/** Fired when the booking modal is opened */
export function trackModalOpen() {
  track('booking_modal_open');
}

/** Fired when the booking modal is closed without completing a reservation */
export function trackModalAbandon(step: string) {
  track('booking_modal_abandon', { step });
}

// ── AI Chat ───────────────────────────────────────────────────────────────────

/** Fired when the AI chat widget is opened */
export function trackChatOpen() {
  track('ai_chat_open');
}
