/**
 * /admin/analytics
 * Dashboard de métricas — reservaciones, revenue, conversión
 */

import Link from 'next/link';
import { supabaseGet } from '@/app/lib/supabase';
import { fetchGA4Overview } from '@/app/lib/ga4';
import { getAnticipo, getBalanceDue, parseAnticipoFromNotes } from '@/app/lib/balance';
import DateRangeFilter from './DateRangeFilter';

interface Reservation {
  id: string;
  folio: string;
  guest_name: string;
  room_type: string;
  check_in: string;
  check_out: string;
  nights: number;
  total_mxn: number;
  status: string;
  payment_method: string;
  notes?: string | null;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  confirmed:       'Confirmadas',
  pending:         'Pendientes',
  pending_payment: 'Pago pendiente',
  waitlist:        'Lista de espera',
  cancelled:       'Canceladas',
  no_show:         'No show',
  refund_pending:  'Reembolso pendiente',
};

const STATUS_COLOR: Record<string, string> = {
  confirmed:       '#27ae60',
  pending:         '#f39c12',
  pending_payment: '#2980b9',
  waitlist:        '#8e44ad',
  cancelled:       '#c0392b',
  no_show:         '#7f8c8d',
  refund_pending:  '#856d47',
};

const ROOM_LABEL: Record<string, string> = {
  suite:  'Suite Encino',
  doble:  'Habitación Doble',
  grupal: 'Habitación Grupal',
};

const PAYMENT_LABEL: Record<string, string> = {
  online:   '💳 MP',
  pending:  '🏨 Destino',
  cash:     '💵 Efectivo',
  transfer: '🏦 Transferencia',
  card:     '💳 Tarjeta',
};

// Brand color de Mercado Pago
const MP_BLUE = '#009ee3';

function fmt(n: number) {
  return n.toLocaleString('es-MX');
}

function fmtDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function months(n: number): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(d.toISOString().slice(0, 7));
  }
  return result;
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('es-MX', { month: 'short', year: '2-digit' });
}

// parseAnticipo se mantiene como alias para minimizar diff. Logic lives in lib/balance.
const parseAnticipo = parseAnticipoFromNotes;

