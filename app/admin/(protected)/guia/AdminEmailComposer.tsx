'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import BlockEditor from './email/BlockEditor';
import ContactsManager from './contacts/ContactsManager';
import { renderEmailHtml } from './email/BlockHtmlRenderer';
import type { EmailBlock, EmailState, DesignOptions } from './email/types';
import {
  DEFAULT_DESIGN,
  makeHeader, makeText, makeButton, makeDivider,
  makeImage, makeCallout,
} from './email/types';

/* ─────────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────────── */
interface DbListing {
  id: string;
  name: string;
  tier: string;
  status: string;
  category: string;
  src: string | null;
  lat: number | null;
  lng: number | null;
  guia_profiles?: { email: string };
}

type Segment = 'all' | 'no_foto' | 'no_mapa' | 'free' | 'featured' | 'hero' | 'custom';
type ComposerTab = 'composer' | 'contacts';

/* ─────────────────────────────────────────────────────────────
   Built-in templates → block arrays
   ───────────────────────────────────────────────────────────── */
const TEMPLATE_BLOCKS: Record<string, EmailBlock[]> = {
  foto: [
    { ...makeHeader(), title: 'Una buena foto puede triplicar las visitas', subtitle: '', bgColor: '#0d221e', textColor: '#faf8f4', showBadge: true, align: 'center' },
    { ...makeText(), html: '<p>Notamos que tu negocio todavía no tiene foto en el directorio. Los anuncios con imagen reciben en promedio <strong>3 veces más clics</strong> que los que solo tienen texto.</p><p>No necesitas una foto perfecta — una imagen clara de tu local, tu producto o tu equipo ya hace una gran diferencia para que los turistas en Santiago te encuentren y confíen en ti.</p>' },
    { ...makeButton(), text: 'Agregar mi foto →', url: 'https://hotelelencino.com/mi-negocio', bgColor: '#856d47', radius: 'pill', align: 'center' },
    { ...makeDivider(), style: 'solid', color: '#e8e6e0', widthPct: 70 },
  ],
  mapa: [
    { ...makeHeader(), title: 'Los turistas preguntan "¿dónde queda?" — ponles el pin', subtitle: 'El directorio ya tiene mapa interactivo', bgColor: '#0d221e', textColor: '#faf8f4', showBadge: true, align: 'center' },
    { ...makeText(), html: '<p>El directorio de Santiago ahora tiene mapa interactivo. Los visitantes que hospedan en el hotel buscan en el mapa qué hay cerca — y tu negocio todavía no aparece ahí.</p><p>Fijar tu ubicación tarda menos de 30 segundos: entra a tu panel, toca el mapa, coloca tu pin y guarda.</p>' },
    { ...makeButton(), text: 'Fijar mi ubicación →', url: 'https://hotelelencino.com/mi-negocio', bgColor: '#2a7a4f', radius: 'pill', align: 'center' },
  ],
  completar: [
    { ...makeHeader(), title: 'Unos pequeños detalles pueden cambiar todo', subtitle: '', bgColor: '#0d221e', textColor: '#faf8f4', showBadge: true, align: 'center' },
    { ...makeCallout(), html: '<p>Tu anuncio ya está publicado — genial. Ahora solo faltan algunos datos para que aparezca mejor posicionado.</p>', bgColor: 'rgba(42,122,79,0.07)', borderColor: '#2a7a4f' },
    { ...makeText(), html: '<p>Agregar WhatsApp, horarios, dirección y una foto puede <strong>duplicar los clics</strong> en tu anuncio.</p>' },
    { ...makeButton(), text: 'Mejorar mi anuncio →', url: 'https://hotelelencino.com/mi-negocio', bgColor: '#856d47', radius: 'pill', align: 'center' },
  ],
  destacado: [
    { ...makeHeader(), title: '¿Quieres aparecer primero en el directorio de Santiago?', subtitle: 'Plan Destacado — $200 MXN / mes', bgColor: '#856d47', textColor: '#fff', showBadge: false, align: 'center' },
    { ...makeText(), html: '<p>El plan <strong>Destacado</strong> te da posición preferencial en la cuadrícula, badge visible, hasta 3 fotos, y tus redes sociales en el anuncio.</p>' },
    { ...makeCallout(), html: '<p><strong>Plan Hero</strong> — incluye sesión de fotos y video profesional del hotel para que tengas contenido curado listo para tus redes sociales.</p>', bgColor: 'rgba(133,109,71,0.08)', borderColor: '#856d47' },
    { ...makeButton(), text: 'Quiero el plan Destacado →', url: 'https://wa.me/528123816588?text=Hola%2C%20quiero%20contratar%20el%20plan%20Destacado', bgColor: '#0d221e', radius: 'pill', align: 'center' },
  ],
  semanal: [
    { ...makeHeader(), title: '¡Tu negocio ya está frente a los turistas de Santiago!', subtitle: 'Directorio Santiago · Resumen de actividad', bgColor: '#0d221e', textColor: '#faf8f4', showBadge: true, align: 'center' },
    { ...makeCallout(), html: '<p>Cada semana más visitantes llegan al directorio buscando qué hacer, dónde comer y a quién contratar en Santiago. Tu anuncio ya está ahí — y la visibilidad sigue creciendo.</p>', bgColor: 'rgba(42,122,79,0.07)', borderColor: '#2a7a4f' },
    { ...makeText(), html: '<p>Para aprovechar al máximo el tráfico que llega:</p><ul><li>Agrega una <strong>foto de portada</strong> si todavía no tienes — los anuncios con imagen reciben 3× más clics</li><li>Fija tu <strong>ubicación en el mapa</strong> para que los turistas te encuentren fácilmente</li><li>Completa tu <strong>WhatsApp y horarios</strong> para que puedan contactarte de inmediato</li></ul>' },
    { ...makeButton(), text: 'Revisar mi anuncio →', url: 'https://hotelelencino.com/mi-negocio', bgColor: '#856d47', radius: 'pill', align: 'center' },
    { ...makeDivider(), style: 'solid', color: '#e8e6e0', widthPct: 70 },
    { ...makeText(), html: '<p style="font-size:0.85em;color:#888">Pronto recibirás tu resumen personal de visitas. Mientras tanto, mantén tu perfil actualizado para sacarle todo el jugo al directorio.</p>' },
  ],
  personalizado: [
    { ...makeHeader(), title: 'Escribe tu título aquí', subtitle: '', bgColor: '#0d221e', textColor: '#faf8f4', showBadge: true, align: 'center' },
    { ...makeText(), html: '<p>Comienza a escribir tu mensaje aquí…</p>' },
  ],
};

