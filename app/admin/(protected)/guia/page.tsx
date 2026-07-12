'use client';

import 'leaflet/dist/leaflet.css';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { listings as staticListings } from '@/app/directorio/data';
import { events as staticEvents, EVENT_CATEGORY_LABEL } from '@/app/directorio/events';
import type { LatLng } from '@/app/directorio/MapaLocationPicker';
import AdminEmailComposer from './AdminEmailComposer';

const MapaLocationPicker = dynamic(
  () => import('@/app/directorio/MapaLocationPicker'),
  { ssr: false, loading: () => <div style={{ height: 240, borderRadius: 12, background: '#f5f4f0' }} /> }
);

// ── Types ──────────────────────────────────────────────────────────────────

interface DbEvent {
  id: string;
  title: string;
  category: string;
  start_date: string;
  end_date: string;
  time_start: string | null;
  location: string;
  short_desc: string;
  price: string;
  photo_url: string | null;
  organizer_name: string | null;
  organizer_phone: string | null;
  status: string;
  created_at: string;
}

interface DbListing {
  id: string;
  name: string;
  slug: string;
  tier: string;
  status: string;
  category: string;
  short_desc: string | null;
  src: string | null;
  created_at: string;
  lat: number | null;
  lng: number | null;
  img_focus?: string | null;
  guia_profiles?: { email: string };
}