function daysAgoIso(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function resolveRange(sp: { from?: string; to?: string; preset?: string }): { from: string; to: string; preset: string; all: boolean } {
  const today = new Date().toISOString().slice(0, 10);
  const preset = sp.preset ?? '30d';
  if (preset === 'all') return { from: '0000-01-01', to: '9999-12-31', preset: 'all', all: true };
  if (sp.from && sp.to) return { from: sp.from, to: sp.to, preset, all: false };
  if (preset === '7d')  return { from: daysAgoIso(7),  to: today, preset, all: false };
  if (preset === '90d') return { from: daysAgoIso(90), to: today, preset, all: false };
  if (preset === 'ytd') return { from: `${new Date().getFullYear()}-01-01`, to: today, preset, all: false };
  return { from: daysAgoIso(30), to: today, preset: '30d', all: false };
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; preset?: string }>;
}) {
  const sp = await searchParams;
  const range = resolveRange(sp);

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ga4 = await fetchGA4Overview();

  let all: Reservation[] = [];
  if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/reservations?select=id,folio,guest_name,room_type,check_in,check_out,nights,total_mxn,status,payment_method,notes,created_at&order=created_at.desc`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Cache-Control': 'no-store',
        },
      }
    );
    if (res.ok) all = await res.json();
  }

  // Filtro de rango por check_in. Excluye lo de "todo el historial".
  const inRange = range.all
    ? all
    : all.filter(r => r.check_in >= range.from && r.check_in <= range.to);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const total          = inRange.length;
  const cancelled      = inRange.filter(r => r.status === 'cancelled').length;
  const noShow         = inRange.filter(r => r.status === 'no_show').length;
  const active         = inRange.filter(r => !['cancelled', 'no_show'].includes(r.status));
  const confirmed      = active.filter(r => r.status === 'confirmed');
  const pendingAll     = active.filter(r => ['pending', 'pending_payment', 'waitlist'].includes(r.status));
  // Refund pending es estado actual — siempre mostrar all-time, no filtrar por rango.
  const refundPending  = all.filter(r => r.status === 'refund_pending');

  // Today in YYYY-MM-DD for upcoming filter
  const todayStr = new Date().toISOString().slice(0, 10);

  // Upcoming liquidations: confirmed + pay-at-hotel + future check-in
  const upcomingLiquidations = confirmed
    .filter(r => r.payment_method !== 'online' && r.check_in >= todayStr)
    .sort((a, b) => a.check_in.localeCompare(b.check_in));

  // Revenue: confirmed paid online via MP
  const cobrаdoOnline = confirmed
    .filter(r => r.payment_method === 'online')
    .reduce((s, r) => s + r.total_mxn, 0);

  // Revenue: anticipos received on pay-at-hotel confirmed reservations
  const anticiposTotal = confirmed
    .filter(r => r.payment_method !== 'online')
    .reduce((s, r) => {
      const a = parseAnticipo(r.notes);
      return s + (a ?? 0);
    }, 0);

  // Pending at destination: confirmed pay-at-hotel with FUTURE check-in, total MINUS anticipos
  const pendienteDestino = confirmed
    .filter(r => r.payment_method !== 'online' && r.check_in >= todayStr)
    .reduce((s, r) => s + getBalanceDue(r), 0);

  // Revenue potential: pending reservations (not yet confirmed/paid)
  const revenuePoтencial = pendingAll.reduce((s, r) => s + r.total_mxn, 0);

  // Refunds: money to return
  const refundAmount = refundPending.reduce((s, r) => s + r.total_mxn, 0);

  const conversionRate = active.length > 0 ? Math.round((confirmed.length / active.length) * 100) : 0;

  // ADR — Average Daily Rate
  const totalNights = confirmed.reduce((s, r) => s + (r.nights || 1), 0);
  const totalRevenueFull = confirmed.reduce((s, r) => s + r.total_mxn, 0);
  const adr = totalNights > 0 ? Math.round(totalRevenueFull / totalNights) : 0;

  // Reservations by day of week (check_in day)
  const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const byDayOfWeek = DAY_NAMES.map((day, i) => ({
    day,
    count: confirmed.filter(r => new Date(r.check_in + 'T12:00:00').getDay() === i).length,
  }));
  const maxDayCount = Math.max(...byDayOfWeek.map(d => d.count), 1);

  // ── Status breakdown ─────────────────────────────────────────────────────
  const byStatus = Object.entries(STATUS_LABEL).map(([status, label]) => ({
    status, label,
    count: all.filter(r => r.status === status).length,
    color: STATUS_COLOR[status] || '#999',
  })).filter(s => s.count > 0);
  const maxCount = Math.max(...byStatus.map(s => s.count), 1);

  // ── Monthly revenue (last 6 months) ──────────────────────────────────────
  const last6 = months(6);
  const monthly = last6.map(ym => ({
    label: monthLabel(ym),
    revenueOnline: all
      .filter(r => r.status === 'confirmed' && r.payment_method === 'online' && r.check_in.startsWith(ym))
      .reduce((s, r) => s + r.total_mxn, 0),
    revenueHotel: all
      .filter(r => r.status === 'confirmed' && r.payment_method !== 'online' && r.check_in.startsWith(ym))
      .reduce((s, r) => s + r.total_mxn, 0),
    count: all.filter(r => r.status === 'confirmed' && r.check_in.startsWith(ym)).length,
  }));
  const maxRevenue = Math.max(...monthly.map(m => m.revenueOnline + m.revenueHotel), 1);

  // ── By room type ─────────────────────────────────────────────────────────
  const byRoom = Object.entries(ROOM_LABEL).map(([type, label]) => ({
    type, label,
    count: all.filter(r => r.room_type === type && !['cancelled', 'no_show'].includes(r.status)).length,
    revenue: all
      .filter(r => r.room_type === type && r.status === 'confirmed')
      .reduce((s, r) => s + r.total_mxn, 0),
  })).filter(r => r.count > 0);

  // ── Recent reservations ───────────────────────────────────────────────────
  const recent = all.slice(0, 10);

  const cardStyle = {
    background: '#fff',
    border: '1px solid #e8e4de',
    borderRadius: '12px',
    padding: '20px 22px',
  } as React.CSSProperties;

  const labelStyle = {
    fontSize: '0.68rem',
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: '#856d47',
    fontWeight: 600,
    marginBottom: '4px',
  };

  const rangeLabel = range.all
    ? 'todo el historial'
    : range.preset === 'ytd' ? `año ${range.from.slice(0, 4)}`
    : range.preset === 'custom' ? `${range.from} → ${range.to}`
    : `últimos ${range.preset === '7d' ? '7' : range.preset === '90d' ? '90' : '30'} días`;

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#1a1a1a', margin: '0 0 4px' }}>Analytics</h1>
        <p style={{ fontSize: '0.8rem', color: '#6b6b6b', margin: 0 }}>
          {total} reservaciones · {rangeLabel}
          {!range.all && <span style={{ color: '#aaa' }}> · {all.length} en total</span>}
        </p>
      </div>

      <DateRangeFilter from={range.from} to={range.to} presetId={range.preset} />

      {/* ── KPI Cards — Revenue real ── */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#856d47', fontWeight: 600, marginBottom: '10px' }}>
          Desglose financiero
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div style={{ ...cardStyle, borderLeft: `3px solid ${MP_BLUE}` }}>
          <div style={labelStyle}>Cobrado online (MP)</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 700, color: MP_BLUE, lineHeight: 1.1 }}>${fmt(cobrаdoOnline)}</div>
          <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '3px' }}>
            {confirmed.filter(r => r.payment_method === 'online').length} reservas · pago recibido
          </div>
        </div>

        <div style={{ ...cardStyle, borderLeft: '3px solid #f39c12' }}>
          <div style={labelStyle}>Anticipo recibido</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#f39c12', lineHeight: 1.1 }}>
            {anticiposTotal > 0 ? `$${fmt(anticiposTotal)}` : '—'}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '3px' }}>
            pago parcial · pagan resto al llegar
          </div>
        </div>

        <div style={{ ...cardStyle, borderLeft: '3px solid #2980b9' }}>
          <div style={labelStyle}>Pendiente al llegar</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#2980b9', lineHeight: 1.1 }}>${fmt(pendienteDestino)}</div>
          <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '3px' }}>
            {confirmed.filter(r => r.payment_method !== 'online' && r.check_in >= todayStr).length} reservas próximas · pagan en hotel
          </div>
        </div>

        <div style={{ ...cardStyle, borderLeft: '3px solid #6b6b6b' }}>
          <div style={labelStyle}>Revenue potencial</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#6b6b6b', lineHeight: 1.1 }}>${fmt(revenuePoтencial)}</div>
          <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '3px' }}>
            {pendingAll.length} reservas sin confirmar
          </div>
        </div>

        {refundPending.length > 0 && (
          <div style={{ ...cardStyle, borderLeft: '3px solid #c0392b' }}>
            <div style={labelStyle}>⚠ Reembolsos pendientes</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#c0392b', lineHeight: 1.1 }}>${fmt(refundAmount)}</div>
            <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '3px' }}>
              {refundPending.length} reserva{refundPending.length > 1 ? 's' : ''} · requieren autorización
            </div>
          </div>
        )}

        <div style={cardStyle}>
          <div style={labelStyle}>Conversión</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#856d47', lineHeight: 1.1 }}>{conversionRate}%</div>
          <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '3px' }}>
            {confirmed.length} de {active.length} activas confirmadas
          </div>
        </div>

        <div style={cardStyle}>
          <div style={labelStyle}>ADR (precio/noche)</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#856d47', lineHeight: 1.1 }}>{adr > 0 ? `$${fmt(adr)}` : '—'}</div>
          <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '3px' }}>
            {totalNights} noches confirmadas
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '16px', marginBottom: '24px' }}>

        {/* ── Revenue mensual ── */}
        <div style={cardStyle}>
          <div style={{ ...labelStyle, marginBottom: '8px' }}>Revenue mensual (confirmado)</div>
          <div style={{ display: 'flex', gap: '8px', fontSize: '0.62rem', color: '#888', marginBottom: '14px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', background: MP_BLUE, borderRadius: '2px' }} /> MP online
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#b8956a', borderRadius: '2px' }} /> Pago en hotel
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '100px' }}>
            {monthly.map(m => {
              const total = m.revenueOnline + m.revenueHotel;
              const hTotal = Math.max(4, (total / maxRevenue) * 72);
              const hOnline = total > 0 ? (m.revenueOnline / total) * hTotal : 0;
              const hHotel  = total > 0 ? (m.revenueHotel  / total) * hTotal : 0;
              return (
                <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div style={{ fontSize: '0.6rem', color: '#856d47', fontWeight: 600 }}>
                    {total > 0 ? `$${Math.round(total / 1000)}k` : ''}
                  </div>
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '72px' }}>
                    {hOnline > 0 && (
                      <div style={{ width: '100%', background: MP_BLUE, height: `${hOnline}px`, borderRadius: hHotel > 0 ? '0' : '4px 4px 0 0' }} />
                    )}
                    {hHotel > 0 && (
                      <div style={{ width: '100%', background: '#b8956a', height: `${hHotel}px`, borderRadius: hOnline > 0 ? '4px 4px 0 0' : '4px 4px 0 0' }} />
                    )}
                    {total === 0 && (
                      <div style={{ width: '100%', background: '#f0ece5', height: '4px', borderRadius: '4px 4px 0 0' }} />
                    )}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: '#888', whiteSpace: 'nowrap' }}>{m.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Reservas por status ── */}
        <div style={cardStyle}>
          <div style={{ ...labelStyle, marginBottom: '14px' }}>Por estado</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {byStatus.map(s => (
              <div key={s.status}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                  <span style={{ color: '#3a3a3a' }}>{s.label}</span>
                  <span style={{ fontWeight: 600, color: s.color }}>{s.count}</span>
                </div>
                <div style={{ height: '6px', borderRadius: '3px', background: '#f0ece5' }}>
                  <div style={{
                    height: '100%', borderRadius: '3px',
                    background: s.color,
                    width: `${(s.count / maxCount) * 100}%`,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '16px', marginBottom: '24px' }}>

        {/* ── Funnel de conversión ── */}
        <div style={cardStyle}>
          <div style={{ ...labelStyle, marginBottom: '14px' }}>Funnel de conversión</div>
          {[
            { label: 'Total iniciadas',            count: total,            color: '#6b6b6b' },
            { label: 'Activas (sin canceladas)',   count: active.length,    color: '#856d47' },
            { label: 'Confirmadas',                count: confirmed.length, color: '#27ae60' },
            { label: 'Pagadas online (MP)',         count: confirmed.filter(r => r.payment_method === 'online').length, color: MP_BLUE },
            ...(refundPending.length > 0 ? [{ label: '💳 Reembolso pendiente', count: refundPending.length, color: '#c0392b' }] : []),
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <div style={{
                width: '26px', height: '26px', borderRadius: '50%',
                background: step.color, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.68rem', fontWeight: 700, flexShrink: 0,
              }}>{i + 1}</div>
              <div style={{ flex: 1, fontSize: '0.75rem', color: '#3a3a3a' }}>{step.label}</div>
              <div style={{ fontWeight: 700, color: step.color, fontSize: '1.1rem' }}>{step.count}</div>
            </div>
          ))}
          <div style={{ marginTop: '8px', padding: '10px 14px', background: '#f5f3ef', borderRadius: '8px', fontSize: '0.75rem', color: '#856d47', fontWeight: 600 }}>
            Tasa de conversión: {conversionRate}%
          </div>
        </div>

        {/* ── Por tipo de habitación ── */}
        <div style={cardStyle}>
          <div style={{ ...labelStyle, marginBottom: '14px' }}>Por habitación (activas)</div>
          {byRoom.length > 0 ? byRoom.map(r => (
            <div key={r.type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0ece5' }}>
              <div>
                <div style={{ fontSize: '0.82rem', color: '#3a3a3a' }}>{r.label}</div>
                <div style={{ fontSize: '0.7rem', color: '#888' }}>${fmt(r.revenue)} revenue</div>
              </div>
              <span style={{ fontWeight: 700, color: '#856d47', fontSize: '1.1rem' }}>{r.count}</span>
            </div>
          )) : (
            <p style={{ fontSize: '0.78rem', color: '#888' }}>Sin datos</p>
          )}
        </div>

        {/* ── Llegadas por día de semana ── */}
        <div style={cardStyle}>
          <div style={{ ...labelStyle, marginBottom: '8px' }}>Llegadas por día de semana</div>
          <p style={{ fontSize: '0.7rem', color: '#aaa', margin: '0 0 12px' }}>Check-ins confirmados</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '90px' }}>
            {byDayOfWeek.map(d => {
              const h = Math.max(4, (d.count / maxDayCount) * 62);
              return (
                <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                  {d.count > 0 && <div style={{ fontSize: '0.6rem', color: '#856d47', fontWeight: 600 }}>{d.count}</div>}
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '62px' }}>
                    <div style={{ width: '100%', background: d.count === maxDayCount ? '#856d47' : '#c9a97a', height: `${h}px`, borderRadius: '3px 3px 0 0' }} />
                  </div>
                  <div style={{ fontSize: '0.6rem', color: '#888' }}>{d.day}</div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── Próximas liquidaciones ── */}
      {upcomingLiquidations.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: '24px', borderLeft: '3px solid #f39c12' }}>
          <div style={{ ...labelStyle, marginBottom: '16px' }}>
            Próximas liquidaciones al llegar
            <span style={{ marginLeft: '8px', background: '#fff3cd', color: '#856d47', padding: '2px 8px', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 700, letterSpacing: 0 }}>
              {upcomingLiquidations.length} pendiente{upcomingLiquidations.length > 1 ? 's' : ''}
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#888', margin: '0 0 14px' }}>
            Reservaciones confirmadas que pagarán al llegar al hotel. Montos a cobrar en destino.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f0ece5' }}>
                  {['Folio', 'Huésped', 'Check-in', 'Check-out', 'Total', 'Anticipo', 'A cobrar', ''].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: '#856d47', fontWeight: 600, fontSize: '0.68rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {upcomingLiquidations.map((r, i) => {
                  const anticipo = getAnticipo(r);
                  const aCobrar  = getBalanceDue(r);
                  const diasAntes = Math.ceil((new Date(r.check_in + 'T12:00:00').getTime() - Date.now()) / 86400000);
                  const href = `/admin/reservaciones/${r.id}`;
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f5f3ef', background: i % 2 === 0 ? '#fff' : '#fafaf8' }}>
                      <td style={{ padding: '8px 10px' }}>
                        <Link href={href} style={{ fontFamily: 'monospace', color: '#856d47', fontWeight: 600, textDecoration: 'none' }}>
                          {r.folio}
                        </Link>
                      </td>
                      <td style={{ padding: '8px 10px', color: '#1a1a1a', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <Link href={href} style={{ color: '#1a1a1a', textDecoration: 'none' }}>
                          {r.guest_name}
                        </Link>
                        {r.notes && <div style={{ fontSize: '0.65rem', color: '#888', fontStyle: 'italic' }} title={r.notes}>📝 {r.notes.slice(0, 25)}{r.notes.length > 25 ? '…' : ''}</div>}
                      </td>
                      <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                        <div style={{ color: diasAntes <= 1 ? '#c62828' : diasAntes <= 3 ? '#f57f17' : '#1a1a1a', fontWeight: diasAntes <= 3 ? 700 : 400 }}>
                          {r.check_in}
                        </div>
                        <div style={{ fontSize: '0.67rem', color: diasAntes <= 1 ? '#c62828' : '#888', fontWeight: diasAntes <= 1 ? 700 : 400 }}>
                          {diasAntes === 0 ? '¡HOY!' : diasAntes === 1 ? 'Mañana' : `en ${diasAntes}d`}
                        </div>
                      </td>
                      <td style={{ padding: '8px 10px', color: '#4a4a4a', whiteSpace: 'nowrap' }}>{r.check_out}</td>
                      <td style={{ padding: '8px 10px', color: '#4a4a4a', whiteSpace: 'nowrap' }}>${fmt(r.total_mxn)}</td>
                      <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                        {anticipo ? <span style={{ color: '#f57f17', fontWeight: 600 }}>${fmt(anticipo)}</span> : <span style={{ color: '#ccc' }}>—</span>}
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: '#2e7d32', whiteSpace: 'nowrap', fontSize: '0.9rem' }}>
                        ${fmt(aCobrar)}
                      </td>
                      <td style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>
                        <Link href={href} style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '6px', background: '#f5f3ef', color: '#856d47', fontSize: '0.72rem', fontWeight: 600, textDecoration: 'none' }}>
                          Editar →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #f0ece5', background: '#f5f3ef' }}>
                  <td colSpan={6} style={{ padding: '8px 10px', fontWeight: 700, color: '#856d47', fontSize: '0.78rem' }}>Total a cobrar en destino</td>
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: '#2e7d32', fontSize: '0.95rem' }}>
                    ${fmt(upcomingLiquidations.reduce((s, r) => s + getBalanceDue(r), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── GA4 Web Analytics ── */}
      {ga4 ? (
        <>
          <div style={{ margin: '32px 0 10px' }}>
            <div style={{ fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#856d47', fontWeight: 600, marginBottom: '10px' }}>
              Tráfico web — últimos 30 días
            </div>
          </div>

          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            {[
              { label: 'Visitantes únicos', value: ga4.users30d.toLocaleString('es-MX'), sub: `${ga4.users7d.toLocaleString('es-MX')} esta semana`, color: '#2980b9' },
              { label: 'Sesiones',          value: ga4.sessions30d.toLocaleString('es-MX'), sub: `${ga4.sessions7d.toLocaleString('es-MX')} esta semana`, color: '#27ae60' },
              { label: 'Páginas vistas',    value: ga4.pageViews30d.toLocaleString('es-MX'), sub: 'vistas totales', color: '#8e44ad' },
              { label: 'Tasa de rebote',    value: `${ga4.bounceRate}%`, sub: 'sin interacción', color: ga4.bounceRate > 70 ? '#c0392b' : ga4.bounceRate > 50 ? '#f39c12' : '#27ae60' },
              { label: 'Duración media',    value: fmtDuration(ga4.avgSessionDuration), sub: 'por sesión', color: '#856d47' },
              { label: 'Inicio de reserva', value: ga4.beginCheckouts.toString(), sub: 'abrieron el modal', color: '#f39c12' },
              { label: 'Reservas online',   value: ga4.purchases.toString(), sub: 'completadas', color: '#27ae60' },
              { label: 'Búsquedas',         value: ga4.searches.toString(), sub: 'en el directorio', color: '#856d47' },
            ].map(k => (
              <div key={k.label} style={{ ...cardStyle, borderLeft: `3px solid ${k.color}` }}>
                <div style={labelStyle}>{k.label}</div>
                <div style={{ fontSize: '1.45rem', fontWeight: 700, color: k.color, lineHeight: 1.1 }}>{k.value}</div>
                <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '3px' }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Daily visitors line chart */}
          {ga4.dailyUsers.length >= 2 && (
            <div style={{ ...cardStyle, marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
                <div style={labelStyle}>Visitantes diarios (30 días)</div>
                <div style={{ display: 'flex', gap: '14px', fontSize: '0.62rem', color: '#888' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ display: 'inline-block', width: '18px', height: '2px', background: '#2980b9', borderRadius: '1px' }} /> Usuarios
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ display: 'inline-block', width: '18px', height: '2px', background: '#27ae60', borderRadius: '1px' }} /> Sesiones
                  </span>
                </div>
              </div>
              {(() => {
                const data = ga4.dailyUsers;
                const maxU = Math.max(...data.map(d => d.users), 1);
                const W = 800, H = 90, PAD = 6;
                const n = data.length - 1;
                const xOf = (i: number) => ((i / n) * W).toFixed(1);
                const yOf = (v: number) => (H - PAD - (v / maxU) * (H - PAD * 2)).toFixed(1);
                const ptU = data.map((d, i) => `${xOf(i)},${yOf(d.users)}`).join(' ');
                const ptS = data.map((d, i) => `${xOf(i)},${yOf(d.sessions)}`).join(' ');
                const area = `0,${H} ${ptU} ${W},${H}`;
                const d0 = data[0].date.slice(5).replace('-', '/');
                const dN = data[data.length - 1].date.slice(5).replace('-', '/');
                return (
                  <div>
                    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '90px', display: 'block' }} preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="ga4grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2980b9" stopOpacity="0.18" />
                          <stop offset="100%" stopColor="#2980b9" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>
                      <polygon points={area} fill="url(#ga4grad)" />
                      <polyline points={ptS} fill="none" stroke="#27ae60" strokeWidth="1.5" strokeLinejoin="round" strokeOpacity="0.65" />
                      <polyline points={ptU} fill="none" stroke="#2980b9" strokeWidth="2" strokeLinejoin="round" />
                    </svg>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#ccc', marginTop: '2px' }}>
                      <span>{d0}</span><span>{dN}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Pages + Sources */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={cardStyle}>
              <div style={{ ...labelStyle, marginBottom: '12px' }}>Páginas más visitadas</div>
              {ga4.topPages.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f0ece5', fontSize: '0.78rem' }}>
                  <span style={{ color: '#3a3a3a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{p.path}</span>
                  <span style={{ fontWeight: 700, color: '#856d47', flexShrink: 0 }}>{p.views.toLocaleString('es-MX')}</span>
                </div>
              ))}
            </div>
            <div style={cardStyle}>
              <div style={{ ...labelStyle, marginBottom: '12px' }}>Fuentes de tráfico</div>
              {ga4.topSources.map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f0ece5', fontSize: '0.78rem' }}>
                  <span style={{ color: '#3a3a3a' }}>{s.source}</span>
                  <span style={{ fontWeight: 700, color: '#856d47' }}>{s.sessions.toLocaleString('es-MX')} sesiones</span>
                </div>
              ))}
            </div>
          </div>

          {/* Devices + Countries */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={cardStyle}>
              <div style={{ ...labelStyle, marginBottom: '14px' }}>Dispositivos</div>
              {(() => {
                const tot = ga4.deviceBreakdown.reduce((s, d) => s + d.users, 0) || 1;
                const COLORS = ['#2980b9', '#856d47', '#27ae60', '#8e44ad'];
                const ICONS: Record<string, string> = { mobile: '📱', desktop: '💻', tablet: '📟' };
                return ga4.deviceBreakdown.map((d, i) => {
                  const pct = Math.round((d.users / tot) * 100);
                  return (
                    <div key={i} style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '5px' }}>
                        <span style={{ color: '#3a3a3a' }}>{ICONS[d.device] || '🖥'} {d.device.charAt(0).toUpperCase() + d.device.slice(1)}</span>
                        <span style={{ fontWeight: 700, color: COLORS[i] || '#999' }}>
                          {pct}% <span style={{ fontWeight: 400, color: '#aaa', fontSize: '0.7rem' }}>({d.users.toLocaleString('es-MX')})</span>
                        </span>
                      </div>
                      <div style={{ height: '6px', borderRadius: '3px', background: '#f0ece5' }}>
                        <div style={{ height: '100%', borderRadius: '3px', background: COLORS[i] || '#999', width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            <div style={cardStyle}>
              <div style={{ ...labelStyle, marginBottom: '14px' }}>Países principales</div>
              {(() => {
                const maxC = Math.max(...ga4.topCountries.map(c => c.users), 1);
                return ga4.topCountries.map((c, i) => (
                  <div key={i} style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                      <span style={{ color: '#3a3a3a' }}>{c.country}</span>
                      <span style={{ fontWeight: 700, color: '#856d47' }}>{c.users.toLocaleString('es-MX')}</span>
                    </div>
                    <div style={{ height: '4px', borderRadius: '2px', background: '#f0ece5' }}>
                      <div style={{ height: '100%', borderRadius: '2px', background: '#856d47', width: `${(c.users / maxC) * 100}%`, opacity: Math.max(0.3, 1 - i * 0.13) }} />
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </>
      ) : (
        <div style={{ ...cardStyle, marginBottom: '24px', borderLeft: '3px solid #e8e4de', background: '#fafaf8' }}>
          <div style={{ ...labelStyle, marginBottom: '6px' }}>Tráfico web (Google Analytics)</div>
          <p style={{ fontSize: '0.78rem', color: '#888', margin: 0 }}>
            Conecta tu cuenta de servicio de Google para ver visitantes, páginas vistas y conversiones aquí.
            Configura las variables <code>GA4_PROPERTY_ID</code>, <code>GA4_CLIENT_EMAIL</code> y <code>GA4_PRIVATE_KEY</code> en Vercel.
          </p>
        </div>
      )}

      {/* ── Reservaciones recientes ── */}
      <div style={cardStyle}>
        <div style={{ ...labelStyle, marginBottom: '16px' }}>Reservaciones recientes</div>
        {recent.length === 0 ? (
          <p style={{ fontSize: '0.82rem', color: '#888' }}>Sin reservaciones aún.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f0ece5' }}>
                  {['Folio', 'Huésped', 'Habitación', 'Llegada', 'Total', 'Pago', 'Estado', ''].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: '#856d47', fontWeight: 600, letterSpacing: '0.05em', fontSize: '0.68rem', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((r, i) => {
                  const anticipo = parseAnticipo(r.notes);
                  const isPaid   = r.payment_method === 'online';
                  const href = `/admin/reservaciones/${r.id}`;
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f5f3ef', background: i % 2 === 0 ? '#fff' : '#fafaf8' }}>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#856d47', fontWeight: 600 }}>
                        <Link href={href} style={{ color: '#856d47', textDecoration: 'none' }}>{r.folio}</Link>
                      </td>
                      <td style={{ padding: '8px 10px', color: '#1a1a1a', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <Link href={href} style={{ color: '#1a1a1a', textDecoration: 'none' }}>{r.guest_name}</Link>
                      </td>
                      <td style={{ padding: '8px 10px', color: '#4a4a4a' }}>{ROOM_LABEL[r.room_type] || r.room_type}</td>
                      <td style={{ padding: '8px 10px', color: '#4a4a4a', whiteSpace: 'nowrap' }}>{r.check_in}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: '#1a1a1a', whiteSpace: 'nowrap' }}>
                        ${fmt(r.total_mxn)}
                        {anticipo && !isPaid && (
                          <div style={{ fontSize: '0.65rem', color: '#f39c12', fontWeight: 400 }}>
                            anticipo ${fmt(anticipo)}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', fontSize: '0.73rem', color: '#4a4a4a' }}>
                        {PAYMENT_LABEL[r.payment_method] || r.payment_method || '—'}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: '20px',
                          background: (STATUS_COLOR[r.status] || '#999') + '18',
                          color: STATUS_COLOR[r.status] || '#999',
                          fontWeight: 600, fontSize: '0.68rem', letterSpacing: '0.04em',
                        }}>
                          {STATUS_LABEL[r.status] || r.status}
                        </span>
                      </td>
                      <td style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>
                        <Link href={href} style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '6px', background: '#f5f3ef', color: '#856d47', fontSize: '0.72rem', fontWeight: 600, textDecoration: 'none' }}>
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
