'use client';

import { useState, useEffect, useRef } from 'react';

/* ─────────────────────────────────────────────────────────────
   ContactsManager — Anunciantes · Suscriptores · Listas
   ───────────────────────────────────────────────────────────── */

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  status: string;  // active | unsubscribed
  source: string;  // manual | form | import
  subscribed_at: string;
}

interface ContactList {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface Advertiser {
  id: string;
  name: string;
  tier: string;
  status: string;
  category: string;
  email?: string;
}

type SubTab = 'advertisers' | 'subscribers' | 'lists';

interface ContactsManagerProps {
  advertisers: Advertiser[];
}

export default function ContactsManager({ advertisers }: ContactsManagerProps) {
  const [tab, setTab]                   = useState<SubTab>('advertisers');
  const [subscribers, setSubscribers]   = useState<Subscriber[]>([]);
  const [lists, setLists]               = useState<ContactList[]>([]);
  const [loading, setLoading]           = useState(false);
  const [search, setSearch]             = useState('');

  // Add subscriber
  const [addEmail, setAddEmail]         = useState('');
  const [addName, setAddName]           = useState('');
  const [adding, setAdding]             = useState(false);
  const [addMsg, setAddMsg]             = useState('');

  // CSV import
  const fileRef                         = useRef<HTMLInputElement>(null);
  const [importing, setImporting]       = useState(false);

  // Create list
  const [newListName, setNewListName]   = useState('');
  const [newListDesc, setNewListDesc]   = useState('');
  const [creatingList, setCreatingList] = useState(false);
  const [showListForm, setShowListForm] = useState(false);

  useEffect(() => {
    if (tab === 'subscribers' && subscribers.length === 0) loadSubscribers();
    if (tab === 'lists'       && lists.length === 0)       loadLists();
  }, [tab]);

  async function loadSubscribers() {
    setLoading(true);
    const r = await fetch('/api/admin/contacts?kind=subscribers');
    if (r.ok) setSubscribers(await r.json());
    setLoading(false);
  }

  async function loadLists() {
    setLoading(true);
    const r = await fetch('/api/admin/contacts?kind=lists');
    if (r.ok) setLists(await r.json());
    setLoading(false);
  }

  async function addSubscriber() {
    if (!addEmail.includes('@')) { setAddMsg('Email inválido'); return; }
    setAdding(true);
    setAddMsg('');
    const r = await fetch('/api/admin/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add-subscriber', email: addEmail, name: addName || null }),
    });
    const data = await r.json();
    if (!r.ok) { setAddMsg(data.error ?? 'Error'); setAdding(false); return; }
    setSubscribers(prev => [data, ...prev]);
    setAddEmail(''); setAddName(''); setAddMsg('✓ Agregado');
    setAdding(false);
  }

  async function deleteSubscriber(id: string) {
    if (!confirm('¿Eliminar este suscriptor?')) return;
    await fetch('/api/admin/contacts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'subscriber', id }),
    });
    setSubscribers(prev => prev.filter(s => s.id !== id));
  }

  async function toggleStatus(s: Subscriber) {
    const newStatus = s.status === 'active' ? 'unsubscribed' : 'active';
    await fetch('/api/admin/contacts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: s.id, status: newStatus }),
    });
    setSubscribers(prev => prev.map(x => x.id === s.id ? { ...x, status: newStatus } : x));
  }

  async function importCSV(file: File) {
    setImporting(true);
    const text = await file.text();
    const lines = text.split('\n').slice(1); // skip header
    const rows = lines
      .map(l => l.split(','))
      .filter(p => p[0]?.includes('@'))
      .map(p => ({ email: p[0].trim().replace(/"/g, ''), name: p[1]?.trim().replace(/"/g, '') || undefined }));

    const r = await fetch('/api/admin/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'import-subscribers', rows }),
    });
    const data = await r.json();
    setAddMsg(`✓ ${data.imported} importados`);
    await loadSubscribers();
    setImporting(false);
  }

  async function createList() {
    if (!newListName.trim()) return;
    setCreatingList(true);
    const r = await fetch('/api/admin/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create-list', name: newListName, description: newListDesc }),
    });
    const data = await r.json();
    if (r.ok) {
      setLists(prev => [data, ...prev]);
      setNewListName(''); setNewListDesc(''); setShowListForm(false);
    }
    setCreatingList(false);
  }

  async function deleteList(id: string) {
    if (!confirm('¿Eliminar esta lista?')) return;
    await fetch('/api/admin/contacts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'list', id }),
    });
    setLists(prev => prev.filter(l => l.id !== id));
  }

  // Filter helpers
  const filteredAds = advertisers.filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase()) || (a.email ?? '').toLowerCase().includes(search.toLowerCase())
  );
  const filteredSubs = subscribers.filter(s =>
    !search || s.email.toLowerCase().includes(search.toLowerCase()) || (s.name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {([
          ['advertisers', `🏪 Anunciantes (${advertisers.length})`],
          ['subscribers', `📧 Suscriptores (${subscribers.length})`],
          ['lists',       `📋 Listas (${lists.length})`],
        ] as const).map(([id, label]) => (
          <button key={id} onClick={() => { setTab(id); setSearch(''); }} style={{
            fontFamily: 'system-ui', fontSize: '0.78rem', fontWeight: tab === id ? 700 : 400,
            padding: '7px 16px', borderRadius: '999px', cursor: 'pointer',
            border: tab === id ? 'none' : '1px solid rgba(0,0,0,0.12)',
            background: tab === id ? '#0d221e' : '#fff',
            color: tab === id ? '#fff' : '#555',
          }}>{label}</button>
        ))}
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={tab === 'advertisers' ? 'Buscar anunciante…' : tab === 'subscribers' ? 'Buscar suscriptor…' : 'Buscar lista…'}
        style={inp}
      />

      {/* ── Advertisers ── */}
      {tab === 'advertisers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {filteredAds.length === 0 && <p style={empty}>No hay anunciantes.</p>}
          {filteredAds.map(a => (
            <div key={a.id} style={contactRow}>
              <div style={avatar(TIER_COLOR[a.tier] ?? '#aaa')}>
                {a.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={contactName}>{a.name}</p>
                <p style={contactMeta}>{a.email ?? 'Sin email'} · {a.category}</p>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                <span style={tierBadge(a.tier)}>{TIER_LABEL[a.tier] ?? a.tier}</span>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: STATUS_COLOR[a.status] ?? '#ccc' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Subscribers ── */}
      {tab === 'subscribers' && (
        <>
          {/* Add + import toolbar */}
          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={sectionLabel}>Agregar suscriptor</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input value={addEmail} onChange={e => setAddEmail(e.target.value)} placeholder="email@ejemplo.com *"
                style={{ ...inp, flex: 2, minWidth: '180px' }} />
              <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="Nombre (opcional)"
                style={{ ...inp, flex: 1, minWidth: '120px' }} />
              <button onClick={addSubscriber} disabled={adding} style={btnPrimary}>
                {adding ? '…' : '+ Agregar'}
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button onClick={() => fileRef.current?.click()} disabled={importing}
                style={{ ...btnSecondary, fontSize: '0.72rem' }}>
                {importing ? 'Importando…' : '📥 Importar CSV'}
              </button>
              <span style={{ fontFamily: 'system-ui', fontSize: '0.65rem', color: '#bbb' }}>
                Formato: email, nombre (una fila por línea, con encabezado)
              </span>
              {addMsg && <span style={{ fontFamily: 'system-ui', fontSize: '0.72rem', color: addMsg.startsWith('✓') ? '#2a7a4f' : '#b0392a' }}>{addMsg}</span>}
            </div>
          </div>
          <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) importCSV(f); e.target.value = ''; }} />

          {loading && <p style={empty}>Cargando…</p>}
          {!loading && filteredSubs.length === 0 && <p style={empty}>Sin suscriptores aún.</p>}
          {!loading && filteredSubs.map(s => (
            <div key={s.id} style={contactRow}>
              <div style={avatar('#2980b9')}>{s.email.charAt(0).toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={contactName}>{s.name ?? s.email}</p>
                <p style={contactMeta}>{s.email} · {s.source} · {new Date(s.subscribed_at).toLocaleDateString('es-MX')}</p>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                <button
                  onClick={() => toggleStatus(s)}
                  style={{
                    fontFamily: 'system-ui', fontSize: '0.62rem', padding: '3px 9px',
                    borderRadius: '999px', border: 'none', cursor: 'pointer',
                    background: s.status === 'active' ? 'rgba(42,122,79,0.1)' : 'rgba(0,0,0,0.05)',
                    color: s.status === 'active' ? '#2a7a4f' : '#999',
                  }}
                >
                  {s.status === 'active' ? '✓ Activo' : '— Baja'}
                </button>
                <button onClick={() => deleteSubscriber(s.id)} style={{ ...ctrlBtn, color: '#b0392a' }}>✕</button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── Lists ── */}
      {tab === 'lists' && (
        <>
          <button onClick={() => setShowListForm(v => !v)} style={btnPrimary}>
            {showListForm ? 'Cancelar' : '+ Nueva lista'}
          </button>
          {showListForm && (
            <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Field label="Nombre de la lista">
                <input value={newListName} onChange={e => setNewListName(e.target.value)} style={inp} placeholder="Ej: Restaurantes Santiago" />
              </Field>
              <Field label="Descripción (opcional)">
                <input value={newListDesc} onChange={e => setNewListDesc(e.target.value)} style={inp} />
              </Field>
              <button onClick={createList} disabled={creatingList || !newListName.trim()} style={btnPrimary}>
                {creatingList ? 'Creando…' : 'Crear lista'}
              </button>
            </div>
          )}

          {loading && <p style={empty}>Cargando…</p>}
          {!loading && lists.length === 0 && <p style={empty}>Sin listas. Crea una para organizar contactos por segmento.</p>}
          {!loading && lists.map(l => (
            <div key={l.id} style={contactRow}>
              <div style={{ fontSize: '1.4rem' }}>📋</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={contactName}>{l.name}</p>
                {l.description && <p style={contactMeta}>{l.description}</p>}
                <p style={contactMeta}>Creada {new Date(l.created_at).toLocaleDateString('es-MX')}</p>
              </div>
              <button onClick={() => deleteList(l.id)} style={{ ...ctrlBtn, color: '#b0392a' }}>✕</button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontFamily: 'system-ui', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.38)', margin: '0 0 4px' }}>{label}</p>
      {children}
    </div>
  );
}

const TIER_COLOR: Record<string, string> = { free: '#aaa', featured: '#856d47', hero: '#b09060' };
const TIER_LABEL: Record<string, string> = { free: 'Gratuito', featured: 'Destacado', hero: '★ Hero' };
const STATUS_COLOR: Record<string, string> = { pending: '#b07d3e', active: '#2a7a4f', suspended: '#b0392a' };

function avatar(color: string): React.CSSProperties {
  return {
    width: '36px', height: '36px', borderRadius: '50%', background: `${color}22`,
    border: `2px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'system-ui', fontSize: '0.9rem', fontWeight: 700, color, flexShrink: 0,
  };
}

function tierBadge(tier: string): React.CSSProperties {
  return {
    fontFamily: 'system-ui', fontSize: '0.58rem', letterSpacing: '0.07em', textTransform: 'uppercase',
    padding: '2px 8px', borderRadius: '999px',
    background: tier === 'hero' ? 'linear-gradient(135deg,#856d47,#b09060)' : tier === 'featured' ? 'rgba(133,109,71,0.12)' : 'rgba(0,0,0,0.05)',
    color: tier === 'hero' ? '#fff' : tier === 'featured' ? '#856d47' : '#888',
  };
}

const inp: React.CSSProperties = {
  width: '100%', padding: '8px 12px', fontFamily: 'system-ui', fontSize: '0.83rem',
  border: '1px solid rgba(0,0,0,0.12)', borderRadius: '10px', background: '#fafafa',
  outline: 'none', boxSizing: 'border-box', color: '#1a1a1a',
};
const contactRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '12px',
  background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '12px', padding: '10px 14px',
};
const contactName: React.CSSProperties = {
  fontFamily: 'system-ui', fontSize: '0.85rem', fontWeight: 600, color: '#0d221e', margin: 0,
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};
const contactMeta: React.CSSProperties = {
  fontFamily: 'system-ui', fontSize: '0.68rem', color: '#aaa', margin: '2px 0 0',
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};
const empty: React.CSSProperties = {
  fontFamily: 'system-ui', fontSize: '0.82rem', color: '#bbb', textAlign: 'center', padding: '20px 0',
};
const sectionLabel: React.CSSProperties = {
  fontFamily: 'system-ui', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em',
  textTransform: 'uppercase', color: 'rgba(0,0,0,0.38)', margin: 0,
};
const btnPrimary: React.CSSProperties = {
  fontFamily: 'system-ui', fontSize: '0.78rem', fontWeight: 700,
  padding: '9px 20px', borderRadius: '999px', border: 'none',
  background: '#0d221e', color: '#fff', cursor: 'pointer',
};
const btnSecondary: React.CSSProperties = {
  fontFamily: 'system-ui', fontSize: '0.75rem',
  padding: '7px 16px', borderRadius: '999px',
  border: '1px solid rgba(0,0,0,0.15)', background: '#fff', color: '#555', cursor: 'pointer',
};
const ctrlBtn: React.CSSProperties = {
  padding: '4px 8px', borderRadius: '6px', border: 'none',
  background: 'rgba(0,0,0,0.04)', cursor: 'pointer',
  fontFamily: 'system-ui', fontSize: '0.72rem', color: '#666',
};