function PhotoPositioner({ src, initialValue, onSave, onCancel }: {
  src: string; initialValue: string;
  onSave: (v: string) => void; onCancel: () => void;
}) {
  const parse = (v: string): [number, number, number] => {
    const parts = v.trim().split(/\s+/);
    return [parseFloat(parts[0]) || 50, parseFloat(parts[1]) || 50, parseFloat(parts[2]) || 1];
  };
  const [pos, setPos] = useState<[number, number, number]>(() => parse(initialValue));
  const [dragging, setDragging] = useState(false);
  const isDragging = useRef(false);
  const last = useRef<[number, number]>([0, 0]);

  const start = (cx: number, cy: number) => {
    isDragging.current = true; setDragging(true);
    last.current = [cx, cy];
  };
  const move = (cx: number, cy: number) => {
    if (!isDragging.current) return;
    const dx = cx - last.current[0];
    const dy = cy - last.current[1];
    last.current = [cx, cy];
    setPos(([px, py, pz]) => [
      Math.max(0, Math.min(100, px - dx * (60 / (pz * 140)))),
      Math.max(0, Math.min(100, py - dy * (60 / (pz * 187)))),
      pz,
    ]);
  };
  const stop = () => { isDragging.current = false; setDragging(false); };

  const zoom = pos[2];
  const posStr = `${Math.round(pos[0])}% ${Math.round(pos[1])}% ${zoom.toFixed(2)}`;
  const imgLeft = `${(1 - zoom) * pos[0]}%`;
  const imgTop  = `${(1 - zoom) * pos[1]}%`;

  return (
    <div style={{ marginTop: '8px', paddingBottom: '2px' }}>
      <p style={{ fontFamily: 'system-ui', fontSize: '0.62rem', color: '#aaa', marginBottom: '8px' }}>
        Sube el zoom y arrastra para reencuadrar.
      </p>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div
          style={{ position: 'relative', width: '140px', aspectRatio: '3/4', borderRadius: '12px', overflow: 'hidden', cursor: dragging ? 'grabbing' : 'grab', border: '2px solid rgba(133,109,71,0.45)', userSelect: 'none', touchAction: 'none' }}
          onMouseDown={e => { e.preventDefault(); start(e.clientX, e.clientY); }}
          onMouseMove={e => move(e.clientX, e.clientY)}
          onMouseUp={stop} onMouseLeave={stop}
          onTouchStart={e => { e.preventDefault(); start(e.touches[0].clientX, e.touches[0].clientY); }}
          onTouchMove={e => { e.preventDefault(); move(e.touches[0].clientX, e.touches[0].clientY); }}
          onTouchEnd={stop}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" draggable={false}
            style={{ position: 'absolute', width: `${zoom * 100}%`, height: `${zoom * 100}%`, objectFit: 'cover', left: imgLeft, top: imgTop, pointerEvents: 'none', userSelect: 'none' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', opacity: dragging ? 0 : 1, transition: 'opacity 0.15s' }}>
            <div style={{ background: 'rgba(0,0,0,0.42)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
      {/* Zoom */}
      <div style={{ marginTop: '10px', padding: '0 2px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontFamily: 'system-ui', fontSize: '0.60rem', color: '#bbb' }}>Zoom</span>
          <span style={{ fontFamily: 'system-ui', fontSize: '0.60rem', color: '#bbb' }}>{zoom.toFixed(1)}×</span>
        </div>
        <input type="range" min="0.5" max="3" step="0.05"
          value={zoom}
          onChange={e => setPos(([px, py]) => [px, py, parseFloat(e.target.value)])}
          style={{ width: '100%', accentColor: '#856d47' }} />
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setPos([50, 50, 0.8])} style={{ fontFamily: 'system-ui', fontSize: '0.60rem', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(176,57,42,0.25)', background: 'transparent', color: '#b0392a', cursor: 'pointer' }}>
          ↺ Reset
        </button>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onCancel} style={btnNeutral}>Cancelar</button>
          <button onClick={() => onSave(posStr)} style={{ fontFamily: 'system-ui', fontSize: '0.72rem', padding: '6px 16px', borderRadius: '8px', border: 'none', background: '#856d47', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
            ✓ Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

interface ClickRow {
  slug:     string;
  name:     string;
  tier:     string;
  category: string;
  total:    number;
  last30:   number;
  last7:    number;
  prev7:    number;
  trend:    'up' | 'down' | 'flat';
}

// ── Constants ──────────────────────────────────────────────────────────────

const TIER_OPTIONS   = ['free', 'featured', 'hero'] as const;
const STATUS_OPTIONS = ['pending', 'active', 'suspended'] as const;

const TIER_LABEL: Record<string, string> = { free: 'Gratuito', featured: 'Destacado', hero: '★ Hero' };
const STATUS_LABEL: Record<string, string> = { pending: 'En revisión', active: 'Activo', suspended: 'Suspendido' };
const TIER_COLOR: Record<string, { bg: string; text: string }> = {
  free:     { bg: 'rgba(0,0,0,0.06)',                          text: '#666' },
  featured: { bg: 'rgba(133,109,71,0.13)',                     text: '#856d47' },
  hero:     { bg: 'linear-gradient(135deg,#856d47,#b09060)',   text: '#fff' },
};
const STATUS_COLOR: Record<string, string> = {
  pending:   '#b07d3e',
  active:    '#2a7a4f',
  suspended: '#b0392a',
};
const EVENT_STATUS_LABEL:  Record<string, string> = { active: 'Activo', hidden: 'Oculto' };
const EVENT_STATUS_COLOR:  Record<string, string> = { active: '#2a7a4f', hidden: '#b0392a' };
const EVENT_CAT_OPTIONS = [
  { value: 'cultural',    label: 'Cultural'      },
  { value: 'gastronomico',label: 'Gastronomía'   },
  { value: 'festival',    label: 'Festival'      },
  { value: 'religioso',   label: 'Religioso'     },
  { value: 'aventura',    label: 'Aventura'      },
  { value: 'comunidad',   label: 'Comunidad'     },
];
const EVENT_CAT_LABEL: Record<string, string> = Object.fromEntries(
  EVENT_CAT_OPTIONS.map(o => [o.value, o.label])
);

const TIER_CLICK_COLOR: Record<string, string> = {
  hero:     '#856d47',
  featured: '#2980b9',
  free:     '#aaa',
};

type FilterTab = 'all' | 'pending' | 'active' | 'hero' | 'featured';

// ── Component ──────────────────────────────────────────────────────────────

export default function AdminGuiaPage() {
  const [section, setSection] = useState<'anuncios' | 'eventos' | 'clicks' | 'correos'>('anuncios');

  // ── Listings state ──
  const [listings, setListings]   = useState<DbListing[]>([]);
  const [loading, setLoading]     = useState(true);
  const [updating, setUpdating]   = useState<string | null>(null);
  const [filter, setFilter]       = useState<FilterTab>('all');

  // ── Map picker state ──
  const [mapPickerId, setMapPickerId]   = useState<string | null>(null);  // which listing is open
  const [mapPickerCoord, setMapPickerCoord] = useState<LatLng | null>(null);
  const [savingCoord, setSavingCoord]   = useState(false);

  // ── Focal point picker state ──
  const [focalPickerId, setFocalPickerId]       = useState<string | null>(null);
  const [focalPickerValue, setFocalPickerValue] = useState<string>('50% 50%');

  // ── Email state ──
  const [sendingEmail, setSendingEmail]   = useState<string | null>(null);  // listingId being emailed
  const [emailResult, setEmailResult]     = useState<Record<string, string>>({}); // id → 'ok' | 'error'
  const [broadcasting, setBroadcasting]   = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<string | null>(null);

  const sendEmail = async (listingId: string, type: 'foto' | 'mapa' | 'completar') => {
    setSendingEmail(listingId + type);
    try {
      const res = await fetch('/api/admin/email-anunciante', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, type }),
      });
      const data = await res.json();
      setEmailResult(prev => ({ ...prev, [listingId]: res.ok ? `✓ Enviado a ${data.to}` : `✗ Error` }));
    } catch {
      setEmailResult(prev => ({ ...prev, [listingId]: '✗ Error de red' }));
    } finally {
      setSendingEmail(null);
    }
  };

  const sendNewsletter = async () => {
    if (!confirm('¿Enviar newsletter de mapa a TODOS los usuarios registrados?')) return;
    setBroadcasting(true);
    setBroadcastResult(null);
    try {
      const res = await fetch('/api/admin/newsletter/mapa', { method: 'POST' });
      const data = await res.json();
      setBroadcastResult(data.ok ? `✓ Enviados: ${data.sent}/${data.total}` : `✗ Error: ${data.error}`);
    } catch {
      setBroadcastResult('✗ Error de red');
    } finally {
      setBroadcasting(false);
    }
  };

  const openMapPicker = (l: DbListing) => {
    setMapPickerId(l.id);
    setMapPickerCoord(l.lat && l.lng ? { lat: l.lat, lng: l.lng } : null);
  };

  const saveCoord = async (id: string) => {
    if (!mapPickerCoord || mapPickerCoord.lat === 0) return;
    setSavingCoord(true);
    const res = await fetch(`/api/admin/guia/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: mapPickerCoord.lat, lng: mapPickerCoord.lng }),
    });
    if (res.ok) {
      setListings(prev => prev.map(l => l.id === id ? { ...l, lat: mapPickerCoord.lat, lng: mapPickerCoord.lng } : l));
      setMapPickerId(null);
    }
    setSavingCoord(false);
  };

  const clearCoord = async (id: string) => {
    await fetch(`/api/admin/guia/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: null, lng: null }),
    });
    setListings(prev => prev.map(l => l.id === id ? { ...l, lat: null, lng: null } : l));
    setMapPickerId(null);
  };

  const saveFocalPoint = async (id: string, value: string) => {
    await fetch(`/api/admin/guia/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ img_focus: value || null }),
    });
    setListings(prev => prev.map(l => l.id === id ? { ...l, img_focus: value || null } : l));
    setFocalPickerId(null);
  };

  useEffect(() => {
    fetch('/api/admin/guia')
      .then(r => r.json())
      .then(setListings)
      .finally(() => setLoading(false));
  }, []);

  // ── Clicks state ──
  const [clicks, setClicks]           = useState<ClickRow[]>([]);
  const [clicksLoading, setClicksLoading] = useState(false);

  useEffect(() => {
    if (section !== 'clicks') return;
    setClicksLoading(true);
    fetch('/api/admin/guia/clicks')
      .then(r => r.json())
      .then(setClicks)
      .finally(() => setClicksLoading(false));
  }, [section]);

  // ── Events state ──
  const [events, setEvents]               = useState<DbEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsFilter, setEventsFilter]   = useState<'all' | 'active' | 'hidden'>('all');
  const [updatingEvent, setUpdatingEvent] = useState<string | null>(null);
  const [editingEvent, setEditingEvent]   = useState<string | null>(null);
  const [editDraft, setEditDraft]         = useState<Partial<DbEvent>>({});
  const [savingEdit, setSavingEdit]       = useState(false);

  useEffect(() => {
    if (section !== 'eventos') return;
    setEventsLoading(true);
    fetch('/api/admin/guia/eventos')
      .then(r => r.json())
      .then(setEvents)
      .finally(() => setEventsLoading(false));
  }, [section]);

  const patchEvent = async (id: string, fields: Partial<DbEvent>) => {
    setUpdatingEvent(id);
    const res = await fetch(`/api/admin/guia/eventos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    if (res.ok) setEvents(prev => prev.map(e => e.id === id ? { ...e, ...fields } : e));
    setUpdatingEvent(null);
  };

  const saveEdit = async () => {
    if (!editingEvent || Object.keys(editDraft).length === 0) return;
    setSavingEdit(true);
    const res = await fetch(`/api/admin/guia/eventos/${editingEvent}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editDraft),
    });
    if (res.ok) {
      setEvents(prev => prev.map(e => e.id === editingEvent ? { ...e, ...editDraft } : e));
      setEditingEvent(null);
      setEditDraft({});
    }
    setSavingEdit(false);
  };

  const startEdit = (e: DbEvent) => {
    setEditingEvent(e.id);
    setEditDraft({
      title:          e.title,
      category:       e.category,
      start_date:     e.start_date,
      end_date:       e.end_date,
      time_start:     e.time_start ?? '',
      location:       e.location,
      short_desc:     e.short_desc,
      price:          e.price,
      organizer_name: e.organizer_name ?? '',
      organizer_phone:e.organizer_phone ?? '',
      photo_url:      e.photo_url ?? '',
    });
  };

  const today          = new Date().toISOString().slice(0, 10);
  const filteredEvents = events.filter(e =>
    eventsFilter === 'all' ? true : e.status === eventsFilter
  );

  const patch = async (id: string, field: string, value: string) => {
    setUpdating(id + field);
    const res = await fetch(`/api/admin/guia/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    if (res.ok) setListings(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
    setUpdating(null);
  };

  const filtered = listings.filter(l => {
    if (filter === 'all')      return true;
    if (filter === 'pending')  return l.status === 'pending';
    if (filter === 'active')   return l.status === 'active';
    if (filter === 'hero')     return l.tier === 'hero';
    if (filter === 'featured') return l.tier === 'featured';
    return true;
  });

  const filterTabs: { id: FilterTab; label: string; count: number }[] = [
    { id: 'all',      label: 'Todos',       count: listings.length },
    { id: 'pending',  label: 'En revisión', count: listings.filter(l => l.status === 'pending').length },
    { id: 'active',   label: 'Activos',     count: listings.filter(l => l.status === 'active').length },
    { id: 'featured', label: 'Destacados',  count: listings.filter(l => l.tier === 'featured').length },
    { id: 'hero',     label: '★ Hero',      count: listings.filter(l => l.tier === 'hero').length },
  ];

  // ── Clicks derived data ──
  const totalClicks30  = clicks.reduce((s, c) => s + c.last30, 0);
  const topListing     = clicks[0];
  const mostImproved   = [...clicks].sort((a, b) => (b.last7 - b.prev7) - (a.last7 - a.prev7))[0];
  const upgradeOpps    = clicks.filter(c => c.tier === 'free' && c.last30 >= 5);
  const maxClicks30    = clicks[0]?.last30 ?? 1;

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontFamily: 'system-ui', fontSize: '1.3rem', fontWeight: 600, color: '#040404', margin: '0 0 1rem' }}>
          Directorio
        </h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['anuncios', 'eventos', 'clicks', 'correos'] as const).map(s => (
            <button key={s} onClick={() => setSection(s)} style={{
              fontFamily: 'system-ui', fontSize: '0.8rem', fontWeight: section === s ? 600 : 400,
              padding: '8px 20px', borderRadius: '999px', cursor: 'pointer',
              border: section === s ? 'none' : '1px solid rgba(0,0,0,0.12)',
              background: section === s ? '#0d221e' : '#fff',
              color: section === s ? '#fff' : '#555',
              textTransform: 'capitalize',
            }}>
              {s === 'anuncios' ? `Anuncios (${listings.length})`
               : s === 'eventos' ? `Eventos (${events.length || ''})`
               : s === 'correos' ? '✉️ Comunicaciones'
               : '📊 Clicks & Analytics'}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════ CLICKS ══════════════════ */}
      {section === 'clicks' && (
        <>
          {clicksLoading ? (
            <p style={{ fontFamily: 'system-ui', fontSize: '0.85rem', color: '#888' }}>Cargando…</p>
          ) : clicks.length === 0 ? (
            <div style={{ background: '#fff', border: '1.5px dashed rgba(0,0,0,0.1)', borderRadius: '14px', padding: '3rem', textAlign: 'center' }}>
              <p style={{ fontFamily: 'system-ui', fontSize: '0.9rem', color: '#aaa' }}>Sin datos de clicks aún.</p>
              <p style={{ fontFamily: 'system-ui', fontSize: '0.78rem', color: '#ccc', marginTop: '0.5rem' }}>Los clicks se registran automáticamente cuando alguien visita un anuncio.</p>
            </div>
          ) : (
            <>
              {/* KPI cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                <div style={kpiCard('#0d221e')}>
                  <p style={kpiLabel}>Clicks este mes</p>
                  <p style={kpiValue('#0d221e')}>{totalClicks30}</p>
                  <p style={kpiSub}>últimos 30 días</p>
                </div>
                {topListing && (
                  <div style={kpiCard('#856d47')}>
                    <p style={kpiLabel}>Top anuncio</p>
                    <p style={{ ...kpiValue('#856d47'), fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {topListing.name}
                    </p>
                    <p style={kpiSub}>{topListing.last30} clicks (30d)</p>
                  </div>
                )}
                {mostImproved && (mostImproved.last7 - mostImproved.prev7) > 0 && (
                  <div style={kpiCard('#2a7a4f')}>
                    <p style={kpiLabel}>Más activo esta semana</p>
                    <p style={{ ...kpiValue('#2a7a4f'), fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {mostImproved.name}
                    </p>
                    <p style={kpiSub}>+{mostImproved.last7 - mostImproved.prev7} vs semana pasada</p>
                  </div>
                )}
                <div style={kpiCard(upgradeOpps.length > 0 ? '#b07d3e' : '#aaa')}>
                  <p style={kpiLabel}>Oportunidades de upgrade</p>
                  <p style={kpiValue(upgradeOpps.length > 0 ? '#b07d3e' : '#aaa')}>{upgradeOpps.length}</p>
                  <p style={kpiSub}>anuncios free con ≥5 clicks/mes</p>
                </div>
              </div>

              {/* ── Mini cards grid ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '10px', marginBottom: '24px' }}>
                {clicks.map((row, i) => {
                  const pct          = Math.round((row.last30 / maxClicks30) * 100);
                  const barColor     = TIER_CLICK_COLOR[row.tier] ?? '#aaa';
                  const trendIcon    = row.trend === 'up' ? '↑' : row.trend === 'down' ? '↓' : '→';
                  const trendColor   = row.trend === 'up' ? '#2a7a4f' : row.trend === 'down' ? '#b0392a' : '#aaa';
                  const isUpgradeOpp = row.tier === 'free' && row.last30 >= 5;
                  // Match photo + status from listings
                  const meta = listings.find(l => l.slug === row.slug);
                  const photo  = meta?.src ?? null;
                  const status = meta?.status ?? 'active';
                  const statusDot = status === 'active' ? '#2a7a4f' : status === 'pending' ? '#b07d3e' : '#b0392a';
                  return (
                    <div key={row.slug} style={{
                      background: '#fff',
                      border: isUpgradeOpp ? '1.5px solid rgba(176,125,62,0.4)' : '1px solid rgba(0,0,0,0.08)',
                      borderRadius: '14px', overflow: 'hidden',
                      display: 'flex', flexDirection: 'column',
                      boxShadow: i < 3 ? '0 2px 12px rgba(133,109,71,0.1)' : 'none',
                      position: 'relative',
                    }}>
                      {/* Photo */}
                      <div style={{ aspectRatio: '16/9', background: '#f0ede8', position: 'relative', overflow: 'hidden' }}>
                        {photo ? (
                          <Image src={photo} alt={row.name} fill sizes="180px" style={{ objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="1.5">
                              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                            </svg>
                          </div>
                        )}
                        {/* Rank bubble */}
                        <div style={{
                          position: 'absolute', top: '6px', left: '6px',
                          background: i < 3 ? '#856d47' : 'rgba(0,0,0,0.45)',
                          backdropFilter: 'blur(6px)',
                          borderRadius: '999px', padding: '2px 8px',
                          fontFamily: 'system-ui', fontSize: '0.6rem', fontWeight: 700, color: '#fff',
                        }}>#{i + 1}</div>
                        {/* Status dot */}
                        <div style={{
                          position: 'absolute', top: '8px', right: '8px',
                          width: '8px', height: '8px', borderRadius: '50%',
                          background: statusDot, boxShadow: '0 0 0 2px rgba(255,255,255,0.9)',
                        }} />
                      </div>

                      {/* Info */}
                      <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {/* Name + tier */}
                        <div>
                          <p style={{ fontFamily: 'system-ui', fontSize: '0.82rem', fontWeight: 700, color: '#0d221e', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {row.name}
                          </p>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{
                              fontFamily: 'system-ui', fontSize: '0.55rem', letterSpacing: '0.07em', textTransform: 'uppercase',
                              padding: '2px 7px', borderRadius: '999px',
                              background: row.tier === 'hero' ? 'linear-gradient(135deg,#856d47,#b09060)' : row.tier === 'featured' ? 'rgba(133,109,71,0.12)' : 'rgba(0,0,0,0.06)',
                              color: row.tier === 'hero' ? '#fff' : row.tier === 'featured' ? '#856d47' : '#888',
                            }}>{TIER_LABEL[row.tier] ?? row.tier}</span>
                            {row.category && <span style={{ fontFamily: 'system-ui', fontSize: '0.55rem', color: '#ccc' }}>{row.category}</span>}
                          </div>
                        </div>

                        {/* Big click count */}
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                          <span style={{ fontFamily: 'system-ui', fontSize: '1.6rem', fontWeight: 700, color: barColor, lineHeight: 1 }}>
                            {row.last30}
                          </span>
                          <span style={{ fontFamily: 'system-ui', fontSize: '0.6rem', color: '#bbb' }}>clicks/30d</span>
                          <span style={{ fontFamily: 'system-ui', fontSize: '0.72rem', fontWeight: 700, color: trendColor, marginLeft: '2px' }}>
                            {trendIcon}
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div style={{ height: '4px', borderRadius: '99px', background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: '99px', transition: 'width 0.5s ease' }} />
                        </div>

                        {/* Meta row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontFamily: 'system-ui', fontSize: '0.6rem', color: '#bbb' }}>
                            7d: <strong style={{ color: trendColor }}>{row.last7}</strong>
                          </span>
                          <span style={{ fontFamily: 'system-ui', fontSize: '0.6rem', color: '#ccc' }}>
                            total: {row.total}
                          </span>
                        </div>

                        {/* Upgrade badge */}
                        {isUpgradeOpp && (
                          <div style={{ background: 'rgba(176,125,62,0.08)', borderRadius: '6px', padding: '4px 8px', textAlign: 'center' }}>
                            <span style={{ fontFamily: 'system-ui', fontSize: '0.6rem', color: '#b07d3e', fontWeight: 700 }}>💡 Candidato a upgrade</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Upgrade insights */}
              {upgradeOpps.length > 0 && (
                <div style={{
                  background: 'rgba(176,125,62,0.06)', border: '1px solid rgba(176,125,62,0.25)',
                  borderRadius: '14px', padding: '16px 20px',
                }}>
                  <p style={{ fontFamily: 'system-ui', fontSize: '0.72rem', fontWeight: 700, color: '#856d47', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px' }}>
                    💡 Insights de venta
                  </p>
                  <p style={{ fontFamily: 'system-ui', fontSize: '0.8rem', color: '#6b5a3a', margin: '0 0 6px' }}>
                    <strong>{upgradeOpps.length} anuncio{upgradeOpps.length > 1 ? 's' : ''}</strong> en plan Gratuito están generando tráfico real.
                    Promoverlos a <strong>Destacado o Hero</strong> les da más visibilidad y a ti más ingresos recurrentes.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                    {upgradeOpps.map(c => (
                      <span key={c.slug} style={{
                        fontFamily: 'system-ui', fontSize: '0.72rem', fontWeight: 600,
                        background: '#fff', border: '1px solid rgba(133,109,71,0.3)',
                        color: '#856d47', padding: '4px 10px', borderRadius: '999px',
                      }}>
                        {c.name} · {c.last30} clicks/mes
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {clicks.length > 0 && upgradeOpps.length === 0 && (
                <p style={{ fontFamily: 'system-ui', fontSize: '0.75rem', color: '#aaa', textAlign: 'center', marginTop: '8px' }}>
                  Todos los anuncios con clicks significativos ya tienen plan de pago. ¡Bien!
                </p>
              )}
            </>
          )}
        </>
      )}

      {/* ══════════════════ EVENTOS ══════════════════ */}
      {section === 'eventos' && (
        <>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            {([['all', 'Todos'], ['active', 'Activos'], ['hidden', 'Ocultos']] as const).map(([val, label]) => (
              <button key={val} onClick={() => setEventsFilter(val)} style={{
                fontFamily: 'system-ui', fontSize: '0.72rem', padding: '6px 14px',
                borderRadius: '999px', cursor: 'pointer',
                border: eventsFilter === val ? 'none' : '1px solid rgba(0,0,0,0.12)',
                background: eventsFilter === val ? '#0d221e' : '#fff',
                color: eventsFilter === val ? '#fff' : '#555',
              }}>{label}</button>
            ))}
          </div>

          {/* ── Eventos estáticos (siempre visibles) ── */}
          {(() => {
            const todayStr = new Date().toISOString().slice(0, 10);
            const visibleStatic = staticEvents.filter(e =>
              eventsFilter === 'hidden' ? false   // hidden tab → no muestra estáticos (siempre están "activos")
              : eventsFilter === 'active' ? true
              : true                              // all tab → muestra todos
            );
            if (visibleStatic.length === 0) return null;
            return (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <p style={{ fontFamily: 'system-ui', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa', fontWeight: 600, margin: 0 }}>
                    Eventos del sitio (hardcodeados en código)
                  </p>
                  <span style={{ fontFamily: 'system-ui', fontSize: '0.58rem', background: 'rgba(0,0,0,0.06)', color: '#888', padding: '2px 8px', borderRadius: '999px' }}>
                    {visibleStatic.length} eventos · siempre activos en el directorio
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {visibleStatic.map(e => {
                    const isPast = e.endDate < todayStr;
                    return (
                      <div key={e.id} style={{
                        background: isPast ? '#fafaf8' : '#fff',
                        border: '1px solid rgba(0,0,0,0.07)',
                        borderLeft: '3px solid #e0d8cc',
                        borderRadius: '12px', padding: '12px 16px',
                        display: 'grid', gridTemplateColumns: '56px 1fr auto',
                        gap: '12px', alignItems: 'center',
                        opacity: isPast ? 0.5 : 1,
                      }}>
                        {/* Thumb */}
                        <div style={{ position: 'relative', width: 56, height: 48, borderRadius: 8, overflow: 'hidden', background: '#f0ede8', flexShrink: 0 }}>
                          <Image src={e.src} alt={e.alt} fill sizes="56px" style={{ objectFit: 'cover' }} />
                        </div>
                        {/* Info */}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                            <span style={{ fontFamily: 'system-ui', fontWeight: 600, fontSize: '0.88rem', color: '#0d221e' }}>{e.title}</span>
                            <span style={{ fontFamily: 'system-ui', fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#856d47', background: 'rgba(133,109,71,0.1)', padding: '2px 8px', borderRadius: 999 }}>
                              Estático
                            </span>
                            {isPast && <span style={{ fontFamily: 'system-ui', fontSize: '0.6rem', color: '#bbb', background: 'rgba(0,0,0,0.05)', padding: '2px 8px', borderRadius: 999 }}>Pasado</span>}
                            {e.tag && !isPast && <span style={{ fontFamily: 'system-ui', fontSize: '0.6rem', color: '#2a7a4f', background: 'rgba(42,122,79,0.08)', padding: '2px 8px', borderRadius: 999 }}>{e.tag}</span>}
                          </div>
                          <p style={{ fontFamily: 'system-ui', fontSize: '0.72rem', color: '#888', margin: 0 }}>
                            {EVENT_CATEGORY_LABEL[e.category] ?? e.category} · {e.startDate}{e.endDate !== e.startDate ? ` → ${e.endDate}` : ''}{e.time ? ` · ${e.time}` : ''} · {e.location}
                          </p>
                          {e.organizer && (
                            <p style={{ fontFamily: 'system-ui', fontSize: '0.7rem', color: '#aaa', margin: '2px 0 0' }}>{e.organizer}</p>
                          )}
                        </div>
                        {/* Note */}
                        <div style={{ textAlign: 'right', minWidth: '80px' }}>
                          <p style={{ fontFamily: 'system-ui', fontSize: '0.62rem', color: '#bbb', margin: 0 }}>
                            Editar en<br />
                            <code style={{ fontSize: '0.6rem', color: '#aaa' }}>events.ts</code>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ── Eventos de DB ── */}
          {eventsLoading ? (
            <p style={{ fontFamily: 'system-ui', fontSize: '0.85rem', color: '#888' }}>Cargando eventos de DB…</p>
          ) : (
            <>
            {filteredEvents.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <p style={{ fontFamily: 'system-ui', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa', fontWeight: 600, margin: 0 }}>
                  Eventos en base de datos
                </p>
                <span style={{ fontFamily: 'system-ui', fontSize: '0.58rem', background: 'rgba(13,34,30,0.07)', color: '#0d221e', padding: '2px 8px', borderRadius: '999px' }}>
                  {filteredEvents.length} · editables
                </span>
              </div>
            )}
            {filteredEvents.length === 0 ? (
              <div style={{ background: '#fafaf8', border: '1.5px dashed rgba(0,0,0,0.08)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                <p style={{ fontFamily: 'system-ui', fontSize: '0.82rem', color: '#bbb', margin: 0 }}>
                  No hay eventos en la base de datos con este filtro.
                </p>
                <p style={{ fontFamily: 'system-ui', fontSize: '0.72rem', color: '#ccc', marginTop: '6px' }}>
                  Crea uno nuevo en <code>/directorio/eventos/nuevo</code>
                </p>
              </div>
            ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredEvents.map(e => {
                const isPast     = e.end_date < today;
                const isUpdating = updatingEvent === e.id;
                const isEditing  = editingEvent === e.id;
                return (
                  <div key={e.id} style={{
                    background: '#fff', border: '1px solid rgba(0,0,0,0.08)',
                    borderRadius: '14px', overflow: 'hidden',
                    opacity: isUpdating ? 0.6 : isPast ? 0.55 : 1,
                  }}>
                    {/* Event row */}
                    <div style={{
                      padding: '14px 16px',
                      display: 'grid', gridTemplateColumns: '56px 1fr auto',
                      gap: '12px', alignItems: 'center',
                    }}>
                      {/* Thumb */}
                      <div style={{ position: 'relative', width: 56, height: 48, borderRadius: 8, overflow: 'hidden', background: '#f0ede8', flexShrink: 0 }}>
                        {e.photo_url
                          ? <Image src={e.photo_url} alt={e.title} fill sizes="56px" style={{ objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>📅</div>
                        }
                      </div>

                      {/* Info */}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                          <span style={{ fontFamily: 'system-ui', fontWeight: 600, fontSize: '0.88rem', color: '#0d221e' }}>{e.title}</span>
                          <span style={{
                            fontFamily: 'system-ui', fontSize: '0.6rem', letterSpacing: '0.08em',
                            textTransform: 'uppercase', color: EVENT_STATUS_COLOR[e.status] ?? '#888',
                            background: `${EVENT_STATUS_COLOR[e.status]}18`, padding: '2px 8px', borderRadius: 999,
                          }}>
                            {EVENT_STATUS_LABEL[e.status] ?? e.status}
                          </span>
                          {isPast && <span style={{ fontFamily: 'system-ui', fontSize: '0.6rem', color: '#bbb', background: 'rgba(0,0,0,0.05)', padding: '2px 8px', borderRadius: 999 }}>Pasado</span>}
                        </div>
                        <p style={{ fontFamily: 'system-ui', fontSize: '0.72rem', color: '#888', margin: 0 }}>
                          {EVENT_CAT_LABEL[e.category] ?? e.category} · {e.start_date}{e.end_date !== e.start_date ? ` → ${e.end_date}` : ''}{e.time_start ? ` · ${e.time_start}` : ''} · {e.location}
                        </p>
                        {e.organizer_name && (
                          <p style={{ fontFamily: 'system-ui', fontSize: '0.7rem', color: '#aaa', margin: '2px 0 0' }}>
                            {e.organizer_name}{e.organizer_phone ? ` · ${e.organizer_phone}` : ''}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                        <button
                          onClick={() => isEditing ? (setEditingEvent(null), setEditDraft({})) : startEdit(e)}
                          style={isEditing ? btnNeutral : btnEdit}
                        >
                          {isEditing ? 'Cancelar' : '✏ Editar'}
                        </button>
                        {e.status === 'active'
                          ? <button onClick={() => patchEvent(e.id, { status: 'hidden' })} disabled={isUpdating} style={btnDanger}>Ocultar</button>
                          : <button onClick={() => patchEvent(e.id, { status: 'active' })} disabled={isUpdating} style={btnSuccess}>Activar</button>
                        }
                      </div>
                    </div>

                    {/* Inline edit form */}
                    {isEditing && (
                      <div style={{ borderTop: '1px solid rgba(0,0,0,0.07)', padding: '16px', background: '#fafaf8' }}>
                        <p style={{ fontFamily: 'system-ui', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#856d47', fontWeight: 600, margin: '0 0 12px' }}>
                          Editar evento
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                          <Field label="Título">
                            <input value={editDraft.title ?? ''} onChange={ev => setEditDraft(d => ({ ...d, title: ev.target.value }))} style={inputStyle} />
                          </Field>
                          <Field label="Categoría">
                            <select value={editDraft.category ?? ''} onChange={ev => setEditDraft(d => ({ ...d, category: ev.target.value }))} style={inputStyle}>
                              {EVENT_CAT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          </Field>
                          <Field label="Fecha inicio">
                            <input type="date" value={editDraft.start_date ?? ''} onChange={ev => setEditDraft(d => ({ ...d, start_date: ev.target.value }))} style={inputStyle} />
                          </Field>
                          <Field label="Fecha fin">
                            <input type="date" value={editDraft.end_date ?? ''} onChange={ev => setEditDraft(d => ({ ...d, end_date: ev.target.value }))} style={inputStyle} />
                          </Field>
                          <Field label="Hora (opcional)">
                            <input type="time" value={editDraft.time_start ?? ''} onChange={ev => setEditDraft(d => ({ ...d, time_start: ev.target.value }))} style={inputStyle} />
                          </Field>
                          <Field label="Precio">
                            <input value={editDraft.price ?? ''} onChange={ev => setEditDraft(d => ({ ...d, price: ev.target.value }))} style={inputStyle} placeholder="Ej: Entrada libre" />
                          </Field>
                          <Field label="Organizador">
                            <input value={editDraft.organizer_name ?? ''} onChange={ev => setEditDraft(d => ({ ...d, organizer_name: ev.target.value }))} style={inputStyle} />
                          </Field>
                          <Field label="Teléfono organizador">
                            <input value={editDraft.organizer_phone ?? ''} onChange={ev => setEditDraft(d => ({ ...d, organizer_phone: ev.target.value }))} style={inputStyle} placeholder="+52 81..." />
                          </Field>
                          <Field label="URL foto (opcional)">
                            <input value={editDraft.photo_url ?? ''} onChange={ev => setEditDraft(d => ({ ...d, photo_url: ev.target.value }))} style={inputStyle} placeholder="https://..." />
                          </Field>
                        </div>
                        {/* Location full width */}
                        <div style={{ marginBottom: '10px' }}>
                          <Field label="Lugar / Dirección">
                            <input value={editDraft.location ?? ''} onChange={ev => setEditDraft(d => ({ ...d, location: ev.target.value }))} style={{ ...inputStyle, width: '100%' }} />
                          </Field>
                        </div>
                        {/* Description full width */}
                        <div style={{ marginBottom: '14px' }}>
                          <Field label="Descripción corta">
                            <textarea
                              value={editDraft.short_desc ?? ''}
                              onChange={ev => setEditDraft(d => ({ ...d, short_desc: ev.target.value }))}
                              rows={3}
                              style={{ ...inputStyle, width: '100%', resize: 'vertical' }}
                            />
                          </Field>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button onClick={() => { setEditingEvent(null); setEditDraft({}); }} style={btnNeutral}>
                            Cancelar
                          </button>
                          <button onClick={saveEdit} disabled={savingEdit} style={{
                            fontFamily: 'system-ui', fontSize: '0.78rem', padding: '7px 18px',
                            borderRadius: '8px', border: 'none',
                            background: savingEdit ? '#ccc' : '#0d221e', color: '#fff',
                            cursor: savingEdit ? 'not-allowed' : 'pointer', fontWeight: 600,
                          }}>
                            {savingEdit ? 'Guardando…' : '✓ Guardar cambios'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            )}
          </>
        )}
      </>
      )}

      {/* ══════════════════ ANUNCIOS ══════════════════ */}
      {section === 'anuncios' && (
        <>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            {filterTabs.map(({ id, label, count }) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                style={{
                  fontFamily: 'system-ui', fontSize: '0.72rem', letterSpacing: '0.04em',
                  padding: '6px 14px', borderRadius: '999px', cursor: 'pointer',
                  border: filter === id ? 'none' : '1px solid rgba(0,0,0,0.12)',
                  background: filter === id ? '#0d221e' : '#fff',
                  color: filter === id ? '#fff' : '#555',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  transition: 'all 0.2s',
                }}
              >
                {label}
                <span style={{
                  background: filter === id ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.07)',
                  color: filter === id ? '#fff' : '#888',
                  borderRadius: '999px', fontSize: '0.65rem', padding: '1px 6px',
                }}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          {loading ? (
            <p style={{ fontFamily: 'system-ui', fontSize: '0.85rem', color: '#888' }}>Cargando…</p>
          ) : (
            <>
              {filtered.length === 0 ? (
                <div style={{ background: '#fff', border: '1.5px dashed rgba(0,0,0,0.1)', borderRadius: '14px', padding: '3rem', textAlign: 'center' }}>
                  <p style={{ fontFamily: 'system-ui', fontSize: '0.9rem', color: '#aaa' }}>No hay anuncios en esta categoría.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
                  {filtered.map(l => {
                    const tierStyle = TIER_COLOR[l.tier] ?? TIER_COLOR.free;
                    const isUpd = updating?.startsWith(l.id);
                    return (
                      <div key={l.id} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '16px', overflow: 'hidden', opacity: isUpd ? 0.7 : 1, transition: 'opacity 0.2s', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ position: 'relative', aspectRatio: '16/9', background: '#f0ede8' }}>
                          {l.src ? (
                            <Image src={l.src} alt={l.name} fill sizes="320px" style={{ objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="1.5">
                                <rect x="3" y="3" width="18" height="18" rx="2"/>
                                <circle cx="8.5" cy="8.5" r="1.5"/>
                                <polyline points="21 15 16 10 5 21"/>
                              </svg>
                            </div>
                          )}
                          <div style={{ position: 'absolute', top: '8px', left: '8px', background: tierStyle.bg, color: tierStyle.text, fontFamily: 'system-ui', fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: '999px', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)' }}>
                            {TIER_LABEL[l.tier] ?? l.tier}
                          </div>
                          <div style={{ position: 'absolute', top: '8px', right: '8px', width: '8px', height: '8px', borderRadius: '50%', background: STATUS_COLOR[l.status] ?? '#ccc', boxShadow: '0 0 0 2px rgba(255,255,255,0.8)' }} />
                          {l.tier === 'hero' && l.src && (
                            <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(13,34,30,0.75)', backdropFilter: 'blur(8px)', borderRadius: '6px', padding: '3px 8px', fontFamily: 'system-ui', fontSize: '0.55rem', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.85)' }}>
                              ▶ Slideshow
                            </div>
                          )}
                          {/* Ajustar foto — overlay button */}
                          {l.src && (
                            <button
                              onClick={() => {
                                if (focalPickerId === l.id) { setFocalPickerId(null); return; }
                                setFocalPickerId(l.id);
                                setFocalPickerValue(l.img_focus ?? '50% 50%');
                              }}
                              style={{ position: 'absolute', bottom: '8px', left: '8px', fontFamily: 'system-ui', fontSize: '0.58rem', letterSpacing: '0.05em', padding: '3px 9px', borderRadius: '6px', border: 'none', background: focalPickerId === l.id ? 'rgba(133,109,71,0.95)' : 'rgba(0,0,0,0.52)', backdropFilter: 'blur(8px)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              {focalPickerId === l.id ? 'Cerrar' : l.img_focus ? 'Encuadre ✓' : 'Ajustar foto'}
                            </button>
                          )}
                        </div>

                        <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div>
                            <p style={{ fontFamily: 'system-ui', fontWeight: 600, fontSize: '0.88rem', color: '#0d221e', marginBottom: '2px' }}>{l.name}</p>
                            <p style={{ fontFamily: 'system-ui', fontSize: '0.72rem', color: '#aaa' }}>{l.category} · {l.guia_profiles?.email ?? 'sin email'}</p>
                            {l.short_desc && <p style={{ fontFamily: 'system-ui', fontSize: '0.72rem', color: '#888', marginTop: '4px', lineHeight: 1.4 }}>{l.short_desc.slice(0, 70)}…</p>}
                          </div>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '100px' }}>
                              <p style={{ fontFamily: 'system-ui', fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#bbb', marginBottom: '4px' }}>Plan</p>
                              <select value={l.tier} disabled={!!isUpd} onChange={e => patch(l.id, 'tier', e.target.value)} style={{ width: '100%', fontFamily: 'system-ui', fontSize: '0.78rem', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.12)', cursor: 'pointer', background: '#fafafa', color: '#0d221e' }}>
                                {TIER_OPTIONS.map(t => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}
                              </select>
                            </div>
                            <div style={{ flex: 1, minWidth: '100px' }}>
                              <p style={{ fontFamily: 'system-ui', fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#bbb', marginBottom: '4px' }}>Estado</p>
                              <select value={l.status} disabled={!!isUpd} onChange={e => patch(l.id, 'status', e.target.value)} style={{ width: '100%', fontFamily: 'system-ui', fontSize: '0.78rem', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.12)', cursor: 'pointer', background: '#fafafa', color: STATUS_COLOR[l.status] ?? '#888' }}>
                                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                              </select>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {l.tier !== 'hero' && <button onClick={() => patch(l.id, 'tier', 'hero')} disabled={!!isUpd} style={btnGold}>★ Promover a Hero</button>}
                            {l.status !== 'active' && <button onClick={() => patch(l.id, 'status', 'active')} disabled={!!isUpd} style={btnSuccess}>✓ Activar</button>}
                            {l.status === 'active' && <button onClick={() => patch(l.id, 'status', 'suspended')} disabled={!!isUpd} style={btnDanger}>Suspender</button>}
                          </div>

                          {/* Map location button */}
                          <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={l.lat && l.lng ? '#2a7a4f' : '#bbb'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                                <circle cx="12" cy="10" r="3"/>
                              </svg>
                              <span style={{ fontFamily: 'system-ui', fontSize: '0.65rem', color: l.lat && l.lng ? '#2a7a4f' : '#bbb' }}>
                                {l.lat && l.lng ? `${l.lat.toFixed(4)}, ${l.lng.toFixed(4)}` : 'Sin ubicación en mapa'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {l.lat && l.lng && (
                                <button onClick={() => clearCoord(l.id)} style={{ ...btnNeutral, fontSize: '0.6rem', padding: '4px 9px', color: '#b0392a', borderColor: 'rgba(176,57,42,0.2)' }}>
                                  Quitar
                                </button>
                              )}
                              <button
                                onClick={() => mapPickerId === l.id ? setMapPickerId(null) : openMapPicker(l)}
                                style={{
                                  fontFamily: 'system-ui', fontSize: '0.65rem', padding: '5px 12px',
                                  borderRadius: '8px', cursor: 'pointer',
                                  border: mapPickerId === l.id ? 'none' : '1px solid rgba(13,34,30,0.2)',
                                  background: mapPickerId === l.id ? '#0d221e' : 'rgba(13,34,30,0.05)',
                                  color: mapPickerId === l.id ? '#fff' : '#0d221e',
                                }}
                              >
                                {mapPickerId === l.id ? 'Cerrar mapa' : l.lat && l.lng ? 'Editar ubicación' : 'Fijar en mapa'}
                              </button>
                            </div>
                          </div>

                          {/* Email anunciante */}
                          <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                            <span style={{ fontFamily: 'system-ui', fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#bbb' }}>Email</span>
                            <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap' }}>
                              {emailResult[l.id] && (
                                <span style={{ fontFamily: 'system-ui', fontSize: '0.65rem', color: emailResult[l.id].startsWith('✓') ? '#2a7a4f' : '#b0392a' }}>
                                  {emailResult[l.id]}
                                </span>
                              )}
                              {(['foto', 'mapa', 'completar'] as const).map(type => (
                                <button
                                  key={type}
                                  onClick={() => sendEmail(l.id, type)}
                                  disabled={sendingEmail === l.id + type}
                                  style={{ fontFamily: 'system-ui', fontSize: '0.6rem', padding: '4px 9px', borderRadius: '6px', cursor: 'pointer', border: '1px solid rgba(0,0,0,0.12)', background: '#fafafa', color: '#555', whiteSpace: 'nowrap' }}
                                >
                                  {sendingEmail === l.id + type ? '…' : type === 'foto' ? '📸 Foto' : type === 'mapa' ? '📍 Mapa' : '✨ Completar'}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Inline photo positioner */}
                          {focalPickerId === l.id && l.src && (
                            <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '10px' }}>
                              <PhotoPositioner
                                src={l.src}
                                initialValue={focalPickerValue}
                                onSave={v => saveFocalPoint(l.id, v)}
                                onCancel={() => setFocalPickerId(null)}
                              />
                              {l.img_focus && (
                                <button onClick={() => saveFocalPoint(l.id, '')} style={{ ...btnNeutral, fontSize: '0.58rem', marginTop: '6px', color: '#b0392a', borderColor: 'rgba(176,57,42,0.18)' }}>
                                  Restablecer original
                                </button>
                              )}
                            </div>
                          )}

                          {/* Inline map picker */}
                          {mapPickerId === l.id && (
                            <div style={{ marginTop: '10px' }}>
                              <MapaLocationPicker
                                value={mapPickerCoord}
                                onChange={(loc) => setMapPickerCoord(loc.lat === 0 ? null : loc)}
                                height={240}
                                label="Toca para fijar la ubicación del negocio"
                              />
                              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', justifyContent: 'flex-end' }}>
                                <button onClick={() => setMapPickerId(null)} style={btnNeutral}>Cancelar</button>
                                <button
                                  onClick={() => saveCoord(l.id)}
                                  disabled={savingCoord || !mapPickerCoord || mapPickerCoord.lat === 0}
                                  style={{
                                    fontFamily: 'system-ui', fontSize: '0.78rem', padding: '7px 18px',
                                    borderRadius: '8px', border: 'none',
                                    background: (!mapPickerCoord || mapPickerCoord.lat === 0 || savingCoord) ? '#ccc' : '#0d221e',
                                    color: '#fff', cursor: (!mapPickerCoord || savingCoord) ? 'not-allowed' : 'pointer', fontWeight: 600,
                                  }}
                                >
                                  {savingCoord ? 'Guardando…' : '✓ Guardar ubicación'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Static listings reference */}
              <div style={{ borderTop: '1px solid rgba(0,0,0,0.07)', paddingTop: '1.75rem' }}>
                <p style={{ fontFamily: 'system-ui', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#aaa', marginBottom: '4px' }}>
                  Contenido curado (estático)
                </p>
                <p style={{ fontFamily: 'system-ui', fontSize: '0.78rem', color: '#bbb', marginBottom: '1rem' }}>
                  Estos listings están en el código y siempre aparecen en el directorio.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))', gap: '0.75rem' }}>
                  {staticListings.map(l => (
                    <div key={l.slug} style={{ background: '#fafafa', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', overflow: 'hidden', opacity: 0.75, display: 'flex', alignItems: 'center', gap: '12px', padding: '10px' }}>
                      <div style={{ position: 'relative', width: '56px', height: '48px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: '#eee' }}>
                        <Image src={l.src} alt={l.name} fill sizes="56px" style={{ objectFit: 'cover' }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontFamily: 'system-ui', fontSize: '0.82rem', fontWeight: 500, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</p>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'system-ui', fontSize: '0.58rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#aaa', background: 'rgba(0,0,0,0.04)', padding: '2px 7px', borderRadius: '999px' }}>{l.tier}</span>
                          <span style={{ fontFamily: 'system-ui', fontSize: '0.58rem', color: '#ccc' }}>Estático</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ══════════════════ CORREOS ══════════════════ */}
      {section === 'correos' && (
        <AdminEmailComposer listings={listings} />
      )}
    </>
  );
}

// ── Shared button styles ───────────────────────────────────────────────────

const btnSuccess: React.CSSProperties = {
  fontFamily: 'system-ui', fontSize: '0.65rem', padding: '5px 12px',
  borderRadius: '8px', border: '1px solid rgba(42,122,79,0.3)',
  background: 'rgba(42,122,79,0.07)', color: '#2a7a4f', cursor: 'pointer',
};
const btnDanger: React.CSSProperties = {
  fontFamily: 'system-ui', fontSize: '0.65rem', padding: '5px 12px',
  borderRadius: '8px', border: '1px solid rgba(176,57,42,0.25)',
  background: 'rgba(176,57,42,0.06)', color: '#b0392a', cursor: 'pointer',
};
const btnGold: React.CSSProperties = {
  fontFamily: 'system-ui', fontSize: '0.65rem', padding: '5px 10px',
  borderRadius: '8px', border: '1px solid rgba(133,109,71,0.3)',
  background: 'rgba(133,109,71,0.07)', color: '#856d47', cursor: 'pointer',
};
const btnEdit: React.CSSProperties = {
  fontFamily: 'system-ui', fontSize: '0.65rem', padding: '5px 12px',
  borderRadius: '8px', border: '1px solid rgba(13,34,30,0.2)',
  background: 'rgba(13,34,30,0.05)', color: '#0d221e', cursor: 'pointer',
};
const btnNeutral: React.CSSProperties = {
  fontFamily: 'system-ui', fontSize: '0.65rem', padding: '5px 12px',
  borderRadius: '8px', border: '1px solid rgba(0,0,0,0.12)',
  background: '#fff', color: '#888', cursor: 'pointer',
};

const inputStyle: React.CSSProperties = {
  width: '100%', fontFamily: 'system-ui', fontSize: '0.8rem',
  padding: '7px 10px', borderRadius: '8px',
  border: '1px solid rgba(0,0,0,0.15)', background: '#fff', color: '#0d221e',
  boxSizing: 'border-box',
};

// ── KPI card helpers ───────────────────────────────────────────────────────

const kpiCard = (color: string): React.CSSProperties => ({
  background: '#fff',
  border: `1px solid rgba(0,0,0,0.07)`,
  borderLeft: `3px solid ${color}`,
  borderRadius: '12px', padding: '14px 16px',
});
const kpiLabel: React.CSSProperties = {
  fontFamily: 'system-ui', fontSize: '0.62rem', letterSpacing: '0.1em',
  textTransform: 'uppercase', color: '#aaa', margin: '0 0 4px',
};
const kpiValue = (color: string): React.CSSProperties => ({
  fontFamily: 'system-ui', fontSize: '1.5rem', fontWeight: 700,
  color, margin: '0 0 2px', lineHeight: 1,
});
const kpiSub: React.CSSProperties = {
  fontFamily: 'system-ui', fontSize: '0.68rem', color: '#bbb', margin: 0,
};

// ── Field wrapper ──────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontFamily: 'system-ui', fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#bbb', margin: '0 0 4px' }}>{label}</p>
      {children}
    </div>
  );
}
