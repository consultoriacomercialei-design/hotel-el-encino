'use client';

/**
 * /admin/outreach — Outreach de negocios locales
 * Lista todos los negocios scrapeados de Santiago con stats,
 * filtros y botón directo de WhatsApp para invitarlos al directorio.
 */

import { useEffect, useState, useMemo } from 'react';

interface Business {
  _key: string;
  nombre: string;
  label: string;
  categoria: string;
  telefono: string;
  telefono_places: string;
  website_places: string;
  rating: string;
  'total_reseñas': string;
  horario: string;
  whatsapp_outreach: string;
  estado_directorio: string;
  lat: string;
  lng: string;
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pendiente:   { label: 'Pendiente',   color: '#856d47', bg: '#fdf3e3' },
  invitado:    { label: 'Invitado',    color: '#2563eb', bg: '#eff6ff' },
  registrado:  { label: 'Registrado',  color: '#16a34a', bg: '#f0fdf4' },
  no_interesa: { label: 'No interesa', color: '#6b7280', bg: '#f3f4f6' },
};

const CATEGORY_ICONS: Record<string, string> = {
  'Tiendas & Artesanías':       '🛍️',
  'Restaurantes':                '🍽️',
  'Gasolineras & Mecánicos':    '⛽',
  'Bancos & ATMs':               '🏦',
  'Médicos & Salud':             '🏥',
  'Farmacias':                   '💊',
  'Servicios & Delivery':        '🔧',
  'Historia & Cultura':          '🏛️',
  'Hospedaje':                   '🏨',
  'Salones & Estéticas':         '💇',
  'Cafés & Panaderías':          '☕',
  'Bares & Cantinas':            '🍺',
  'Bienestar & Spa':             '🧘',
  'Entretenimiento':             '🎭',
  'Veterinarias':                '🐾',
};

