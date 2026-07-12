'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { buildWhatsAppUrl } from '@/app/lib/whatsapp';
import { trackBeginCheckout, trackPurchase, trackModalOpen, trackModalAbandon } from '@/app/lib/analytics';

// ─────────────────────────────────────────────────────────────────────────────
// PRICING ENGINE
// ─────────────────────────────────────────────────────────────────────────────

// Defaults — overridden at runtime by /api/public/hotel-config if the DB has settings
const PRICE_WEEKDAY            = 1_500;
const PRICE_WEEKEND            = 2_500;
const PRICE_EXTRA_ADULT        =   500;
const PRICE_SPECIAL_EXTRA      =   500;
const PRICE_SEMANA_SANTA_FLAT  = 3_000;

interface PriceConfig {
  weekday: number;
  weekend: number;
  extra_adult: number;
  special_extra: number;
  semana_santa: number;
}

interface AddonConfig {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  unitPrice: number;
  perNight: boolean;
  perPerson?: boolean;
  active?: boolean;
}

interface HotelConfig {
  prices: PriceConfig;
  addons: AddonConfig[];
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD-ONS
// ─────────────────────────────────────────────────────────────────────────────

interface Addon {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  unitPrice: number;
  perNight: boolean;
  perPerson?: boolean; // multiplied by adults count
  active?: boolean;
}

const ADDONS: Addon[] = [
  { id: 'breakfast',      icon: '🥐', title: 'Desayuno continental',    subtitle: '$280 por persona · café, fruta y pan',         unitPrice: 280, perNight: true, perPerson: true },
  { id: 'late_checkout',  icon: '⏰', title: 'Late check-out',          subtitle: 'Salida hasta las 2:00 PM (regular: 12:00 PM)',  unitPrice: 350, perNight: false },
  { id: 'early_checkin',  icon: '🌅', title: 'Early check-in',          subtitle: 'Entrada desde las 10:00 AM (regular: 3:00 PM)', unitPrice: 350, perNight: false },
  { id: 'decoration',     icon: '🎉', title: 'Decoración especial',     subtitle: 'Globos, flores y mensaje personalizado',       unitPrice: 650, perNight: false },
  { id: 'wine',           icon: '🍷', title: 'Botella de vino',         subtitle: 'Vino tinto o blanco de bienvenida',            unitPrice: 480, perNight: false },
];

// Semana Santa: rangos exactos por año (actualizar cada enero)
const SEMANA_SANTA_RANGES = [
  { from: '2025-04-12', to: '2025-04-20' }, // Sáb Lázaro → Dom Pascua 2025
  { from: '2026-03-28', to: '2026-04-05' }, // Sáb Lázaro → Dom Pascua 2026
];

const SPECIAL_MONTHS = [
  { months: [9],        label: 'Fiestas Patrias'    },
  { months: [10, 11],   label: 'Cielo Mágico'       },
  { months: [12],       label: 'Temporada Navideña' },
  { months: [1],        label: 'Año Nuevo'          },
];

function specialLabel(d: Date) {
  const iso = d.toISOString().slice(0, 10);
  if (SEMANA_SANTA_RANGES.some(r => iso >= r.from && iso <= r.to)) return 'Semana Santa';
  const m = d.getMonth() + 1;
  return SPECIAL_MONTHS.find(p => p.months.includes(m))?.label ?? null;
}
function isWeekend(d: Date) { const n = d.getDay(); return n === 0 || n === 5 || n === 6; }

interface Pricing {
  valid:          boolean;
  nights:         number;
  rooms:          number;
  surchargeRooms: number;
  total:          number;
  perNightFrom:   number;
  breakdown:      Array<{ label: string; amount: number }>;
  special:        string | null;
  autoRoomNote:   string | null;
}

function calcPricing(checkIn: string, checkOut: string, adults: number, children: number, cfg?: PriceConfig): Pricing {
  const PW  = cfg?.weekday       ?? PRICE_WEEKDAY;
  const PWK = cfg?.weekend       ?? PRICE_WEEKEND;
  const PEA = cfg?.extra_adult   ?? PRICE_EXTRA_ADULT;
  const PSE = cfg?.special_extra ?? PRICE_SPECIAL_EXTRA;
  const PSS = cfg?.semana_santa  ?? PRICE_SEMANA_SANTA_FLAT;
  const nil: Pricing = { valid: false, nights: 0, rooms: 1, surchargeRooms: 0, total: 0, perNightFrom: 0, breakdown: [], special: null, autoRoomNote: null };
  if (!checkIn || !checkOut) return nil;

  const start = new Date(checkIn + 'T12:00:00');
  const end   = new Date(checkOut + 'T12:00:00');
  const nights = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  if (nights <= 0) return nil;

  const total_people = adults + children;
  const rooms        = Math.max(1, Math.ceil(total_people / 4));
  const extra_adults = Math.max(0, adults - 3 * rooms);
  const surchargeRooms = Math.min(extra_adults, rooms);

  let grandTotal = 0;
  let weekdayNights = 0, weekendNights = 0;
  let firstSpecial: string | null = null;
  let specialNights = 0;

  let ssNights = 0; // noches a tarifa plana Semana Santa

  for (let i = 0; i < nights; i++) {
    const d   = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const isSS = SEMANA_SANTA_RANGES.some(r => iso >= r.from && iso <= r.to);
    const sp   = isSS ? 'Semana Santa' : specialLabel(d);
    if (sp && !firstSpecial) firstSpecial = sp;
    if (sp) specialNights++;
    if (isSS) {
      ssNights++;
      grandTotal += PSS * rooms + surchargeRooms * PEA;
    } else {
      const basePerRoom = isWeekend(d) ? PWK : PW;
      const spExtra     = sp ? PSE : 0;
      grandTotal += (basePerRoom + spExtra) * rooms + surchargeRooms * PEA;
      isWeekend(d) ? weekendNights++ : weekdayNights++;
    }
  }

  const breakdown: Pricing['breakdown'] = [];
  if (rooms > 1)       breakdown.push({ label: `${rooms} habitaciones`, amount: 0 });
  if (ssNights)        breakdown.push({ label: `${ssNights} noche${ssNights > 1 ? 's' : ''} Semana Santa`, amount: PSS * rooms * ssNights });
  if (weekdayNights)   breakdown.push({ label: `${weekdayNights} noche${weekdayNights > 1 ? 's' : ''} entre semana`, amount: PW * rooms * weekdayNights });
  if (weekendNights)   breakdown.push({ label: `${weekendNights} noche${weekendNights > 1 ? 's' : ''} fin de semana`, amount: PWK * rooms * weekendNights });
  if (surchargeRooms)  breakdown.push({ label: `4° adulto · ${surchargeRooms} hab. × ${nights} noche${nights > 1 ? 's' : ''}`, amount: surchargeRooms * PEA * nights });
  const otherSpecialNights = specialNights - ssNights;
  if (firstSpecial && firstSpecial !== 'Semana Santa' && otherSpecialNights > 0) breakdown.push({ label: `Temporada ${firstSpecial} (+$${PSE}/hab.)`, amount: PSE * rooms * otherSpecialNights });

  const perNightFrom = PW * rooms + surchargeRooms * PEA;
  const autoRoomNote = rooms > 1 ? `Se asignan automáticamente ${rooms} habitaciones para ${total_people} personas` : null;

  return { valid: true, nights, rooms, surchargeRooms, total: grandTotal, perNightFrom, breakdown, special: firstSpecial, autoRoomNote };
}

// ─────────────────────────────────────────────────────────────────────────────
// GLASS TOKENS
// ─────────────────────────────────────────────────────────────────────────────

const GLASS_MODAL: React.CSSProperties = {
  background: 'rgba(252, 250, 248, 0.14)',
  backdropFilter: 'blur(64px) saturate(200%) brightness(1.05)',
  WebkitBackdropFilter: 'blur(64px) saturate(200%) brightness(1.05)',
  border: '1px solid rgba(255,255,255,0.65)',
  boxShadow: ['0 56px 120px rgba(4,4,4,0.32)', '0 16px 40px rgba(4,4,4,0.14)', 'inset 0 1px 0 rgba(255,255,255,1)', 'inset 0 -1px 0 rgba(255,255,255,0.12)', 'inset 1px 0 rgba(255,255,255,0.18)', 'inset -1px 0 rgba(255,255,255,0.18)'].join(', '),
};

const GLASS_PANEL: React.CSSProperties = {
  background: 'linear-gradient(160deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.10) 100%)',
  backdropFilter: 'blur(24px) saturate(160%)',
  WebkitBackdropFilter: 'blur(24px) saturate(160%)',
  border: '1px solid rgba(255,255,255,0.35)',
};

const GLASS_CARD: React.CSSProperties = {
  background: 'linear-gradient(160deg, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0.15) 100%)',
  backdropFilter: 'blur(20px) saturate(160%)',
  WebkitBackdropFilter: 'blur(20px) saturate(160%)',
  border: '1px solid rgba(133,109,71,0.30)',
  borderTop: '1px solid rgba(133,109,71,0.48)',
  boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.80), 0 2px 8px rgba(133,109,71,0.08)',
};