const TEMPLATE_META = [
  { id: 'semanal',       emoji: '📊', label: 'Resumen',     desc: 'Actividad semanal del directorio', accent: '#2a7a4f' },
  { id: 'foto',          emoji: '📸', label: 'Sin foto',    desc: 'Anunciantes sin imagen',           accent: '#c8a05a' },
  { id: 'mapa',          emoji: '📍', label: 'Sin mapa',    desc: 'Sin ubicación fijada',             accent: '#2a7a4f' },
  { id: 'completar',     emoji: '✨', label: 'Completar',   desc: 'Perfil incompleto',                accent: '#5b7fb5' },
  { id: 'destacado',     emoji: '⭐', label: 'Destacado',   desc: 'Invita al plan $200/mes',          accent: '#856d47' },
  { id: 'personalizado', emoji: '✏️', label: 'Libre',       desc: 'Diseña desde cero',                accent: '#888' },
];

const DEFAULT_LAT = 25.4219;
const DEFAULT_LNG = -100.1573;
function hasRealCoords(lat: number | null, lng: number | null) {
  if (!lat || !lng) return false;
  return !(Math.abs(lat - DEFAULT_LAT) < 0.001 && Math.abs(lng - DEFAULT_LNG) < 0.001);
}

/* ─────────────────────────────────────────────────────────────
   Color swatch
   ───────────────────────────────────────────────────────────── */
