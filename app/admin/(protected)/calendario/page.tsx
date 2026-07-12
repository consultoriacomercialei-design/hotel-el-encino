/**
 * /admin/calendario — Server Component, CSS Grid calendar
 * Primary source: Supabase reservations
 * Enrichment: Google Calendar cross-reference for sync indicators
 */

import { supabaseGet } from '@/app/lib/supabase';
import { listCalendarEventsForMonth, type GCalEvent } from '@/app/lib/google-calendar';
import Link from 'next/link';

interface Reservation {
  id: string;
  folio: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  status: string;
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  confirmed:       { bg: '#c8e6c9', color: '#1b5e20' },
  pending:         { bg: '#fff9c4', color: '#f57f17' },
  pending_payment: { bg: '#bbdefb', color: '#0d47a1' },
  waitlist:        { bg: '#e1bee7', color: '#4a148c' },
  no_show:         { bg: '#ffcdd2', color: '#b71c1c' },
};

const WEEKDAYS  = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function prevNextMonth(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Returns the set of month day-numbers covered by this reservation (check-out day excluded) */
function expandReservation(r: Reservation, year: number, month: number): Set<number> {
  const days      = new Set<number>();
  const start     = new Date(r.check_in  + 'T12:00:00');
  const end       = new Date(r.check_out + 'T12:00:00');
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd   = new Date(year, month, 0);

  const actualEnd = new Date(end);
  actualEnd.setDate(actualEnd.getDate() - 1);

  const from = start < monthStart ? monthStart : start;
  const to   = actualEnd > monthEnd ? monthEnd : actualEnd;

  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    days.add(d.getDate());
  }
  return days;
}

/** Returns the set of month day-numbers covered by a GCal event (end date exclusive for all-day events) */
function expandGCalEvent(startDate: string, endDate: string, year: number, month: number): Set<number> {
  const days       = new Set<number>();
  const start      = new Date(startDate + 'T12:00:00');
  // GCal all-day events: end date is exclusive (i.e., end = day after last occupied day)
  const endExcl    = new Date(endDate   + 'T12:00:00');
  const actualEnd  = new Date(endExcl);
  actualEnd.setDate(actualEnd.getDate() - 1);

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd   = new Date(year, month, 0);

  const from = start < monthStart ? monthStart : start;
  const to   = actualEnd > monthEnd ? monthEnd : actualEnd;

  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    days.add(d.getDate());
  }
  return days;
}