const GLASS_INPUT: React.CSSProperties = {
  width: '100%', padding: '13px 16px', borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.70)',
  background: 'rgba(255,255,255,0.55)',
  backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
  fontFamily: 'var(--sans)', fontSize: '0.92rem', color: 'var(--ink)',
  outline: 'none', boxSizing: 'border-box' as const,
  boxShadow: 'inset 0 1px 3px rgba(4,4,4,0.04), 0 1px 0 rgba(255,255,255,0.9)',
};

const DATE_INPUT_BARE: React.CSSProperties = {
  width: '100%', background: 'transparent', border: 'none',
  fontFamily: 'var(--sans)', fontSize: '0.9rem', color: '#1a1a1a',
  outline: 'none', boxSizing: 'border-box' as const,
  padding: '3px 0', display: 'block',
};

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: 'var(--sans)', fontSize: '0.68rem', letterSpacing: '0.12em',
  textTransform: 'uppercase' as const, color: 'rgba(15,15,15,0.72)',
  marginBottom: '7px', display: 'block', fontWeight: 600,
};

// ─────────────────────────────────────────────────────────────────────────────
// COUNTER COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function Counter({ label, sublabel, value, min, max, onChange }: {
  label: string; sublabel?: string;
  value: number; min: number; max: number;
  onChange: (n: number) => void;
}) {
  const btn = (disabled: boolean): React.CSSProperties => ({
    width: '32px', height: '32px', borderRadius: '50%',
    border: `1.5px solid ${disabled ? 'rgba(133,109,71,0.18)' : 'rgba(133,109,71,0.45)'}`,
    background: disabled ? 'rgba(255,255,255,0.2)' : 'rgba(133,109,71,0.08)',
    color: disabled ? 'rgba(133,109,71,0.3)' : 'var(--warm)',
    fontFamily: 'var(--sans)', fontSize: '1.1rem', lineHeight: 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.2s', flexShrink: 0,
  });

  return (
    <div style={{ ...GLASS_CARD, borderRadius: '16px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
      <div>
        <div style={{ fontFamily: 'var(--sans)', fontSize: '0.9rem', color: 'var(--ink)', fontWeight: 400 }}>{label}</div>
        {sublabel && <div style={{ fontFamily: 'var(--sans)', fontSize: '0.72rem', color: 'rgba(15,15,15,0.55)', marginTop: '1px' }}>{sublabel}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button style={btn(value <= min)} onClick={() => value > min && onChange(value - 1)} aria-label={`Reducir ${label}`}>−</button>
        <span style={{ fontFamily: 'var(--serif)', fontSize: '1.3rem', color: 'var(--ink)', minWidth: '22px', textAlign: 'center' }}>{value}</span>
        <button style={btn(value >= max)} onClick={() => value < max && onChange(value + 1)} aria-label={`Aumentar ${label}`}>+</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

type Step = 'guests' | 'details' | 'payment' | 'success';
type AvailStatus = 'idle' | 'checking' | 'available' | 'unavailable' | 'insufficient';

export default function BookingModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [step,   setStep]   = useState<Step>('guests');

  // Live hotel config — fetched after mount, falls back to hardcoded defaults
  const [hotelConfig, setHotelConfig] = useState<HotelConfig | null>(null);
  useEffect(() => {
    fetch('/api/public/hotel-config')
      .then(r => r.json())
      .then((c: HotelConfig) => setHotelConfig(c))
      .catch(() => {});
  }, []);

  // Dates & guests
  const [checkIn,  setCheckIn]  = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adults,   setAdults]   = useState(2);
  const [children, setChildren] = useState(0);

  // Contact
  const [guestName,  setGuestName]  = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [notes,      setNotes]      = useState('');

  // Availability
  const [availStatus,   setAvailStatus]   = useState<AvailStatus>('idle');
  const [availableRooms, setAvailableRooms] = useState<number | null>(null);
  const [isWaitlist,    setIsWaitlist]    = useState(false);

  // Add-ons
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());
  const [addonQty, setAddonQty] = useState<Record<string, { persons: number; nights: number }>>({});

  // UI
  const [loading,        setLoading]        = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error,          setError]          = useState('');
  const [folio,          setFolio]          = useState('');

  // Guard against double-submission: mobile double-tap or slow-network impatience
  // can fire the handler before React re-renders the disabled button state.
  const paymentInitiated = useRef(false);

  const today       = new Date().toISOString().split('T')[0];
  const pricing     = calcPricing(checkIn, checkOut, adults, children, hotelConfig?.prices);
  const activeAddons = (hotelConfig?.addons ?? ADDONS).filter(a => a.active !== false);

  const addonUnitTotal = (a: Addon) => {
    const nights = Math.max(pricing.nights, 1);
    if (a.perPerson) return a.unitPrice * adults * (a.perNight ? nights : 1);
    return a.perNight ? a.unitPrice * nights : a.unitPrice;
  };
  const addonsTotal = activeAddons
    .filter(a => selectedAddons.has(a.id))
    .reduce((sum, a) => sum + addonUnitTotal(a), 0);
  const grandTotal = pricing.total + addonsTotal;

  const toggleAddon = (id: string) => {
    setSelectedAddons(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const guestsStr = `${adults} adulto${adults !== 1 ? 's' : ''}${children ? ` · ${children} niño${children !== 1 ? 's' : ''}` : ''}`;

  // ── Open/close ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const open = () => { setIsOpen(true); setStep('guests'); setError(''); trackModalOpen(); };
    window.addEventListener('open-booking-modal', open);

    // Support direct link: hotelelencino.com/#reservar (for Google Ads, etc.)
    if (window.location.hash === '#reservar') {
      open();
      // Clean hash without triggering a navigation
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    const onHashChange = () => {
      if (window.location.hash === '#reservar') {
        open();
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('open-booking-modal', open);
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const close = () => {
    if (step !== 'success') trackModalAbandon(step);
    setIsOpen(false);
    setTimeout(() => {
      setStep('guests'); setError('');
      setCheckIn(''); setCheckOut('');
      setAdults(2); setChildren(0);
      setGuestName(''); setGuestEmail(''); setGuestPhone(''); setNotes('');
      setAvailStatus('idle'); setIsWaitlist(false);
      setFolio(''); setSelectedAddons(new Set());
      paymentInitiated.current = false;
    }, 400);
  };

  // ── Availability check (debounced 400ms) ──────────────────────────────────
  const checkAvailability = useCallback(async (ci: string, co: string, rooms: number) => {
    if (!ci || !co) { setAvailStatus('idle'); setAvailableRooms(null); return; }
    setAvailStatus('checking');
    try {
      const res  = await fetch(`/api/availability?check_in=${ci}&check_out=${co}&room_type=doble&rooms=${rooms}`);
      const data = await res.json();
      const free: number = typeof data.available_rooms === 'number' ? data.available_rooms : 0;
      setAvailableRooms(free);
      if (data.available) {
        setAvailStatus('available');
        setIsWaitlist(false);
      } else if (free > 0) {
        // Hay habitaciones, pero menos de las que pidió el cliente
        setAvailStatus('insufficient');
      } else {
        setAvailStatus('unavailable');
      }
    } catch {
      setAvailStatus('idle');
      setAvailableRooms(null);
    }
  }, []);

  useEffect(() => {
    if (!pricing.valid) { setAvailStatus('idle'); setAvailableRooms(null); return; }
    const t = setTimeout(() => checkAvailability(checkIn, checkOut, pricing.rooms), 400);
    return () => clearTimeout(t);
  }, [checkIn, checkOut, pricing.valid, pricing.rooms, checkAvailability]);

  // ── Step 1 → 2 ────────────────────────────────────────────────────────────
  const handleContinue = () => {
    if (availStatus !== 'available' && !isWaitlist) {
      setError('Selecciona fechas disponibles o únete a la lista de espera.'); return;
    }
    setError(''); setStep('details');
  };

  // ── Step 2 → 3 or waitlist ────────────────────────────────────────────────
  const handleSubmitDetails = async () => {
    if (!guestName.trim() || !guestEmail.trim() || !guestPhone.trim()) {
      setError('Completa todos los campos requeridos.'); return;
    }
    if (!guestEmail.includes('@')) { setError('Email inválido.'); return; }
    const phoneDigits = guestPhone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      setError('Teléfono inválido — incluye al menos 10 dígitos (ej. +52 81 2381 6588).'); return;
    }
    setError('');

    if (isWaitlist) {
      // Waitlist: go to payment step to capture payment preference
      trackBeginCheckout('Habitación Doble', pricing.nights, grandTotal);
      setStep('payment');
    } else {
      trackBeginCheckout('Habitación Doble', pricing.nights, grandTotal);
      setStep('payment');
    }
  };

  const commonPayload = () => {
    const addonNames = activeAddons.filter(a => selectedAddons.has(a.id)).map(a => a.title);
    const addonNote  = addonNames.length ? `\nAdd-ons: ${addonNames.join(', ')}` : '';
    return {
      guest_name: guestName, guest_email: guestEmail, guest_phone: guestPhone,
      room_type: 'doble', check_in: checkIn, check_out: checkOut,
      nights: pricing.nights, total_mxn: grandTotal,
      adults, children, rooms: pricing.rooms,
      notes: notes + addonNote,
      source: isWaitlist ? 'web-waitlist' : 'web',
    };
  };

  // ── Pay online ─────────────────────────────────────────────────────────────
  const handlePayOnline = async () => {
    // Prevent double-submission regardless of render timing
    if (paymentInitiated.current) return;
    paymentInitiated.current = true;

    setPaymentLoading(true); setError('');
    try {
      // 1. Create reservation with pending_payment status
      const resRes = await fetch('/api/reservations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...commonPayload(), payment_method: 'online' }),
      });
      const resData = await resRes.json();
      if (!resData.success) {
        paymentInitiated.current = false; // allow retry on error
        setError(resData.error || 'Error al crear reservación.');
        return;
      }

      // 2. Create MP payment preference
      const payRes = await fetch('/api/payment/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...commonPayload(),
          reservation_id: resData.reservation_id,
          folio: resData.folio,
        }),
      });
      const payData = await payRes.json();
      if (!payData.init_point) {
        paymentInitiated.current = false; // allow retry on error
        const detail = payData.detail ? ` (${payData.detail.slice(0, 120)})` : '';
        setError(`Error al iniciar el pago. Intenta de nuevo.${detail}`);
        return;
      }

      // 3. Redirect to MP checkout (paymentInitiated stays true — page navigates away)
      trackPurchase(resData.folio || '', grandTotal, 'mercadopago');
      window.location.href = payData.init_point;
    } catch {
      paymentInitiated.current = false;
      setError('Error de conexión. Inténtalo de nuevo.');
    }
    finally   { setPaymentLoading(false); }
  };

  // ── Pay at hotel ───────────────────────────────────────────────────────────
  const handlePayLater = async () => {
    if (paymentInitiated.current) return;
    paymentInitiated.current = true;
    setLoading(true); setPaymentLoading(true); setError('');
    try {
      const res  = await fetch('/api/reservations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...commonPayload(), payment_method: 'pending' }),
      });
      const data = await res.json();
      if (data.success) {
        trackPurchase(data.folio || '', grandTotal, 'hotel');
        router.push(`/reservacion/confirmada?folio=${encodeURIComponent(data.folio || '')}`);
      } else {
        paymentInitiated.current = false;
        setError(data.error || 'Error al enviar. Inténtalo de nuevo.');
      }
    } catch {
      paymentInitiated.current = false;
      setError('Error de conexión. Inténtalo de nuevo.');
    }
    finally   { setLoading(false); setPaymentLoading(false); }
  };

  // ── Waitlist payment preference (no MP redirect, stays in modal) ──────────
  const handleWaitlistSubmit = async (paymentMethod: 'pending' | 'online') => {
    if (paymentInitiated.current) return;
    paymentInitiated.current = true;
    setLoading(true); setPaymentLoading(true); setError('');
    try {
      const res  = await fetch('/api/reservations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...commonPayload(), payment_method: paymentMethod }),
      });
      const data = await res.json();
      if (data.success) {
        trackPurchase(data.folio || '', grandTotal, paymentMethod === 'online' ? 'mercadopago' : 'hotel');
        setFolio(data.folio || '');
        setStep('success');
      } else {
        paymentInitiated.current = false;
        setError(data.error || 'Error al registrar. Inténtalo de nuevo.');
      }
    } catch {
      paymentInitiated.current = false;
      setError('Error de conexión. Inténtalo de nuevo.');
    }
    finally   { setLoading(false); setPaymentLoading(false); }
  };

  // ── CTA state ─────────────────────────────────────────────────────────────
  const canContinue = pricing.valid && (availStatus === 'available' || isWaitlist);

  const ctaBtnStyle = (disabled: boolean): React.CSSProperties => ({
    width: '100%', padding: '15px', borderRadius: '980px',
    border: '1px solid rgba(133,109,71,0.45)',
    background: disabled
      ? 'rgba(133,109,71,0.32)'
      : 'linear-gradient(135deg, #a68b5b 0%, var(--warm) 100%)',
    backdropFilter: disabled ? 'blur(20px) saturate(180%)' : 'none',
    WebkitBackdropFilter: disabled ? 'blur(20px) saturate(180%)' : 'none',
    color: 'var(--paper)',
    fontFamily: 'var(--sans)', fontSize: '0.78rem',
    letterSpacing: '0.14em', textTransform: 'uppercase' as const,
    cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.25s',
    boxShadow: disabled
      ? 'inset 0 1px 0 rgba(255,255,255,0.40), 0 2px 16px rgba(133,109,71,0.20)'
      : '0 6px 24px rgba(133,109,71,0.45), inset 0 1px 0 rgba(255,255,255,0.3)',
  });

  // Progress bar steps — waitlist also captures payment preference
  const progressSteps = ['guests', 'details', 'payment'] as const;

  // Header title
  const stepTitle: Record<Step, string> = {
    guests:  'Reservar',
    details: 'Tus datos',
    payment: 'Forma de pago',
    success: isWaitlist ? 'Lista de espera' : '¡Listo!',
  };

  // WhatsApp URL for success screen
  const waUrl = folio
    ? buildWhatsAppUrl(folio, checkIn, checkOut, guestsStr, pricing.total, isWaitlist)
    : '#';

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="bd"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={close}
            style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(4,4,4,0.45)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
          />

          <div style={{ position: 'fixed', inset: 0, zIndex: 101, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', pointerEvents: 'none' }}>
            <motion.div
              key="modal"
              id="booking-modal"
              initial={{ opacity: 0, y: 52, scale: 0.94 }}
              animate={{ opacity: 1, y: 0,  scale: 1 }}
              exit={  { opacity: 0, y: 28,  scale: 0.96 }}
              transition={{ duration: 0.42, ease: [0.32, 0.72, 0, 1] }}
              style={{
                ...GLASS_MODAL, pointerEvents: 'auto', borderRadius: '32px',
                width: '100%', maxWidth: '510px',
                maxHeight: 'calc(100dvh - 32px)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
              }}
            >
              {/* ── HEADER ── */}
              <div style={{
                ...GLASS_PANEL,
                padding: '22px 26px 18px', borderBottom: '1px solid rgba(255,255,255,0.30)',
                flexShrink: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px',
              }}>
                <div style={{ flex: 1 }}>
                  {step !== 'success' && (
                    <div style={{ display: 'flex', gap: '5px', marginBottom: '12px' }}>
                      {progressSteps.map((s, i) => {
                        const stepIndex = (progressSteps as readonly string[]).indexOf(step);
                        const filled = i <= stepIndex;
                        return (
                          <div key={s} style={{
                            height: '2px', flex: 1, borderRadius: '2px',
                            background: filled ? 'var(--warm)' : 'rgba(133,109,71,0.2)',
                            transition: 'background 0.4s',
                          }} />
                        );
                      })}
                    </div>
                  )}
                  <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.4rem', color: 'var(--ink)', margin: 0 }}>
                    {stepTitle[step]}
                  </h2>
                  <p style={{ fontFamily: 'var(--sans)', fontSize: '0.72rem', color: 'rgba(15,15,15,0.62)', margin: '3px 0 0', letterSpacing: '0.05em' }}>
                    Hotel El Encino · Santiago, N.L.
                  </p>
                </div>
                <button onClick={close} aria-label="Cerrar" style={{
                  flexShrink: 0, width: '32px', height: '32px', borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.50)', background: 'rgba(255,255,255,0.25)',
                  backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'rgba(15,15,15,0.60)', fontSize: '0.85rem',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)',
                }}>✕</button>
              </div>

              {/* ── SCROLLABLE BODY ── */}
              <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '22px 26px', WebkitOverflowScrolling: 'touch' }}>

                {/* ══ SUCCESS ══════════════════════════════════════════════ */}
                {step === 'success' && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}
                    style={{ textAlign: 'center', padding: '12px 0 8px' }}>
                    <motion.div
                      initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 280, delay: 0.1 }}
                      style={{
                        width: '68px', height: '68px', borderRadius: '50%',
                        background: 'rgba(133,109,71,0.10)', border: '1.5px solid rgba(133,109,71,0.28)',
                        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 18px', fontSize: '1.6rem', color: 'var(--warm)',
                      }}
                    >{isWaitlist ? '⏳' : '✓'}</motion.div>

                    <p style={{ fontFamily: 'var(--sans)', fontSize: '0.72rem', color: 'var(--ink)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 600 }}>
                      {isWaitlist ? 'Lista de espera' : 'Folio de reservación'}
                    </p>
                    <div style={{
                      fontFamily: 'var(--serif)', fontSize: '2.2rem', letterSpacing: '0.14em', marginBottom: '18px',
                      background: 'linear-gradient(135deg, #0D4F3C 0%, #1B6CA8 100%)',
                      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}>
                      {folio}
                    </div>
                    <p style={{ fontFamily: 'var(--sans)', fontSize: '0.88rem', color: 'var(--ink)', lineHeight: 1.7, marginBottom: '28px', maxWidth: '320px', margin: '0 auto 28px' }}>
                      {isWaitlist
                        ? <><strong>Registrado en lista de espera.</strong><br /><span style={{ fontWeight: 400, color: '#3a3a3a' }}>Estamos buscando las mejores opciones para tus fechas. Te contactaremos pronto.</span></>
                        : <><strong>Reservación recibida.</strong><br /><span style={{ fontWeight: 400, color: '#3a3a3a' }}>Enviamos la confirmación a tu correo.</span><br /><span style={{ fontWeight: 600, color: '#c0392b', fontSize: '0.82rem' }}>⚠️ A partir de este momento cuentan con 2 horas para confirmar su reserva por WhatsApp con un administrador, de lo contrario esta se liberará.</span></>
                      }
                    </p>
                    <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{
                      display: 'inline-flex', alignItems: 'center', gap: '8px',
                      padding: '13px 28px', borderRadius: '980px',
                      background: '#25D366', color: '#fff',
                      fontFamily: 'var(--sans)', fontSize: '0.8rem', letterSpacing: '0.06em',
                      textDecoration: 'none', marginBottom: '12px',
                      boxShadow: '0 4px 16px rgba(37,211,102,0.4)',
                    }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      {isWaitlist ? 'Contactar por WhatsApp' : 'Confirmar por WhatsApp'}
                    </a>
                    <br />
                    <button onClick={close} style={{ background: 'none', border: 'none', fontFamily: 'var(--sans)', fontSize: '0.78rem', color: 'rgba(15,15,15,0.60)', cursor: 'pointer', textDecoration: 'underline', marginTop: '8px' }}>
                      Cerrar
                    </button>
                  </motion.div>
                )}

                {/* ══ STEP 1: DATES + GUESTS ════════════════════════════════ */}
                {step === 'guests' && (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>

                    {/* Dates */}
                    <p style={LABEL_STYLE}>Fechas</p>
                    <div className="booking-date-grid">
                      <div className="date-field-card" style={{ ...GLASS_CARD, borderRadius: '16px', padding: '12px 16px' }}>
                        <label style={{ ...LABEL_STYLE, fontSize: '0.62rem', marginBottom: '6px' }}>Llegada</label>
                        <input type="date" value={checkIn} min={today}
                          onChange={e => { setCheckIn(e.target.value); if (checkOut && e.target.value >= checkOut) setCheckOut(''); }}
                          style={DATE_INPUT_BARE} />
                      </div>
                      <div className="date-field-card" style={{ ...GLASS_CARD, borderRadius: '16px', padding: '12px 16px' }}>
                        <label style={{ ...LABEL_STYLE, fontSize: '0.62rem', marginBottom: '6px' }}>Salida</label>
                        <input type="date" value={checkOut} min={checkIn || today}
                          onChange={e => setCheckOut(e.target.value)}
                          style={DATE_INPUT_BARE} />
                      </div>
                    </div>

                    {/* Availability indicator */}
                    <AnimatePresence>
                      {pricing.valid && availStatus !== 'idle' && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: '14px' }}>
                          {availStatus === 'checking' && (
                            <div style={{ ...GLASS_CARD, borderRadius: '12px', padding: '11px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '0.85rem', opacity: 0.6 }}>⌛</span>
                              <span style={{ fontFamily: 'var(--sans)', fontSize: '0.78rem', color: 'rgba(15,15,15,0.65)' }}>Verificando disponibilidad…</span>
                            </div>
                          )}
                          {availStatus === 'available' && (
                            <div style={{ borderRadius: '12px', padding: '11px 16px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid rgba(26,107,58,0.50)', background: 'rgba(220,245,230,0.92)' }}>
                              <span style={{ fontSize: '0.85rem', color: '#0B4422' }}>✓</span>
                              <span style={{ fontFamily: 'var(--sans)', fontSize: '0.78rem', color: '#0B4422', fontWeight: 700 }}>
                                Disponible para tus fechas
                                {availableRooms !== null && availableRooms > 0 && (
                                  <span style={{ fontWeight: 500, marginLeft: '6px', opacity: 0.85 }}>
                                    · {availableRooms === 1 ? 'queda 1 habitación' : `quedan ${availableRooms} habitaciones`}
                                  </span>
                                )}
                              </span>
                            </div>
                          )}
                          {availStatus === 'insufficient' && (
                            <div style={{ ...GLASS_CARD, borderRadius: '12px', padding: '14px 16px', border: '1px solid rgba(139,69,0,0.28)', background: 'rgba(139,69,0,0.05)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                <span style={{ fontSize: '0.85rem' }}>⚠️</span>
                                <span style={{ fontFamily: 'var(--sans)', fontSize: '0.78rem', color: '#7A3E00', fontWeight: 700 }}>
                                  Solo {availableRooms === 1 ? 'queda 1 habitación' : `quedan ${availableRooms} habitaciones`} — necesitas {pricing.rooms}
                                </span>
                              </div>
                              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: '0.78rem', color: 'var(--ink)', lineHeight: 1.4 }}>
                                <input type="checkbox" checked={isWaitlist} onChange={e => setIsWaitlist(e.target.checked)}
                                  style={{ marginTop: '2px', accentColor: '#856d47', width: '16px', height: '16px', flexShrink: 0 }} />
                                <span>Ajustar fechas o anótame en <strong>lista de espera</strong> — el hotel me contactará</span>
                              </label>
                            </div>
                          )}
                          {availStatus === 'unavailable' && (
                            <div style={{ ...GLASS_CARD, borderRadius: '12px', padding: '14px 16px', border: '1px solid rgba(139,69,0,0.28)', background: 'rgba(139,69,0,0.05)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                <span style={{ fontSize: '0.85rem' }}>⚠️</span>
                                <span style={{ fontFamily: 'var(--sans)', fontSize: '0.78rem', color: '#7A3E00', fontWeight: 700 }}>Sin disponibilidad en esas fechas</span>
                              </div>
                              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: '0.78rem', color: 'var(--ink)', lineHeight: 1.4 }}>
                                <input type="checkbox" checked={isWaitlist} onChange={e => setIsWaitlist(e.target.checked)}
                                  style={{ marginTop: '2px', accentColor: '#856d47', width: '16px', height: '16px', flexShrink: 0 }} />
                                <span>Quiero unirme a la <strong>lista de espera</strong> — el hotel me buscará alojamiento y me contactará</span>
                              </label>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Guests */}
                    <p style={{ ...LABEL_STYLE, marginBottom: '10px' }}>Huéspedes</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                      <Counter label="Adultos" sublabel="Mayores de 12 años" value={adults} min={1} max={8} onChange={setAdults} />
                      <Counter label="Niños" sublabel="12 años o menos · sin cargo extra" value={children} min={0} max={6} onChange={setChildren} />
                    </div>

                    {/* Auto-room note */}
                    <AnimatePresence>
                      {pricing.autoRoomNote && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: '14px' }}>
                          <div style={{ ...GLASS_CARD, borderRadius: '12px', padding: '11px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '1rem' }}>🏨</span>
                            <span style={{ fontFamily: 'var(--sans)', fontSize: '0.78rem', color: 'var(--ink)', lineHeight: 1.4 }}>{pricing.autoRoomNote}</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* 4th adult note */}
                    <AnimatePresence>
                      {pricing.surchargeRooms > 0 && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: '14px' }}>
                          <div style={{ ...GLASS_CARD, borderRadius: '12px', padding: '11px 16px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid rgba(133,109,71,0.28)' }}>
                            <span style={{ fontSize: '1rem' }}>ℹ️</span>
                            <span style={{ fontFamily: 'var(--sans)', fontSize: '0.78rem', color: 'var(--ink)', lineHeight: 1.4 }}>El 4° adulto tiene un cargo adicional de <strong>$500 MXN/noche</strong> por habitación.</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Pricing summary */}
                    <AnimatePresence>
                      {pricing.valid && (
                        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
                          style={{ ...GLASS_CARD, borderRadius: '16px', padding: '16px 18px', border: '1px solid rgba(133,109,71,0.20)' }}>
                          {pricing.breakdown.map((item, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--sans)', fontSize: '0.79rem', color: 'rgba(15,15,15,0.60)', marginBottom: '5px' }}>
                              <span>{item.label}</span>
                              {item.amount > 0 && <span>${item.amount.toLocaleString('es-MX')}</span>}
                            </div>
                          ))}
                          {pricing.special && (
                            <div style={{ fontFamily: 'var(--sans)', fontSize: '0.75rem', color: 'var(--warm)', marginBottom: '5px' }}>✦ Temporada especial activa</div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.5)' }}>
                            <span style={{ fontFamily: 'var(--sans)', fontSize: '0.76rem', color: 'rgba(15,15,15,0.60)' }}>{pricing.nights} noche{pricing.nights > 1 ? 's' : ''} · {pricing.rooms} hab.</span>
                            <span style={{ fontFamily: 'var(--serif)', fontSize: '1.3rem', color: 'var(--ink)' }}>
                              ${pricing.total.toLocaleString('es-MX')}
                              <span style={{ fontFamily: 'var(--sans)', fontSize: '0.68rem', color: 'rgba(15,15,15,0.60)', marginLeft: '3px' }}>MXN</span>
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {error && <p style={{ fontFamily: 'var(--sans)', fontSize: '0.78rem', color: '#c0392b', textAlign: 'center', marginTop: '10px' }}>{error}</p>}
                  </motion.div>
                )}

                {/* ══ STEP 2: CONTACT DETAILS ══════════════════════════════ */}
                {step === 'details' && (
                  <motion.div initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                    {/* Summary pill */}
                    <div style={{ ...GLASS_CARD, borderRadius: '14px', padding: '13px 16px', marginBottom: '22px', border: '1px solid rgba(133,109,71,0.20)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontFamily: 'var(--serif-italic)', fontSize: '0.88rem', color: 'var(--ink)' }}>
                            Habitación Doble · {adults + children} personas · {pricing.rooms} hab.
                          </div>
                          <div style={{ fontFamily: 'var(--sans)', fontSize: '0.73rem', color: 'rgba(15,15,15,0.60)', marginTop: '2px' }}>
                            {pricing.nights} noche{pricing.nights > 1 ? 's' : ''}
                            {isWaitlist && ' · Lista de espera'}
                          </div>
                        </div>
                        {!isWaitlist && (
                          <div style={{ fontFamily: 'var(--serif)', fontSize: '1.1rem', color: 'var(--warm)', flexShrink: 0 }}>
                            ${pricing.total.toLocaleString('es-MX')}
                            <span style={{ fontFamily: 'var(--sans)', fontSize: '0.65rem', color: 'rgba(15,15,15,0.60)', marginLeft: '2px' }}>MXN</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
                      <div>
                        <label style={LABEL_STYLE}>Nombre completo *</label>
                        <input type="text" value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Tu nombre completo" style={GLASS_INPUT} autoComplete="name" />
                      </div>
                      <div>
                        <label style={LABEL_STYLE}>Correo electrónico *</label>
                        <input type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="correo@ejemplo.com" style={GLASS_INPUT} autoComplete="email" />
                      </div>
                      <div>
                        <label style={LABEL_STYLE}>Teléfono / WhatsApp *</label>
                        <input type="tel" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder="+52 81 1234 5678" style={GLASS_INPUT} autoComplete="tel" />
                      </div>
                      <div>
                        <label style={LABEL_STYLE}>Peticiones especiales <span style={{ textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Llegada tarde, planta baja, alergias…" rows={3} style={{ ...GLASS_INPUT, resize: 'vertical', minHeight: '78px' }} />
                      </div>
                    </div>

                    {error && <p style={{ fontFamily: 'var(--sans)', fontSize: '0.78rem', color: '#c0392b', marginTop: '10px' }}>{error}</p>}
                  </motion.div>
                )}

                {/* ══ STEP 3: PAYMENT METHOD ════════════════════════════════ */}
                {step === 'payment' && (
                  <motion.div initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>

                    {/* Back link */}
                    <button onClick={() => { setStep('details'); setError(''); }} style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 16px',
                      fontFamily: 'var(--sans)', fontSize: '0.74rem', color: 'rgba(15,15,15,0.58)',
                      display: 'flex', alignItems: 'center', gap: '4px',
                    }}>← Cambiar datos de contacto</button>

                    {/* Summary card */}
                    <div style={{ ...GLASS_CARD, borderRadius: '14px', padding: '14px 16px', marginBottom: '22px', border: '1px solid rgba(133,109,71,0.22)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          {/* Primary: guest name — ink, weight 600 */}
                          <div style={{ fontFamily: 'var(--sans)', fontSize: '0.85rem', color: 'var(--ink)', fontWeight: 600 }}>{guestName}</div>
                          {/* Secondary: dates — 75% ink */}
                          <div style={{ fontFamily: 'var(--sans)', fontSize: '0.75rem', color: 'rgba(15,15,15,0.72)', marginTop: '3px', lineHeight: 1.5 }}>
                            {pricing.nights} noche{pricing.nights !== 1 ? 's' : ''} · {checkIn} → {checkOut}
                          </div>
                          <div style={{ fontFamily: 'var(--sans)', fontSize: '0.73rem', color: 'rgba(15,15,15,0.58)', marginTop: '2px' }}>
                            {guestsStr} · {pricing.rooms} hab.
                          </div>
                        </div>
                        {/* Amount — serif prominent */}
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', color: 'var(--ink)', fontWeight: 400, lineHeight: 1 }}>
                            ${grandTotal.toLocaleString('es-MX')}
                          </div>
                          <div style={{ fontFamily: 'var(--sans)', fontSize: '0.62rem', color: 'rgba(15,15,15,0.55)', letterSpacing: '0.08em', marginTop: '3px' }}>MXN TOTAL</div>
                        </div>
                      </div>
                    </div>

                    {/* ── UPSELL ADD-ONS ── */}
                    <div style={{ marginBottom: '24px' }}>
                      <p style={{ ...LABEL_STYLE, marginBottom: '10px' }}>Agrega a tu estancia</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {activeAddons.map(addon => {
                          const selected = selectedAddons.has(addon.id);
                          const addonPrice = addonUnitTotal(addon);
                          return (
                            <button
                              key={addon.id}
                              onClick={() => toggleAddon(addon.id)}
                              style={{
                                ...GLASS_CARD,
                                borderRadius: '14px', padding: '12px 14px',
                                border: selected ? '1.5px solid rgba(133,109,71,0.55)' : '1px solid rgba(133,109,71,0.18)',
                                cursor: 'pointer', textAlign: 'left', width: '100%',
                                background: selected
                                  ? 'linear-gradient(135deg, rgba(133,109,71,0.15) 0%, rgba(133,109,71,0.06) 100%)'
                                  : 'linear-gradient(160deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.22) 100%)',
                                transition: 'all 0.2s',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                                <span style={{ fontSize: '1.15rem', flexShrink: 0 }}>{addon.icon}</span>
                                <div>
                                  {/* Addon title — ink, 600 weight */}
                                  <div style={{ fontFamily: 'var(--sans)', fontSize: '0.82rem', color: 'var(--ink)', fontWeight: 600, lineHeight: 1.3 }}>{addon.title}</div>
                                  {/* Addon subtitle — 72% ink for legibility */}
                                  <div style={{ fontFamily: 'var(--sans)', fontSize: '0.71rem', color: 'rgba(15,15,15,0.72)', lineHeight: 1.4, marginTop: '1px' }}>
                                    {addon.subtitle}{addon.perNight ? ` · por noche` : ''}
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                {/* Price — warm, serif, prominent */}
                                <span style={{ fontFamily: 'var(--serif)', fontSize: '0.92rem', color: selected ? 'var(--ink)' : 'var(--warm)', fontWeight: 400 }}>
                                  +${addonPrice.toLocaleString('es-MX')}
                                </span>
                                <div style={{
                                  width: '22px', height: '22px', borderRadius: '50%',
                                  border: `1.5px solid ${selected ? 'var(--warm)' : 'rgba(133,109,71,0.40)'}`,
                                  background: selected ? 'var(--warm)' : 'rgba(255,255,255,0.5)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: selected ? '#fff' : 'rgba(133,109,71,0.65)', fontSize: '0.75rem', fontWeight: 700,
                                  transition: 'all 0.2s', flexShrink: 0,
                                }}>
                                  {selected ? '✓' : '+'}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      {/* Total with extras — shown when addons selected */}
                      {addonsTotal > 0 && (
                        <div style={{ ...GLASS_CARD, borderRadius: '12px', padding: '11px 16px', marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(133,109,71,0.30)', background: 'rgba(133,109,71,0.06)' }}>
                          <div>
                            <div style={{ fontFamily: 'var(--sans)', fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(15,15,15,0.60)', fontWeight: 600 }}>Total con extras</div>
                            <div style={{ fontFamily: 'var(--sans)', fontSize: '0.71rem', color: 'rgba(15,15,15,0.58)', marginTop: '1px' }}>
                              Hab. ${pricing.total.toLocaleString('es-MX')} + extras ${addonsTotal.toLocaleString('es-MX')}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontFamily: 'var(--serif)', fontSize: '1.15rem', color: 'var(--ink)', lineHeight: 1 }}>
                              ${grandTotal.toLocaleString('es-MX')}
                            </div>
                            <div style={{ fontFamily: 'var(--sans)', fontSize: '0.62rem', color: 'rgba(15,15,15,0.55)', letterSpacing: '0.08em', marginTop: '2px' }}>MXN</div>
                          </div>
                        </div>
                      )}
                    </div>

                    <p style={{ ...LABEL_STYLE, marginBottom: '14px' }}>¿Cómo prefieres pagar?</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Online payment */}
                      <button
                        id="btn-pagar-online"
                        onClick={isWaitlist ? () => handleWaitlistSubmit('online') : handlePayOnline}
                        disabled={paymentLoading}
                        style={{
                          ...GLASS_CARD, borderRadius: '18px', padding: '18px 20px',
                          border: '1.5px solid rgba(0,100,200,0.22)',
                          background: 'linear-gradient(160deg, rgba(255,255,255,0.50) 0%, rgba(255,255,255,0.28) 100%)',
                          cursor: paymentLoading ? 'not-allowed' : 'pointer',
                          textAlign: 'left', width: '100%', transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '5px' }}>
                          <span style={{ fontSize: '1.3rem' }}>🔒</span>
                          <div style={{ fontFamily: 'var(--sans)', fontSize: '0.90rem', fontWeight: 700, color: 'var(--ink)' }}>
                            {isWaitlist ? 'Prefiero pagar con tarjeta' : 'Pagar en línea'}
                          </div>
                        </div>
                        <div style={{ fontFamily: 'var(--sans)', fontSize: '0.76rem', color: 'rgba(15,15,15,0.72)', lineHeight: 1.55, paddingLeft: '44px' }}>
                          {isWaitlist
                            ? <>Tarjeta de crédito · OXXO · Transferencia<br /><span style={{ color: '#1A6B3A', fontWeight: 700 }}>✓ Te enviaremos el link de pago cuando confirmemos tu lugar</span></>
                            : <>Tarjeta de crédito · OXXO · Transferencia<br /><span style={{ color: '#1A6B3A', fontWeight: 700 }}>✓ Reserva confirmada automáticamente</span></>
                          }
                        </div>
                      </button>

                      {/* Pay at hotel */}
                      <button
                        id="btn-pagar-despues"
                        onClick={isWaitlist ? () => handleWaitlistSubmit('pending') : handlePayLater}
                        disabled={paymentLoading}
                        style={{
                          ...GLASS_CARD, borderRadius: '18px', padding: '18px 20px',
                          border: '1.5px solid rgba(133,109,71,0.22)',
                          background: 'linear-gradient(160deg, rgba(255,255,255,0.50) 0%, rgba(255,255,255,0.28) 100%)',
                          cursor: paymentLoading ? 'not-allowed' : 'pointer',
                          textAlign: 'left', width: '100%', transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '5px' }}>
                          <span style={{ fontSize: '1.3rem' }}>💬</span>
                          <div style={{ fontFamily: 'var(--sans)', fontSize: '0.90rem', fontWeight: 700, color: 'var(--ink)' }}>
                            {isWaitlist ? 'Pagar cuando confirmen mi lugar' : 'WhatsApp / Pagar al llegar'}
                          </div>
                        </div>
                        <div style={{ fontFamily: 'var(--sans)', fontSize: '0.76rem', color: 'rgba(15,15,15,0.72)', lineHeight: 1.55, paddingLeft: '44px' }}>
                          {isWaitlist
                            ? <>Efectivo · Transferencia · Tarjeta en destino<br /><span style={{ color: '#856d47', fontWeight: 700 }}>Te contactaremos para confirmar disponibilidad</span></>
                            : <>Efectivo · Transferencia · Tarjeta en destino<br /><span style={{ color: '#991B1B', fontWeight: 700 }}>⚠ Reserva NO confirmada hasta recibir el pago</span></>
                          }
                        </div>
                      </button>
                    </div>

                    {paymentLoading && (
                      <p style={{ fontFamily: 'var(--sans)', fontSize: '0.78rem', color: 'rgba(15,15,15,0.70)', textAlign: 'center', marginTop: '14px' }}>
                        Procesando…
                      </p>
                    )}

                    {error && <p style={{ fontFamily: 'var(--sans)', fontSize: '0.78rem', color: '#991B1B', marginTop: '12px', textAlign: 'center', lineHeight: 1.5 }}>{error}</p>}

                    {/* Disclaimer */}
                    {isWaitlist
                      ? <p style={{ fontFamily: 'var(--sans)', fontSize: '0.69rem', color: 'rgba(15,15,15,0.65)', textAlign: 'center', marginTop: '18px', lineHeight: 1.65 }}>
                          Estás en lista de espera. Solo pagarás si confirmamos tu lugar.<br />
                          Tu información de contacto queda registrada y te avisaremos a la brevedad.
                        </p>
                      : <p style={{ fontFamily: 'var(--sans)', fontSize: '0.69rem', color: 'rgba(15,15,15,0.65)', textAlign: 'center', marginTop: '18px', lineHeight: 1.65 }}>
                          Pago en línea = confirmación automática e inmediata.<br />
                          Pago manual = reserva pendiente hasta confirmar el pago.<br />
                          <strong style={{ color: '#991B1B', fontWeight: 700 }}>Cuentas con 2 horas para confirmar por WhatsApp con un administrador, de lo contrario la reserva se liberará.</strong>
                        </p>
                    }
                  </motion.div>
                )}

              </div>

              {/* ── STICKY FOOTER CTA — only for steps 1 & 2 ── */}
              {(step === 'guests' || step === 'details') && (
                <div style={{
                  ...GLASS_PANEL, padding: '14px 26px 22px',
                  borderTop: '1px solid rgba(255,255,255,0.30)', flexShrink: 0,
                }}>
                  {step === 'details' && (
                    <button onClick={() => { setStep('guests'); setError(''); }} style={{
                      background: 'none', border: 'none',
                      fontFamily: 'var(--sans)', fontSize: '0.74rem',
                      color: 'rgba(15,15,15,0.60)', cursor: 'pointer',
                      marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '4px',
                    }}>← Cambiar fechas / huéspedes</button>
                  )}

                  <button
                    id="btn-booking-continuar"
                    onClick={() => {
                      if (step === 'guests') {
                        if (!pricing.valid) { setError('Selecciona fechas de llegada y salida.'); return; }
                        if (!canContinue) {
                          if (availStatus === 'insufficient' && !isWaitlist) {
                            setError(`Solo quedan ${availableRooms} habitación${availableRooms === 1 ? '' : 'es'} para esas fechas y necesitas ${pricing.rooms}. Reduce huéspedes, cambia fechas o únete a la lista de espera.`);
                          } else if (availStatus === 'unavailable' && !isWaitlist) {
                            setError('No hay disponibilidad. Activa la lista de espera o elige otras fechas.');
                          } else if (availStatus === 'checking') {
                            setError('Espera a que termine la verificación de disponibilidad.');
                          } else {
                            setError('Selecciona fechas disponibles.');
                          }
                          return;
                        }
                        handleContinue();
                      } else {
                        handleSubmitDetails();
                      }
                    }}
                    disabled={step === 'guests' ? (availStatus === 'checking') : loading}
                    style={ctaBtnStyle(step === 'guests' ? (availStatus === 'checking' || (!pricing.valid)) : loading)}
                  >
                    {step === 'guests'
                      ? availStatus === 'checking'
                        ? 'Verificando…'
                        : isWaitlist
                        ? 'Continuar — Lista de espera'
                        : pricing.valid
                        ? `Continuar · $${grandTotal.toLocaleString('es-MX')} MXN`
                        : 'Selecciona fechas'
                      : loading
                      ? 'Enviando…'
                      : isWaitlist
                      ? 'Registrar en lista de espera'
                      : 'Continuar al pago'
                    }
                  </button>

                  {step === 'details' && !isWaitlist && (
                    <p style={{ fontFamily: 'var(--sans)', fontSize: '0.7rem', color: 'rgba(15,15,15,0.60)', textAlign: 'center', marginTop: '9px', lineHeight: 1.5 }}>
                      Elige tu método de pago en el siguiente paso
                    </p>
                  )}
                </div>
              )}

            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
