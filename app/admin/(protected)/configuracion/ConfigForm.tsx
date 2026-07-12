'use client';

import { useState } from 'react';
import { savePricesAction, saveAddonsAction } from './actions';

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
  active: boolean;
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e8e4de',
  borderRadius: '14px',
  padding: '22px 24px',
  marginBottom: '20px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#856d47',
  marginBottom: '16px',
  display: 'block',
};

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid #e8e4de',
  fontSize: '0.9rem',
  fontFamily: 'monospace',
  color: '#1a1a1a',
  width: '110px',
  background: '#fafaf8',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 0',
  borderBottom: '1px solid #f5f3ef',
  gap: '12px',
};

export default function ConfigForm({
  initialPrices,
  initialAddons,
}: {
  initialPrices: PriceConfig;
  initialAddons: AddonConfig[];
}) {
  const [prices,      setPrices]      = useState(initialPrices);
  const [priceStatus, setPriceStatus] = useState('');
  const [priceBusy,   setPriceBusy]   = useState(false);

  const [addons,      setAddons]      = useState(initialAddons);
  const [editing,     setEditing]     = useState<string | null>(null);
  const [editDraft,   setEditDraft]   = useState<AddonConfig | null>(null);
  const [addonStatus, setAddonStatus] = useState('');
  const [addonBusy,   setAddonBusy]   = useState(false);

  // ── Price actions ───────────────────────────────────────────────────────────

  const handlePriceChange = (key: keyof PriceConfig, raw: string) => {
    const val = parseInt(raw.replace(/\D/g, ''), 10);
    if (!isNaN(val)) setPrices(prev => ({ ...prev, [key]: val }));
  };

  const savePrices = async () => {
    setPriceBusy(true); setPriceStatus('');
    try {
      await savePricesAction(prices);
      setPriceStatus('Guardado');
    } catch {
      setPriceStatus('Error al guardar');
    } finally {
      setPriceBusy(false);
      setTimeout(() => setPriceStatus(''), 3000);
    }
  };

  // ── Add-on actions ──────────────────────────────────────────────────────────

  const toggleActive = async (id: string) => {
    const updated = addons.map(a => a.id === id ? { ...a, active: !a.active } : a);
    setAddons(updated);
    try { await saveAddonsAction(updated); } catch { /* silent */ }
  };

  const startEdit = (a: AddonConfig) => {
    setEditing(a.id);
    setEditDraft({ ...a });
  };

  const cancelEdit = () => { setEditing(null); setEditDraft(null); };

  const saveAddon = async () => {
    if (!editDraft) return;
    setAddonBusy(true); setAddonStatus('');
    const updated = addons.map(a => a.id === editDraft.id ? editDraft : a);
    try {
      await saveAddonsAction(updated);
      setAddons(updated);
      setAddonStatus('Guardado');
      setEditing(null); setEditDraft(null);
    } catch {
      setAddonStatus('Error al guardar');
    } finally {
      setAddonBusy(false);
      setTimeout(() => setAddonStatus(''), 3000);
    }
  };

  const PRICE_ROWS: { key: keyof PriceConfig; label: string; sub: string }[] = [
    { key: 'weekday',       label: 'Entre semana (lun – jue)',    sub: 'por noche · por habitación' },
    { key: 'weekend',       label: 'Fin de semana (vie – dom)',   sub: 'por noche · por habitación' },
    { key: 'extra_adult',   label: '4° adulto (cargo extra)',      sub: 'por noche adicional'        },
    { key: 'special_extra', label: 'Temporada especial (+cargo)', sub: 'extra por noche / habitación'},
    { key: 'semana_santa',  label: 'Semana Santa (tarifa fija)',   sub: 'por noche · por habitación' },
  ];

  return (
    <div>
      {/* ── Precios ──────────────────────────────────────────────────────── */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <span style={{ ...labelStyle, marginBottom: 0 }}>Precios base de habitación</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {priceStatus && (
              <span style={{ fontSize: '0.78rem', color: priceStatus === 'Guardado' ? '#2e7d32' : '#c62828' }}>
                {priceStatus}
              </span>
            )}
            <button
              onClick={savePrices}
              disabled={priceBusy}
              style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#2e7d32', color: '#fff', fontSize: '0.82rem', fontWeight: 600, cursor: priceBusy ? 'not-allowed' : 'pointer', opacity: priceBusy ? 0.6 : 1 }}
            >
              {priceBusy ? 'Guardando…' : 'Guardar precios'}
            </button>
          </div>
        </div>

        {PRICE_ROWS.map(({ key, label, sub }) => (
          <div key={key} style={rowStyle}>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#1a1a1a', fontWeight: 500 }}>{label}</div>
              <div style={{ fontSize: '0.72rem', color: '#aaa', marginTop: '2px' }}>{sub}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: '#6b6b6b' }}>$</span>
              <input
                type="number"
                value={prices[key]}
                min={0}
                step={50}
                onChange={e => handlePriceChange(key, e.target.value)}
                style={inputStyle}
              />
              <span style={{ fontSize: '0.72rem', color: '#aaa' }}>MXN</span>
            </div>
          </div>
        ))}

        <div style={{ marginTop: '14px', padding: '12px 14px', background: '#f5f3ef', borderRadius: '8px', fontSize: '0.75rem', color: '#6b6b6b', lineHeight: 1.5 }}>
          Los cambios se reflejan en el formulario de reserva inmediatamente sin re-desplegar el sitio.
        </div>
      </div>

      {/* ── Add-ons ──────────────────────────────────────────────────────── */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <span style={{ ...labelStyle, marginBottom: 0 }}>Add-ons</span>
          {addonStatus && (
            <span style={{ fontSize: '0.78rem', color: addonStatus === 'Guardado' ? '#2e7d32' : '#c62828' }}>
              {addonStatus}
            </span>
          )}
        </div>

        {addons.map(a => (
          <div key={a.id}>
            {editing === a.id && editDraft ? (
              /* ── Edit mode ── */
              <div style={{ padding: '16px', margin: '8px 0', background: '#f5f3ef', borderRadius: '10px', border: '1px solid #e0dbd4' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#856d47', marginBottom: '4px', textTransform: 'uppercase' }}>Título</div>
                    <input
                      value={editDraft.title}
                      onChange={e => setEditDraft(d => d ? { ...d, title: e.target.value } : d)}
                      style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#856d47', marginBottom: '4px', textTransform: 'uppercase' }}>Precio (MXN)</div>
                    <input
                      type="number"
                      value={editDraft.unitPrice}
                      min={0}
                      step={50}
                      onChange={e => setEditDraft(d => d ? { ...d, unitPrice: parseInt(e.target.value) || 0 } : d)}
                      style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#856d47', marginBottom: '4px', textTransform: 'uppercase' }}>Descripción</div>
                  <input
                    value={editDraft.subtitle}
                    onChange={e => setEditDraft(d => d ? { ...d, subtitle: e.target.value } : d)}
                    style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '20px', marginBottom: '14px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#1a1a1a', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={editDraft.perNight}
                      onChange={e => setEditDraft(d => d ? { ...d, perNight: e.target.checked } : d)}
                    />
                    Precio por noche
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#1a1a1a', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={!!editDraft.perPerson}
                      onChange={e => setEditDraft(d => d ? { ...d, perPerson: e.target.checked } : d)}
                    />
                    Precio por persona
                  </label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={saveAddon}
                    disabled={addonBusy}
                    style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#2e7d32', color: '#fff', fontSize: '0.82rem', fontWeight: 600, cursor: addonBusy ? 'not-allowed' : 'pointer', opacity: addonBusy ? 0.6 : 1 }}
                  >
                    {addonBusy ? 'Guardando…' : 'Guardar'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e0dbd4', background: '#fff', fontSize: '0.82rem', color: '#6b6b6b', cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  {addonStatus && (
                    <span style={{
                      fontSize: '0.8rem', fontWeight: 600,
                      color: addonStatus === 'Guardado' ? '#2e7d32' : '#c62828',
                      padding: '4px 10px', borderRadius: '6px',
                      background: addonStatus === 'Guardado' ? '#e8f5e9' : '#ffebee',
                    }}>
                      {addonStatus}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              /* ── View mode ── */
              <div style={{ ...rowStyle, opacity: a.active ? 1 : 0.45 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '1.15rem', flexShrink: 0 }}>{a.icon}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1a1a1a', lineHeight: 1.3 }}>{a.title}</div>
                    <div style={{ fontSize: '0.73rem', color: '#6b6b6b', marginTop: '2px' }}>{a.subtitle}</div>
                    <div style={{ fontSize: '0.7rem', color: '#856d47', marginTop: '3px', fontWeight: 600 }}>
                      ${a.unitPrice.toLocaleString('es-MX')}
                      {a.perNight && ' · por noche'}
                      {a.perPerson && ' · por persona'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                  <button
                    onClick={() => toggleActive(a.id)}
                    style={{
                      padding: '4px 12px', borderRadius: '980px', border: 'none', fontSize: '0.72rem', fontWeight: 700,
                      cursor: 'pointer',
                      background: a.active ? '#e8f5e9' : '#f5f5f5',
                      color: a.active ? '#2e7d32' : '#757575',
                    }}
                  >
                    {a.active ? 'Activo' : 'Inactivo'}
                  </button>
                  <button
                    onClick={() => startEdit(a)}
                    style={{ padding: '4px 12px', borderRadius: '8px', border: '1px solid #e0dbd4', background: '#fff', fontSize: '0.75rem', color: '#4a4a4a', cursor: 'pointer' }}
                  >
                    Editar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        <div style={{ marginTop: '14px', padding: '12px 14px', background: '#f5f3ef', borderRadius: '8px', fontSize: '0.75rem', color: '#6b6b6b', lineHeight: 1.5 }}>
          Los add-ons inactivos no aparecen en el formulario de reserva. Los precios se actualizan en tiempo real.
        </div>
      </div>
    </div>
  );
}