function StarRating({ rating }: { rating: string }) {
  const r = parseFloat(rating);
  if (!r) return null;
  const stars = Math.round(r);
  return (
    <span style={{ fontSize: '0.7rem', color: '#f59e0b' }} title={`${r} estrellas`}>
      {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
      <span style={{ color: '#6b7280', marginLeft: 3 }}>{r}</span>
    </span>
  );
}

export default function OutreachPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [csvFile, setCsvFile] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/outreach');
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error');
      const json = await res.json();
      setBusinesses(json.data);
      setCsvFile(json.csvFile);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  async function updateEstado(key: string, estado: string, b?: Business) {
    setUpdating(key);
    await fetch('/api/admin/outreach', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key, estado,
        nombre:   b?.nombre ?? '',
        telefono: b?.telefono_places || b?.telefono || '',
      }),
    });
    setBusinesses(prev =>
      prev.map(b => b._key === key ? { ...b, estado_directorio: estado } : b)
    );
    setUpdating(null);
  }

  // ── Stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total       = businesses.length;
    const conTel      = businesses.filter(b => b.telefono_places || b.telefono).length;
    const invitados   = businesses.filter(b => b.estado_directorio === 'invitado').length;
    const registrados = businesses.filter(b => b.estado_directorio === 'registrado').length;
    const noInteres   = businesses.filter(b => b.estado_directorio === 'no_interesa').length;
    const pendientes  = total - invitados - registrados - noInteres;
    const convRate    = total > 0 ? Math.round((registrados / total) * 100) : 0;
    return { total, conTel, invitados, registrados, noInteres, pendientes, convRate };
  }, [businesses]);

  // ── Categories ───────────────────────────────────────────────────
  const categories = useMemo(() => {
    const cats = new Set(businesses.map(b => b.label));
    return Array.from(cats).sort();
  }, [businesses]);

  // ── Filtered list ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return businesses.filter(b => {
      if (filterCat && b.label !== filterCat) return false;
      if (filterEstado && b.estado_directorio !== filterEstado) return false;
      if (search) {
        const q = search.toLowerCase();
        return b.nombre.toLowerCase().includes(q) ||
               b.label.toLowerCase().includes(q) ||
               (b.telefono_places || b.telefono || '').includes(q);
      }
      return true;
    });
  }, [businesses, filterCat, filterEstado, search]);

  // ── Render ───────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, color: '#856d47', fontSize: '0.9rem' }}>
      Cargando negocios...
    </div>
  );

  if (error) return (
    <div style={{ padding: 24, background: '#fef2f2', borderRadius: 8, color: '#b91c1c', fontSize: '0.9rem' }}>
      {error}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#1a1a1a' }}>
            Outreach · Directorio Santiago
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>
            Fuente: {csvFile} — invita negocios locales al directorio turístico
          </p>
        </div>
        <button
          onClick={fetchData}
          style={{ fontSize: '0.78rem', padding: '6px 14px', background: '#f5f3ef', border: '1px solid #e5e0d8', borderRadius: 6, cursor: 'pointer', color: '#856d47' }}
        >
          Actualizar
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
        {[
          { label: 'Total negocios',  value: stats.total,       color: '#1a1a1a', sub: `${stats.conTel} con tel.` },
          { label: 'Pendientes',      value: stats.pendientes,  color: '#856d47', sub: 'por invitar'              },
          { label: 'Invitados',       value: stats.invitados,   color: '#2563eb', sub: 'mensaje enviado'          },
          { label: 'Registrados',     value: stats.registrados, color: '#16a34a', sub: '¡en el directorio!'      },
          { label: 'No interesa',     value: stats.noInteres,   color: '#6b7280', sub: 'descartados'              },
          { label: 'Conversión',      value: `${stats.convRate}%`, color: stats.convRate > 0 ? '#16a34a' : '#9ca3af', sub: 'registrados / total' },
        ].map(({ label, value, color, sub }) => (
          <div key={label} style={{
            background: '#fff', border: '1px solid #e8e4de', borderRadius: 10,
            padding: '14px 16px', minWidth: 0,
          }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#4a4a4a', marginTop: 4 }}>{label}</div>
            <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Progress bar ── */}
      <div style={{ background: '#fff', border: '1px solid #e8e4de', borderRadius: 10, padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.75rem', color: '#4a4a4a' }}>
          <span style={{ fontWeight: 600 }}>Progreso de outreach</span>
          <span style={{ color: '#9ca3af' }}>
            {stats.invitados + stats.registrados + stats.noInteres} / {stats.total} contactados
          </span>
        </div>
        <div style={{ height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 4,
            background: 'linear-gradient(90deg, #856d47, #b8926a)',
            width: `${Math.round(((stats.invitados + stats.registrados + stats.noInteres) / Math.max(stats.total, 1)) * 100)}%`,
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Buscar negocio, tel..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: '1 1 200px', padding: '8px 12px', fontSize: '0.85rem',
            border: '1px solid #e5e0d8', borderRadius: 6, outline: 'none',
            background: '#fff',
          }}
        />
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          style={{ padding: '8px 10px', fontSize: '0.82rem', border: '1px solid #e5e0d8', borderRadius: 6, background: '#fff', color: '#4a4a4a', cursor: 'pointer' }}
        >
          <option value="">Todas las categorías</option>
          {categories.map(c => (
            <option key={c} value={c}>
              {(CATEGORY_ICONS[c] ?? '📍') + ' ' + c}
            </option>
          ))}
        </select>
        <select
          value={filterEstado}
          onChange={e => setFilterEstado(e.target.value)}
          style={{ padding: '8px 10px', fontSize: '0.82rem', border: '1px solid #e5e0d8', borderRadius: 6, background: '#fff', color: '#4a4a4a', cursor: 'pointer' }}
        >
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <span style={{ fontSize: '0.75rem', color: '#9ca3af', whiteSpace: 'nowrap' }}>
          {filtered.length} negocio{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Table ── */}
      <div style={{ background: '#fff', border: '1px solid #e8e4de', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#f9f7f4', borderBottom: '1px solid #e8e4de' }}>
                {['Negocio', 'Categoría', 'Teléfono', 'Rating', 'Estado', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#4a4a4a', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((b, i) => {
                const phone = b.telefono_places || b.telefono;
                const estado = ESTADO_CONFIG[b.estado_directorio] ?? ESTADO_CONFIG.pendiente;
                const isUpdating = updating === b._key;

                return (
                  <tr key={b._key + i} style={{
                    borderBottom: '1px solid #f0ece5',
                    background: i % 2 === 0 ? '#fff' : '#fdfcfb',
                  }}>
                    {/* Nombre */}
                    <td style={{ padding: '10px 14px', minWidth: 160 }}>
                      <div style={{ fontWeight: 600, color: '#1a1a1a' }}>{b.nombre}</div>
                      {b.website_places && (
                        <a href={b.website_places} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: '0.7rem', color: '#856d47', textDecoration: 'none' }}>
                          🌐 sitio web
                        </a>
                      )}
                    </td>

                    {/* Categoría */}
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: '#4a4a4a' }}>
                      {(CATEGORY_ICONS[b.label] ?? '📍') + ' '}
                      <span style={{ fontSize: '0.75rem' }}>{b.label}</span>
                    </td>

                    {/* Teléfono */}
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      {phone ? (
                        <a href={`tel:${phone}`} style={{ color: '#1a1a1a', textDecoration: 'none', fontSize: '0.8rem' }}>
                          {phone}
                        </a>
                      ) : (
                        <span style={{ color: '#d1d5db', fontSize: '0.75rem' }}>sin tel.</span>
                      )}
                    </td>

                    {/* Rating */}
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      <StarRating rating={b.rating} />
                      {b['total_reseñas'] && (
                        <div style={{ fontSize: '0.67rem', color: '#9ca3af' }}>{b['total_reseñas']} reseñas</div>
                      )}
                    </td>

                    {/* Estado */}
                    <td style={{ padding: '10px 14px' }}>
                      <select
                        value={b.estado_directorio}
                        disabled={isUpdating}
                        onChange={e => updateEstado(b._key, e.target.value, b)}
                        style={{
                          padding: '4px 8px', fontSize: '0.75rem', fontWeight: 600,
                          color: estado.color, background: estado.bg,
                          border: `1px solid ${estado.color}33`,
                          borderRadius: 20, cursor: 'pointer', outline: 'none',
                          opacity: isUpdating ? 0.5 : 1,
                        }}
                      >
                        {Object.entries(ESTADO_CONFIG).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </td>

                    {/* Acciones */}
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      {phone && b.whatsapp_outreach ? (
                        <a
                          href={b.whatsapp_outreach}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            if (b.estado_directorio === 'pendiente') {
                              updateEstado(b._key, 'invitado', b);
                            }
                          }}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '6px 12px', borderRadius: 6,
                            background: '#25d366', color: '#fff',
                            textDecoration: 'none', fontSize: '0.78rem', fontWeight: 600,
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                            <path d="M12 0C5.374 0 0 5.373 0 12c0 2.138.56 4.14 1.535 5.875L.057 23.882a.75.75 0 00.918.926l6.12-1.596C8.82 24.406 10.379 25 12 25c6.626 0 12-5.373 12-12S18.626 0 12 0zm0 22.5c-1.62 0-3.165-.453-4.493-1.248l-.322-.19-3.34.87.898-3.255-.21-.335A10.46 10.46 0 011.5 12C1.5 6.21 6.21 1.5 12 1.5S22.5 6.21 22.5 12 17.79 22.5 12 22.5z"/>
                          </svg>
                          WhatsApp
                        </a>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: '#d1d5db' }}>sin tel.</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>
                    No se encontraron negocios con estos filtros
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Tip ── */}
      <p style={{ margin: 0, fontSize: '0.72rem', color: '#9ca3af', textAlign: 'center' }}>
        Al hacer clic en "WhatsApp" se abre el chat con el mensaje de invitación pre-escrito y el negocio pasa a "Invitado" automáticamente.
        Cambia el estado manualmente si ya los contactaste por otro medio.
      </p>
    </div>
  );
}
