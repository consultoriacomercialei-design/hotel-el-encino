'use client';

import { useMemo, useState } from 'react';

export interface Contact {
  name: string;
  email: string;
  phone: string;
  sources: string[];
  last: string;
}

const GREEN = '#283820';
const GOLD = '#856d47';

function csvCell(v: string): string {
  const s = v ?? '';
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function ClientesClient({ contacts }: { contacts: Contact[] }) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(t) ||
        c.email.toLowerCase().includes(t) ||
        c.phone.toLowerCase().includes(t)
    );
  }, [q, contacts]);

  const withEmail = contacts.filter((c) => c.email).length;
  const withPhone = contacts.filter((c) => c.phone).length;

  function downloadCsv() {
    const header = ['Nombre', 'Correo', 'Teléfono', 'Fuentes', 'Último contacto'];
    const lines = [header.join(',')];
    for (const c of filtered) {
      lines.push(
        [c.name, c.email, c.phone, c.sources.join(' + '), (c.last || '').slice(0, 10)].map(csvCell).join(',')
      );
    }
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clientes-hotel-el-encino-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const th: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', fontSize: '0.72rem', letterSpacing: '0.06em', color: '#8a8a8a', textTransform: 'uppercase', borderBottom: '1px solid #e8e4de' };
  const td: React.CSSProperties = { padding: '10px 12px', fontSize: '0.88rem', borderBottom: '1px solid #f0ece5' };

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', color: GREEN, margin: '4px 0 2px' }}>Clientes</h1>
          <p style={{ color: '#6b6b6b', fontSize: '0.85rem', margin: 0 }}>
            {contacts.length} contactos · {withEmail} con correo · {withPhone} con teléfono
          </p>
        </div>
        <button onClick={downloadCsv} style={{ background: GREEN, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 18px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
          ⬇ Descargar CSV
        </button>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por nombre, correo o teléfono…"
        style={{ width: '100%', padding: '11px 12px', borderRadius: 9, border: '1px solid #d8d2c8', fontSize: '0.95rem', boxSizing: 'border-box', marginBottom: 14 }}
      />

      <div style={{ background: '#fff', border: '1px solid #e8e4de', borderRadius: 12, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
          <thead>
            <tr>
              <th style={th}>Nombre</th>
              <th style={th}>Correo</th>
              <th style={th}>Teléfono</th>
              <th style={th}>Fuente</th>
              <th style={th}>Último</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr key={i}>
                <td style={{ ...td, fontWeight: 600 }}>{c.name || '—'}</td>
                <td style={td}>{c.email || <span style={{ color: '#ccc' }}>—</span>}</td>
                <td style={td}>{c.phone || <span style={{ color: '#ccc' }}>—</span>}</td>
                <td style={{ ...td, fontSize: '0.75rem', color: GOLD }}>{c.sources.join(' + ')}</td>
                <td style={{ ...td, color: '#999', fontSize: '0.8rem' }}>{(c.last || '').slice(0, 10)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td style={{ ...td, textAlign: 'center', color: '#999' }} colSpan={5}>Sin resultados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