function Swatch({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span style={lbl}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          style={{ width: '34px', height: '34px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: '7px', cursor: 'pointer', padding: '2px' }} />
        <input value={value} onChange={e => onChange(e.target.value)}
          style={{ ...inp, width: '86px', fontFamily: 'monospace', fontSize: '0.72rem', padding: '6px 8px' }} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Mini template card
   ───────────────────────────────────────────────────────────── */
function TemplateCard({ id, emoji, label, desc, accent, selected, onClick }: {
  id: string; emoji: string; label: string; desc: string; accent: string; selected: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: 'none', background: 'transparent', padding: 0 }}>
      <div style={{
        border: selected ? '2px solid #0d221e' : '2px solid rgba(0,0,0,0.08)',
        borderRadius: '12px', overflow: 'hidden',
        boxShadow: selected ? '0 0 0 3px rgba(13,34,30,0.1)' : 'none',
        transition: 'all 0.15s',
      }}>
        <div style={{ background: '#0d221e', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '1.1rem' }}>{emoji}</span>
        </div>
        <div style={{ background: '#fff', padding: '8px 10px' }}>
          <div style={{ width: '80%', height: '4px', borderRadius: '3px', background: 'rgba(0,0,0,0.08)', marginBottom: '4px' }} />
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '50%', height: '12px', borderRadius: '999px', background: accent }} />
          </div>
        </div>
        <div style={{ background: selected ? '#0d221e' : '#fafafa', borderTop: '1px solid rgba(0,0,0,0.06)', padding: '7px 10px' }}>
          <p style={{ fontFamily: 'system-ui', fontSize: '0.68rem', fontWeight: 700, color: selected ? '#fff' : '#1a1a1a', margin: '0 0 1px' }}>
            {label}
          </p>
          <p style={{ fontFamily: 'system-ui', fontSize: '0.58rem', color: selected ? 'rgba(255,255,255,0.55)' : '#999', margin: 0, lineHeight: 1.3 }}>
            {desc}
          </p>
        </div>
      </div>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main component
   ───────────────────────────────────────────────────────────── */
export default function AdminEmailComposer({ listings }: { listings: DbListing[] }) {
  const [composerTab, setComposerTab] = useState<ComposerTab>('composer');
  const [templateId, setTemplateId]   = useState('foto');
  const [subject, setSubject]         = useState('📸 Tu negocio merece una gran foto');
  const [preheader, setPreheader]     = useState('Los anuncios con foto reciben 3× más clics');
  const [design, setDesign]           = useState<DesignOptions>(DEFAULT_DESIGN);
  const [blocks, setBlocks]           = useState<EmailBlock[]>(() => TEMPLATE_BLOCKS.foto);
  const [activeTab, setActiveTab]     = useState<'bloques' | 'diseño' | 'envío'>('bloques');
  const [segment, setSegment]         = useState<Segment>('all');
  const [customEmails, setCustom]     = useState('');
  const [previewData, setPreviewData] = useState<{ count: number; recipients: string[] } | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [sending, setSending]         = useState(false);
  const [loadingPrev, setLoadingPrev] = useState(false);
  const [result, setResult]           = useState<{ ok: boolean; msg: string } | null>(null);

  // Re-generate HTML on every block or design change
  const emailState: EmailState = { subject, preheader, design, blocks };
  const htmlPreview = useMemo(() => renderEmailHtml(emailState), [subject, preheader, design, blocks]);

  const setDesignField = useCallback(<K extends keyof DesignOptions>(k: K, v: DesignOptions[K]) => {
    setDesign(d => ({ ...d, [k]: v }));
    setPreviewData(null);
  }, []);

  const handleTemplateSelect = (id: string) => {
    setTemplateId(id);
    setBlocks(TEMPLATE_BLOCKS[id] ?? TEMPLATE_BLOCKS.personalizado);
    const meta = TEMPLATE_META.find(t => t.id === id);
    if (meta && id !== 'personalizado') {
      setSubject({ semanal: '📊 Tu negocio ya está frente a los turistas de Santiago', foto: '📸 Tu negocio merece una gran foto', mapa: '📍 Ya puedes fijar tu negocio en el mapa', completar: '✨ Mejora tu anuncio y llega a más personas', destacado: '⭐ Destaca tu negocio en el directorio por $200/mes' }[id] ?? '');
      setPreheader({ semanal: 'El directorio sigue creciendo — y tu anuncio ya está ahí.', foto: 'Los anuncios con foto reciben 3× más clics — y agregar la tuya tarda 1 minuto.', mapa: 'El directorio de Santiago ahora tiene mapa interactivo — ponles el pin a tus clientes.', completar: 'Unos pequeños detalles pueden duplicar los clics en tu negocio.', destacado: 'Posición preferencial, badge visible, hasta 3 fotos y más — todo en $200 MXN al mes.' }[id] ?? '');
    }
    setPreviewData(null);
    setResult(null);
  };

  // Server-side counts (cross-referenced with Auth users — accurate)
  type ServerCounts = { all: number; no_foto: number; no_mapa: number; free: number; featured: number; hero: number };
  const [serverCounts, setServerCounts] = useState<ServerCounts | null>(null);

  useEffect(() => {
    fetch('/api/admin/comunicaciones')
      .then(r => r.json())
      .then((d: { counts: ServerCounts }) => setServerCounts(d.counts))
      .catch(() => { /* fall back to client counts */ });
  }, []);

  // Client-side fallback counts (listings without auth cross-check)
  const clientCounts = useMemo(() => ({
    noFoto:   listings.filter(l => !l.src).length,
    noMapa:   listings.filter(l => !hasRealCoords(l.lat, l.lng)).length,
    free:     listings.filter(l => l.tier === 'free').length,
    featured: listings.filter(l => l.tier === 'featured').length,
    hero:     listings.filter(l => l.tier === 'hero').length,
  }), [listings]);

  const c = serverCounts ?? {
    all: listings.length,
    no_foto: clientCounts.noFoto, no_mapa: clientCounts.noMapa,
    free: clientCounts.free, featured: clientCounts.featured, hero: clientCounts.hero,
  };

  const SEGMENTS = [
    { id: 'all'      as Segment, label: 'Todos los registrados',  count: c.all },
    { id: 'no_foto'  as Segment, label: 'Sin foto de portada',    count: c.no_foto },
    { id: 'no_mapa'  as Segment, label: 'Sin ubicación en mapa',  count: c.no_mapa },
    { id: 'free'     as Segment, label: 'Plan Gratuito',          count: c.free },
    { id: 'featured' as Segment, label: 'Plan Destacado',         count: c.featured },
    { id: 'hero'     as Segment, label: 'Plan Hero',              count: c.hero },
    { id: 'custom'   as Segment, label: 'Emails específicos' },
  ];

  const customCount = customEmails.split('\n').filter(e => e.includes('@')).length;

  const loadPreview = async () => {
    if (!subject.trim()) { alert('Escribe un asunto primero'); return; }
    setLoadingPrev(true);
    const res = await fetch('/api/admin/comunicaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ segment, customEmails: customEmails.split('\n').filter(Boolean), subject, html: htmlPreview, preview: true }),
    });
    const data = await res.json();
    setPreviewData(data);
    setLoadingPrev(false);
  };

  const handleSend = async () => {
    if (!subject.trim()) { alert('El asunto es requerido'); return; }
    if (blocks.length === 0) { alert('El email no tiene contenido'); return; }
    if (!previewData) { await loadPreview(); return; }
    if (!confirm(`¿Enviar "${subject}" a ${previewData.count} persona${previewData.count !== 1 ? 's' : ''}?`)) return;
    setSending(true);
    setResult(null);
    const res = await fetch('/api/admin/comunicaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ segment, customEmails: customEmails.split('\n').filter(Boolean), subject, html: htmlPreview, preview: false }),
    });
    const data = await res.json();
    setResult(data.ok
      ? { ok: true,  msg: `✓ Enviado a ${data.sent} de ${data.total} personas` }
      : { ok: false, msg: `✗ Error: ${data.error}` });
    setSending(false);
    setPreviewData(null);
  };

  // Advertisers for ContactsManager
  const advertisersForContacts = listings.map(l => ({
    id: l.id, name: l.name, tier: l.tier, status: l.status, category: l.category,
    email: l.guia_profiles?.email,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Top-level tabs: Composer | Contacts ──────────────── */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {([['composer', '✉️ Composer'], ['contacts', '👥 Contactos']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setComposerTab(id)} style={{
            fontFamily: 'system-ui', fontSize: '0.82rem', fontWeight: composerTab === id ? 700 : 400,
            padding: '8px 20px', borderRadius: '999px', cursor: 'pointer',
            border: composerTab === id ? 'none' : '1px solid rgba(0,0,0,0.12)',
            background: composerTab === id ? '#0d221e' : '#fff',
            color: composerTab === id ? '#fff' : '#555',
          }}>{label}</button>
        ))}
      </div>

      {/* ── Contacts ─────────────────────────────────────────── */}
      {composerTab === 'contacts' && <ContactsManager advertisers={advertisersForContacts} />}

      {/* ── Composer ─────────────────────────────────────────── */}
      {composerTab === 'composer' && (
        <>
          {/* 1. Template gallery */}
          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ background: '#0d221e', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <p style={sectionHead}>Plantillas</p>
              <p style={{ fontFamily: 'system-ui', fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                — selecciona una base, luego edita libremente
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', padding: '14px' }}>
              {TEMPLATE_META.map(t => (
                <TemplateCard key={t.id} {...t} selected={templateId === t.id} onClick={() => handleTemplateSelect(t.id)} />
              ))}
            </div>
          </div>

          {/* 2. Asunto + preheader */}
          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '14px', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={sectionHead}>Metadatos del correo</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={lbl}>Asunto *</label>
                <input value={subject} onChange={e => { setSubject(e.target.value); setPreviewData(null); }} style={inp} placeholder="Asunto que verán en inbox" />
              </div>
              <div>
                <label style={lbl}>Preheader <span style={{ fontWeight: 400, color: '#ccc' }}>(texto tras el asunto en inbox)</span></label>
                <input value={preheader} onChange={e => { setPreheader(e.target.value); setPreviewData(null); }} style={inp} placeholder="Frase de apoyo…" />
              </div>
            </div>
          </div>

          {/* 3. Editor + Preview side-by-side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>

            {/* LEFT — Editor */}
            <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '16px', overflow: 'hidden' }}>
              {/* Editor tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                {(['bloques', 'diseño', 'envío'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{
                    flex: 1, padding: '11px 8px', border: 'none', cursor: 'pointer',
                    fontFamily: 'system-ui', fontSize: '0.72rem', fontWeight: activeTab === tab ? 700 : 400,
                    background: activeTab === tab ? '#fafafa' : '#fff',
                    color: activeTab === tab ? '#0d221e' : '#999',
                    borderBottom: activeTab === tab ? '2px solid #0d221e' : '2px solid transparent',
                    transition: 'all 0.12s', textTransform: 'capitalize',
                  }}>
                    {tab === 'bloques' ? '🧱 Bloques' : tab === 'diseño' ? '🎨 Diseño' : '📤 Envío'}
                  </button>
                ))}
              </div>

              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '70vh', overflowY: 'auto' }}>

                {/* BLOQUES tab */}
                {activeTab === 'bloques' && (
                  <BlockEditor
                    blocks={blocks}
                    onChange={b => { setBlocks(b); setTemplateId('personalizado'); setPreviewData(null); }}
                    accentColor={design.accentColor}
                  />
                )}

                {/* DISEÑO tab */}
                {activeTab === 'diseño' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <Swatch label="Fondo email"   value={design.bodyBg}     onChange={v => setDesignField('bodyBg', v)} />
                      <Swatch label="Color acento"  value={design.accentColor} onChange={v => setDesignField('accentColor', v)} />
                      <Swatch label="Fondo footer"  value={design.footerBg}   onChange={v => setDesignField('footerBg', v)} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingTop: '4px' }}>
                      <div>
                        <label style={lbl}>Tipografía global</label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {([['serif', 'Georgia (serif)'], ['sans', 'System (sans)']] as const).map(([val, lText]) => (
                            <button key={val} onClick={() => setDesignField('font', val)} style={{
                              flex: 1, padding: '7px 8px', borderRadius: '8px', cursor: 'pointer', border: 'none',
                              background: design.font === val ? '#0d221e' : 'rgba(0,0,0,0.05)',
                              color: design.font === val ? '#fff' : '#555',
                              fontFamily: val === 'serif' ? 'Georgia,serif' : 'system-ui', fontSize: '0.72rem',
                            }}>{lText}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label style={lbl}>Botones footer</label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {([['pill', 'Pill'], ['rounded', 'Cuadrado']] as const).map(([val, lText]) => (
                            <button key={val} onClick={() => setDesignField('btnRadius', val)} style={{
                              flex: 1, padding: '7px 8px', borderRadius: val === 'pill' ? '999px' : '8px', cursor: 'pointer', border: 'none',
                              background: design.btnRadius === val ? '#0d221e' : 'rgba(0,0,0,0.05)',
                              color: design.btnRadius === val ? '#fff' : '#555',
                              fontFamily: 'system-ui', fontSize: '0.72rem',
                            }}>{lText}</button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="checkbox" id="showBadge" checked={design.showHotelBadge}
                        onChange={e => setDesignField('showHotelBadge', e.target.checked)}
                        style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#0d221e' }} />
                      <label htmlFor="showBadge" style={{ fontFamily: 'system-ui', fontSize: '0.76rem', color: '#444', cursor: 'pointer' }}>
                        Badge "Hotel El Encino" en bloques de encabezado
                      </label>
                    </div>

                    {/* Palettes */}
                    <div style={{ borderTop: '1px solid rgba(0,0,0,0.07)', paddingTop: '10px' }}>
                      <p style={lbl}>Paletas rápidas</p>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {[
                          { name: 'Encino',  accentColor: '#856d47', bodyBg: '#f5f4f0', footerBg: '#f0eee9' },
                          { name: 'Océano',  accentColor: '#2980b9', bodyBg: '#f0f4f8', footerBg: '#e8edf2' },
                          { name: 'Tierra',  accentColor: '#c0703a', bodyBg: '#faf5f0', footerBg: '#f0e8e0' },
                          { name: 'Pizarra', accentColor: '#64748b', bodyBg: '#f1f5f9', footerBg: '#e2e8f0' },
                          { name: 'Bosque',  accentColor: '#4caf7d', bodyBg: '#f0f7f4', footerBg: '#e0f0ea' },
                        ].map(p => (
                          <button key={p.name} onClick={() => setDesign(d => ({ ...d, ...p }))} style={{
                            padding: '5px 11px', borderRadius: '999px', border: '1px solid rgba(0,0,0,0.1)',
                            background: '#fff', cursor: 'pointer', fontFamily: 'system-ui', fontSize: '0.67rem', color: '#444',
                            display: 'flex', alignItems: 'center', gap: '5px',
                          }}>
                            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: p.accentColor, display: 'inline-block' }} />
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* ENVÍO tab */}
                {activeTab === 'envío' && (
                  <>
                    <p style={{ fontFamily: 'system-ui', fontSize: '0.78rem', color: '#555', margin: 0 }}>
                      Elige el segmento de destinatarios. El servidor cruzará los emails de Supabase Auth con los datos del directorio.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {SEGMENTS.map(s => (
                        <button key={s.id} onClick={() => { setSegment(s.id); setPreviewData(null); }} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '9px 13px', borderRadius: '10px', border: 'none', cursor: 'pointer', textAlign: 'left',
                          background: segment === s.id ? 'rgba(13,34,30,0.07)' : 'rgba(0,0,0,0.03)',
                          outline: segment === s.id ? '1.5px solid #0d221e' : '1.5px solid transparent',
                        }}>
                          <span style={{ fontFamily: 'system-ui', fontSize: '0.8rem', color: '#1a1a1a', fontWeight: segment === s.id ? 600 : 400 }}>{s.label}</span>
                          {s.count !== undefined && (
                            <span style={{ fontFamily: 'system-ui', fontSize: '0.67rem', background: 'rgba(0,0,0,0.07)', color: '#666', borderRadius: '999px', padding: '2px 8px' }}>{s.count}</span>
                          )}
                        </button>
                      ))}
                    </div>
                    {segment === 'custom' && (
                      <div>
                        <label style={lbl}>Emails — uno por línea</label>
                        <textarea
                          placeholder="email@ejemplo.com\notro@ejemplo.com"
                          value={customEmails}
                          onChange={e => { setCustom(e.target.value); setPreviewData(null); }}
                          rows={4}
                          style={{ ...inp, resize: 'vertical', fontFamily: 'monospace', fontSize: '0.78rem' }}
                        />
                        <p style={{ fontFamily: 'system-ui', fontSize: '0.67rem', color: '#aaa', marginTop: '3px' }}>
                          {customCount} email{customCount !== 1 ? 's' : ''} válido{customCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    )}
                    {previewData && (
                      <div style={{ background: 'rgba(13,34,30,0.05)', borderRadius: '10px', padding: '12px' }}>
                        <p style={{ fontFamily: 'system-ui', fontSize: '0.78rem', fontWeight: 600, color: '#0d221e', margin: '0 0 6px' }}>
                          {previewData.count} destinatario{previewData.count !== 1 ? 's' : ''} encontrado{previewData.count !== 1 ? 's' : ''}
                        </p>
                        {previewData.recipients.slice(0, 20).map(e => (
                          <p key={e} style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: '#555', margin: '1px 0' }}>{e}</p>
                        ))}
                        {previewData.count > 20 && (
                          <p style={{ fontFamily: 'system-ui', fontSize: '0.67rem', color: '#bbb', margin: '5px 0 0' }}>+ {previewData.count - 20} más…</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* RIGHT — Live preview */}
            <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '16px', overflow: 'hidden', position: 'sticky', top: '80px' }}>
              {/* Preview chrome */}
              <div style={{ background: '#0d221e', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                  {['#ff5f57', '#febc2e', '#28c840'].map(c => (
                    <span key={c} style={{ width: '9px', height: '9px', borderRadius: '50%', background: c, display: 'inline-block' }} />
                  ))}
                </div>
                <p style={{ fontFamily: 'system-ui', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', margin: '0 auto 0 4px' }}>
                  Vista previa en vivo
                </p>
                {/* Device toggles */}
                <div style={{ display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.08)', borderRadius: '7px', padding: '3px', flexShrink: 0 }}>
                  {([
                    { id: 'desktop' as const, title: 'Escritorio', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> },
                    { id: 'tablet'  as const, title: 'Tablet',     icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="12" cy="18" r="1" fill="currentColor"/></svg> },
                    { id: 'mobile'  as const, title: 'Móvil',      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><circle cx="12" cy="18" r="1" fill="currentColor"/></svg> },
                  ]).map(d => (
                    <button key={d.id} title={d.title} onClick={() => setPreviewDevice(d.id)} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '26px', height: '26px', borderRadius: '5px', border: 'none', cursor: 'pointer',
                      background: previewDevice === d.id ? 'rgba(255,255,255,0.18)' : 'transparent',
                      color: previewDevice === d.id ? '#fff' : 'rgba(255,255,255,0.38)',
                    }}>{d.icon}</button>
                  ))}
                </div>
              </div>
              {/* Device size label */}
              <div style={{ background: '#f5f4f0', borderBottom: '1px solid rgba(0,0,0,0.07)', padding: '4px 14px', textAlign: 'center' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '0.62rem', color: '#999' }}>
                  {previewDevice === 'desktop' ? '≥ 600px — Cliente de escritorio' : previewDevice === 'tablet' ? '480px — Tablet / iPad Mail' : '375px — iPhone / Android'}
                </span>
              </div>
              {/* Preview iframe */}
              <div style={{
                background: previewDevice === 'desktop' ? '#fff' : '#e5e3dd',
                minHeight: '600px', display: 'flex', justifyContent: 'center',
                padding: previewDevice === 'desktop' ? '0' : '16px 10px',
                overflowX: 'hidden',
              }}>
                {previewDevice === 'desktop' ? (
                  <iframe srcDoc={htmlPreview} style={{ width: '100%', height: '600px', border: 'none', display: 'block' }} title="Preview desktop" sandbox="allow-same-origin" />
                ) : (
                  <div style={{
                    width: previewDevice === 'tablet' ? '480px' : '375px',
                    maxWidth: '100%',
                    borderRadius: previewDevice === 'tablet' ? '16px' : '40px',
                    border: '8px solid #1a1a1a',
                    overflow: 'hidden',
                    boxShadow: '0 10px 48px rgba(0,0,0,0.32)',
                    background: '#1a1a1a',
                  }}>
                    {previewDevice === 'mobile' && (
                      <div style={{ background: '#1a1a1a', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '80px', height: '8px', borderRadius: '999px', background: '#333' }} />
                      </div>
                    )}
                    {previewDevice === 'tablet' && (
                      <div style={{ background: '#1a1a1a', height: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#444' }} />
                      </div>
                    )}
                    <iframe
                      srcDoc={htmlPreview}
                      style={{ width: previewDevice === 'tablet' ? '464px' : '359px', height: '550px', border: 'none', display: 'block' }}
                      title={`Preview ${previewDevice}`}
                      sandbox="allow-same-origin"
                    />
                    {previewDevice === 'mobile' && (
                      <div style={{ background: '#1a1a1a', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '60px', height: '4px', borderRadius: '999px', background: '#444' }} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. Send bar */}
          <div style={{
            background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '14px',
            padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '10px', flexWrap: 'wrap', position: 'sticky', bottom: '14px',
            boxShadow: '0 4px 28px rgba(0,0,0,0.09)',
          }}>
            <div style={{ minWidth: 0 }}>
              {result ? (
                <p style={{ fontFamily: 'system-ui', fontSize: '0.85rem', color: result.ok ? '#2a7a4f' : '#b0392a', margin: 0, fontWeight: 600 }}>{result.msg}</p>
              ) : previewData ? (
                <p style={{ fontFamily: 'system-ui', fontSize: '0.85rem', color: '#0d221e', margin: 0 }}>
                  <strong>{previewData.count}</strong> destinatarios listos — confirma para enviar
                </p>
              ) : (
                <div>
                  <p style={{ fontFamily: 'system-ui', fontSize: '0.75rem', color: '#888', margin: '0 0 1px' }}>
                    Segmento: <strong style={{ color: '#0d221e' }}>{SEGMENTS.find(s => s.id === segment)?.label}</strong>
                  </p>
                  <p style={{ fontFamily: 'system-ui', fontSize: '0.65rem', color: '#bbb', margin: 0 }}>Ve a la pestaña Envío para revisar destinatarios</p>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '7px', flexShrink: 0 }}>
              {result ? (
                <button onClick={() => { setResult(null); setPreviewData(null); }} style={btnSecondary}>Nuevo envío</button>
              ) : (
                <>
                  <button onClick={loadPreview} disabled={loadingPrev || sending} style={btnSecondary}>
                    {loadingPrev ? 'Verificando…' : '👁 Ver destinatarios'}
                  </button>
                  <button onClick={handleSend} disabled={sending || loadingPrev || !subject} style={{
                    fontFamily: 'system-ui', fontSize: '0.75rem', fontWeight: 700,
                    padding: '10px 22px', borderRadius: '999px', cursor: 'pointer', border: 'none',
                    background: (sending || !subject) ? '#ccc' : '#0d221e', color: '#fff', letterSpacing: '0.02em',
                  }}>
                    {sending ? 'Enviando…' : previewData ? `📢 Enviar a ${previewData.count}` : '📢 Enviar'}
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Shared styles ───────────────────────────────────────────── */
const lbl: React.CSSProperties = {
  display: 'block', fontFamily: 'system-ui', fontSize: '0.6rem', fontWeight: 700,
  letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.38)', marginBottom: '5px',
};
const inp: React.CSSProperties = {
  width: '100%', padding: '8px 12px', fontFamily: 'system-ui', fontSize: '0.83rem',
  border: '1px solid rgba(0,0,0,0.12)', borderRadius: '10px', background: '#fafafa',
  outline: 'none', boxSizing: 'border-box', color: '#1a1a1a',
};
const sectionHead: React.CSSProperties = {
  fontFamily: 'system-ui', fontSize: '0.62rem', letterSpacing: '0.14em', textTransform: 'uppercase',
  color: '#856d47', margin: 0, fontWeight: 700,
};
const btnSecondary: React.CSSProperties = {
  fontFamily: 'system-ui', fontSize: '0.75rem',
  padding: '9px 18px', borderRadius: '999px', cursor: 'pointer',
  border: '1px solid rgba(0,0,0,0.15)', background: '#fff', color: '#333',
};
