/**
 * /admin/facturas — listado global de CFDI por mes, con descarga del paquete
 * para la contadora y envío manual.
 */

import Link from 'next/link';
import { fetchAccountingConfig } from '@/app/lib/hotel-config';
import { fetchInvoicesForMonth, type ExportableInvoice } from '@/app/lib/invoice-export';
import MonthPicker from './MonthPicker';

export const dynamic = 'force-dynamic';

const money = (v: number | string | null | undefined) => {
  const n = typeof v === 'number' ? v : Number(v ?? 0);
  return (Number.isFinite(n) ? n : 0).toLocaleString('es-MX', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
};
const num = (v: number | string | null | undefined) => {
  const n = typeof v === 'number' ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default async function FacturasPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: raw } = await searchParams;
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(raw ?? '') ? raw! : currentMonth();

  let invoices: ExportableInvoice[] = [];
  let error = '';
  try {
    invoices = await fetchInvoicesForMonth(month);
  } catch (e) {
    error = e instanceof Error ? e.message : 'Error al leer las facturas';
  }
  const { email: contadora } = await fetchAccountingConfig();

  const vivas = invoices.filter(i => i.status !== 'canceled');
  const tot = (f: (i: ExportableInvoice) => number) => vivas.reduce((s, i) => s + f(i), 0);

  const card: React.CSSProperties = { background: '#fff', border: '1px solid #e8e4de', borderRadius: 14, padding: '22px 24px' };
  const th: React.CSSProperties = { textAlign: 'left', padding: '8px 10px', fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#856d47', borderBottom: '1px solid #e8e4de', whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { padding: '9px 10px', fontSize: '0.8rem', borderBottom: '1px solid #f2efe9', whiteSpace: 'nowrap' };
  const tdR: React.CSSProperties = { ...td, textAlign: 'right' };

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem', color: '#1a1a1a' }}>Facturas emitidas</h1>
        <Link href="/admin" style={{ fontSize: '0.82rem', color: '#856d47' }}>← Volver al panel</Link>
      </div>

      <MonthPicker month={month} contadora={contadora} hayFacturas={vivas.length > 0} />

      {error && (
        <div style={{ ...card, marginTop: 16, background: '#fdf3f3', borderColor: '#c6282840', color: '#c62828', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Totales del mes */}
      <div style={{ ...card, marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 14 }}>
        {([
          ['Facturas vigentes', String(vivas.length)],
          ['Subtotal', `$${money(tot(i => num(i.subtotal_mxn)))}`],
          ['IVA', `$${money(tot(i => num(i.iva_mxn)))}`],
          ['ISH', `$${money(tot(i => num(i.ish_mxn)))}`],
          ['Retención ISR', `−$${money(tot(i => num(i.ret_isr_mxn)))}`],
          ['Total', `$${money(tot(i => num(i.total_mxn)))}`],
        ] as const).map(([label, value], i, arr) => (
          <div key={label}>
            <div style={{ fontSize: '0.64rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(15,15,15,0.5)' }}>{label}</div>
            <div style={{ fontSize: i === arr.length - 1 ? '1.15rem' : '1rem', fontWeight: i === arr.length - 1 ? 700 : 600, color: '#1a1a1a', marginTop: 3 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Listado */}
      <div style={{ ...card, marginTop: 16, padding: '14px 8px', overflowX: 'auto' }}>
        {invoices.length === 0 ? (
          <p style={{ padding: '20px 14px', margin: 0, color: '#aaa', fontSize: '0.85rem' }}>
            No hay facturas emitidas en este mes.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr>
                <th style={th}>Folio</th><th style={th}>Fecha</th><th style={th}>Receptor</th>
                <th style={th}>Periodo</th><th style={{ ...th, textAlign: 'right' }}>Subtotal</th>
                <th style={{ ...th, textAlign: 'right' }}>IVA</th><th style={{ ...th, textAlign: 'right' }}>ISH</th>
                <th style={{ ...th, textAlign: 'right' }}>Ret. ISR</th><th style={{ ...th, textAlign: 'right' }}>Total</th>
                <th style={th}>Archivos</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(i => {
                const cancelada = i.status === 'canceled';
                return (
                  <tr key={`${i.series}${i.folio_number}`} style={{ opacity: cancelada ? 0.55 : 1 }}>
                    <td style={{ ...td, fontWeight: 700 }}>
                      {i.series}{i.folio_number}
                      {cancelada && <span style={{ color: '#c62828', marginLeft: 6, fontSize: '0.66rem' }}>CANCELADA</span>}
                    </td>
                    <td style={td}>{i.created_at.slice(0, 10)}</td>
                    <td style={{ ...td, whiteSpace: 'normal' }}>
                      <div>{i.customer_name}</div>
                      <div style={{ fontSize: '0.68rem', color: '#888' }}>{i.customer_rfc} · rég. {i.customer_tax_system}</div>
                    </td>
                    <td style={{ ...td, fontSize: '0.72rem', color: '#666' }}>
                      {i.period_start ? `${i.period_start} → ${i.period_end}` : '—'}
                      {i.nights ? ` · ${i.nights}n` : ''}
                    </td>
                    <td style={tdR}>${money(i.subtotal_mxn)}</td>
                    <td style={tdR}>${money(i.iva_mxn)}</td>
                    <td style={tdR}>${money(i.ish_mxn)}</td>
                    <td style={{ ...tdR, color: num(i.ret_isr_mxn) > 0 ? '#c62828' : '#bbb' }}>
                      {num(i.ret_isr_mxn) > 0 ? `−$${money(i.ret_isr_mxn)}` : '—'}
                    </td>
                    <td style={{ ...tdR, fontWeight: 700 }}>${money(i.total_mxn)}</td>
                    <td style={td}>
                      {i.facturapi_id ? (
                        <>
                          <a href={`/api/admin/invoices/${i.facturapi_id}/pdf`} target="_blank" rel="noreferrer" style={{ color: '#c62828', marginRight: 10, fontSize: '0.74rem', fontWeight: 600 }}>PDF</a>
                          <a href={`/api/admin/invoices/${i.facturapi_id}/xml`} style={{ color: '#2980b9', fontSize: '0.74rem', fontWeight: 600 }}>XML</a>
                        </>
                      ) : <span style={{ color: '#bbb', fontSize: '0.74rem' }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