/** Extract RSV-XX folio from a GCal event description */
function extractFolio(ev: GCalEvent): string | null {
  return (ev.description ?? '').match(/Folio:\s*(RSV-\d+)/i)?.[1] ?? null;
}

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const today        = new Date();
  const yearMonthStr = monthParam || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [year, month] = yearMonthStr.split('-').map(Number);

  const firstDay    = new Date(year, month - 1, 1);
  const lastDay     = new Date(year, month, 0);
  const daysInMonth = lastDay.getDate();
  const rawWd       = firstDay.getDay();
  const startWd     = rawWd === 0 ? 6 : rawWd - 1;
  const lastDayStr  = `${yearMonthStr}-${String(daysInMonth).padStart(2, '0')}`;

  // Fetch Supabase reservations + Google Calendar events in parallel
  const [rows, gcalEvents] = await Promise.all([
    supabaseGet<Reservation>('reservations', {
      check_in:  `lte.${lastDayStr}`,
      check_out: `gte.${yearMonthStr}-01`,
      status:    'not.in.(cancelled,checked_out,no_show)',
      select:    'id,folio,guest_name,check_in,check_out,status',
      order:     'check_in.asc',
    }, true),
    listCalendarEventsForMonth(year, month),
  ]);

  // Build set of folios present in Google Calendar
  const gcalFolios = new Set(gcalEvents.map(extractFolio).filter(Boolean) as string[]);

  // Build set of folios present in Supabase (to detect orphan GCal events)
  const supabaseFolios = new Set(rows.map(r => r.folio));

  // Orphan GCal events: have a folio not found in Supabase (or no folio at all but look like hotel events)
  const orphanGCalEvents = gcalEvents.filter(ev => {
    const folio = extractFolio(ev);
    if (folio) return !supabaseFolios.has(folio); // has folio but not in Supabase
    // Events without folio that look like hotel reservations (created manually)
    return (ev.summary ?? '').includes('🏨');
  });

  // Build day → Supabase reservations map
  const dayMap: Map<number, Reservation[]> = new Map();
  for (const r of rows) {
    for (const d of expandReservation(r, year, month)) {
      if (!dayMap.has(d)) dayMap.set(d, []);
      dayMap.get(d)!.push(r);
    }
  }

  // Build day → orphan GCal events map
  const orphanDayMap: Map<number, GCalEvent[]> = new Map();
  for (const ev of orphanGCalEvents) {
    const startDate = ev.start.date ?? ev.start.dateTime?.slice(0, 10) ?? '';
    const endDate   = ev.end.date   ?? ev.end.dateTime?.slice(0, 10)   ?? '';
    if (!startDate) continue;
    for (const d of expandGCalEvent(startDate, endDate || startDate, year, month)) {
      if (!orphanDayMap.has(d)) orphanDayMap.set(d, []);
      // Avoid duplicates across days
      if (!orphanDayMap.get(d)!.find(e => e.id === ev.id)) {
        orphanDayMap.get(d)!.push(ev);
      }
    }
  }

  const prevMonth = prevNextMonth(yearMonthStr, -1);
  const nextMonth = prevNextMonth(yearMonthStr, +1);
  const todayDay  = today.getFullYear() === year && today.getMonth() + 1 === month ? today.getDate() : -1;
  const totalCells = startWd + daysInMonth;
  const rows7      = Math.ceil(totalCells / 7);

  const gcalConfigured = gcalEvents !== null; // listCalendarEventsForMonth returns [] on error

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem', color: '#040404' }}>Calendario</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          <NavLink href={`/admin/calendario?month=${prevMonth}`}>← Anterior</NavLink>
          <span style={{ fontWeight: 600, fontSize: '1rem', color: '#040404', minWidth: '160px', textAlign: 'center' }}>
            {MONTHS_ES[month - 1]} {year}
          </span>
          <NavLink href={`/admin/calendario?month=${nextMonth}`}>Siguiente →</NavLink>
        </div>
        {monthParam && <NavLink href="/admin/calendario">Hoy</NavLink>}
      </div>

      {/* Orphan warning banner */}
      {orphanGCalEvents.length > 0 && (
        <div style={{
          background: '#fff3e0', border: '1px solid #e65100', borderRadius: '10px',
          padding: '10px 16px', marginBottom: '16px', fontSize: '0.82rem',
          color: '#e65100', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
        }}>
          <span>⚠ {orphanGCalEvents.length} evento{orphanGCalEvents.length !== 1 ? 's' : ''} en Google Calendar sin reservación en el sistema.</span>
          <Link href="/admin/configuracion#calendario" style={{ color: '#e65100', fontWeight: 700, textDecoration: 'underline' }}>
            Limpiar en Configuración →
          </Link>
        </div>
      )}

      {/* Calendar Grid */}
      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e8e4de', overflow: 'hidden' }}>
        {/* Weekday headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#f5f3ef', borderBottom: '1px solid #e8e4de' }}>
          {WEEKDAYS.map(w => (
            <div key={w} style={{ padding: '10px 0', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#856d47', letterSpacing: '0.05em' }}>
              {w}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {Array.from({ length: rows7 * 7 }, (_, i) => {
            const dayNum       = i - startWd + 1;
            const isValid      = dayNum >= 1 && dayNum <= daysInMonth;
            const isToday      = dayNum === todayDay;
            const reservations = isValid ? (dayMap.get(dayNum) || []) : [];
            const orphans      = isValid ? (orphanDayMap.get(dayNum) || []) : [];

            return (
              <div key={i} style={{
                minHeight: '90px',
                padding: '6px 8px',
                borderRight: '1px solid #f0ede8',
                borderBottom: '1px solid #f0ede8',
                background: isToday ? '#fff8f0' : '#fff',
              }}>
                {isValid && (
                  <>
                    <div style={{
                      fontSize: '0.82rem', fontWeight: isToday ? 700 : 400,
                      color: isToday ? '#856d47' : '#040404', marginBottom: '4px',
                    }}>
                      {dayNum}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>

                      {/* Supabase reservations */}
                      {reservations.map(r => {
                        const s = STATUS_COLORS[r.status] || { bg: '#f5f5f5', color: '#555' };
                        const missingInGcal = (r.status === 'confirmed' || r.status === 'pending') && !gcalFolios.has(r.folio);
                        return (
                          <Link
                            key={r.id}
                            href={`/admin/reservaciones/${r.id}`}
                            title={`${r.folio} · ${r.guest_name} · ${r.check_in} → ${r.check_out}${missingInGcal ? ' · ⚠ Sin evento en Google Calendar' : ''}`}
                            style={{
                              background: s.bg, color: s.color,
                              borderRadius: '4px', padding: '2px 5px',
                              fontSize: '0.68rem', fontWeight: 600,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px',
                              cursor: 'pointer',
                              outline: missingInGcal ? '1px solid #e65100' : 'none',
                            }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {r.guest_name.split(' ')[0]}
                              <span style={{ opacity: 0.7, fontWeight: 400, marginLeft: '3px', fontSize: '0.6rem' }}>{r.folio}</span>
                            </span>
                            {missingInGcal && (
                              <span title="Sin evento en Google Calendar" style={{ flexShrink: 0, fontSize: '0.65rem' }}>📅✗</span>
                            )}
                          </Link>
                        );
                      })}

                      {/* Orphan Google Calendar events */}
                      {orphans.map(ev => {
                        const folio = extractFolio(ev);
                        return (
                          <Link
                            key={ev.id}
                            href="/admin/configuracion"
                            title={`Huérfano: ${ev.summary} — existe en Google Calendar pero no en el sistema. Ir a Configuración para eliminar.`}
                            style={{
                              background: '#fff3e0', color: '#e65100',
                              borderRadius: '4px', padding: '2px 5px',
                              fontSize: '0.68rem', fontWeight: 600,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              textDecoration: 'none', display: 'block',
                              cursor: 'pointer', border: '1px solid #e6510040',
                            }}
                          >
                            ⚠ {folio ?? ev.summary?.replace('🏨 ', '').split(' ·')[0] ?? 'Huérfano'}
                          </Link>
                        );
                      })}

                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        {Object.entries(STATUS_COLORS).map(([k, v]) => {
          const labels: Record<string, string> = {
            confirmed: 'Confirmada', pending: 'Pendiente',
            pending_payment: 'Pago pendiente', waitlist: 'Lista espera', no_show: 'No show',
          };
          return (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.74rem', color: '#4a4a4a' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: v.bg, border: `1px solid ${v.color}`, display: 'inline-block' }} />
              {labels[k]}
            </div>
          );
        })}
        {gcalConfigured && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.74rem', color: '#4a4a4a' }}>
              <span style={{ fontSize: '0.7rem' }}>📅✗</span> Sin evento en Google Calendar
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.74rem', color: '#e65100' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#fff3e0', border: '1px solid #e65100', display: 'inline-block' }} />
              Huérfano (solo en Google Calendar)
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} style={{
      padding: '7px 14px', borderRadius: '8px',
      border: '1px solid #e8e4de', background: '#fff',
      color: '#4a4a4a', textDecoration: 'none', fontSize: '0.82rem',
    }}>
      {children}
    </Link>
  );
}
