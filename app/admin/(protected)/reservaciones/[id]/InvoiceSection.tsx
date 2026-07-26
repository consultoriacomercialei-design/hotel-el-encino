'use client';

import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createInvoiceAction,
  cancelInvoiceAction,
  sendInvoiceEmailAction,
  type StoredInvoice,
} from '../../invoice-actions';
import {
  USOS_CFDI,
  REGIMENES_FISCALES,
  FORMAS_PAGO_SAT,
  MOTIVOS_CANCELACION,
  suggestPaymentForm,
  EMISOR_TAX_SYSTEM,
} from '@/app/lib/facturapi';
import {
  quoteCFDI,
  validateReceptor,
  shouldWithholdIsr,
  DEFAULT_FISCAL,
  type FiscalConfig,
} from '@/app/lib/cfdi-hospedaje';

interface LineItem {
  description: string;
  amount: number;
}

interface Props {
  reservation: {
    id: string;
    folio: string;
    guest_name: string;
    guest_email: string;
    check_in: string;
    check_out: string;
    nights: number;
    total_mxn: number;
    payment_method: string;
    line_items?: LineItem[];
  };
  existingInvoices: StoredInvoice[];
  configured: boolean;
  testMode: boolean;
  fiscal?: FiscalConfig;
}

/**
 * Postgres devuelve NUMERIC como cadena en algunas configuraciones de PostgREST,
 * y `"225.00".toLocaleString()` NO formatea. Se normaliza aquí para que ningún
 * monto se pinte mal.
 */
const money = (n: number | string | null | undefined) => {
  const v = typeof n === 'number' ? n : Number(n ?? 0);
  return (Number.isFinite(v) ? v : 0).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const num = (n: number | string | null | undefined) => {
  const v = typeof n === 'number' ? n : Number(n ?? 0);
  return Number.isFinite(v) ? v : 0;
};

/** Suma días a una fecha ISO (YYYY-MM-DD) sin cruzarse con zonas horarias. */
function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function nightsBetween(from: string, to: string): number {
  if (!from || !to) return 0;
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

export default function InvoiceSection({
  reservation: r,
  existingInvoices,
  configured,
  testMode,
  fiscal = DEFAULT_FISCAL,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowMsg, setRowMsg] = useState<Record<string, { kind: 'ok' | 'error'; text: string }>>({});
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [cancelMotive, setCancelMotive] = useState('02');

  // ── Cuánto queda por facturar ────────────────────────────────────────────
  // Solo cuentan las facturas fiscalmente vivas: ni canceladas, ni fallidas, ni
  // de ensayo. Si las de prueba contaran, ensayar aquí bloquearía la emisión real.
  const live = existingInvoices.filter(
    i => i.status !== 'canceled' && i.status !== 'failed' && !i.test_mode
  );
  // num(): si `nights` llegara como cadena, `s + "10"` concatenaría y el contador
  // de noches facturadas quedaría absurdo.
  const nightsInvoiced = live.reduce((s, i) => s + num(i.nights), 0);
  const nightsLeft = Math.max(0, r.nights - nightsInvoiced);

  // El siguiente tramo arranca donde terminó el último facturado
  const lastEnd = live
    .map(i => i.period_end)
    .filter((d): d is string => !!d)
    .sort()
    .at(-1);
  const defaultStart = lastEnd ?? r.check_in;

  const [form, setForm] = useState({
    period_start:        defaultStart,
    period_end:          addDays(defaultStart, Math.min(nightsLeft || 1, nightsLeft || 1)),
    base_rate:           r.nights > 0 ? String(Math.round(r.total_mxn / r.nights)) : '',
    customer_rfc:        '',
    customer_name:       '',
    customer_tax_system: '601',
    customer_zip:        '',
    customer_email:      r.guest_email,
    uso_cfdi:            'G03',
    payment_form:        suggestPaymentForm(r.payment_method),
    payment_method_sat:  'PUE' as 'PUE' | 'PPD',
  });

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  const nights = nightsBetween(form.period_start, form.period_end);
  const baseRate = Number(form.base_rate) || 0;
  const withholding = shouldWithholdIsr(form.customer_rfc, EMISOR_TAX_SYSTEM);

  const breakdown = useMemo(
    () => quoteCFDI({ baseRate, nights: Math.max(nights, 0), withholding, config: fiscal }),
    [baseRate, nights, withholding, fiscal]
  );

  const problems = useMemo(() => {
    const p = validateReceptor({
      rfc: form.customer_rfc,
      name: form.customer_name,
      taxSystem: form.customer_tax_system,
      zip: form.customer_zip,
      email: form.customer_email,
      usoCfdi: form.uso_cfdi,
    });
    if (nights < 1) p.push('El periodo debe cubrir al menos una noche.');
    if (nights > nightsLeft) p.push(`Solo quedan ${nightsLeft} noche(s) por facturar de esta reservación.`);
    if (baseRate <= 0) p.push('Captura la tarifa por noche sin impuestos.');
    return p;
  }, [form, nights, nightsLeft, baseRate]);

  const canSubmit = problems.length === 0 && !isPending;

  // ── Acciones ─────────────────────────────────────────────────────────────

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) { setError(problems.join('\n')); return; }
    setError(''); setNotice('');
    startTransition(async () => {
      try {
        const res = await createInvoiceAction({
          reservation_id:      r.id,
          folio:               r.folio,
          period_start:        form.period_start,
          period_end:          form.period_end,
          nights,
          base_rate:           baseRate,
          customer_rfc:        form.customer_rfc,
          customer_name:       form.customer_name,
          customer_tax_system: form.customer_tax_system,
          customer_zip:        form.customer_zip,
          customer_email:      form.customer_email,
          uso_cfdi:            form.uso_cfdi,
          payment_form:        form.payment_form,
          payment_method_sat:  form.payment_method_sat,
        });
        if (res.orphaned) {
          setError(
            `⚠️ La factura SÍ se timbró (${res.series ?? ''}${res.folio_number} · ${res.folio_fiscal}) ` +
            `pero no se pudo guardar en la base. Anota este ID de Facturapi: ${res.facturapi_id}`
          );
          return;
        }
        setShowForm(false);
        setNotice(`Factura ${res.series ?? ''}${res.folio_number} emitida por $${money(res.breakdown.total)} MXN.`);
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error al generar la factura');
      }
    });
  };

  const handleSendEmail = (inv: StoredInvoice) => {
    if (!inv.facturapi_id) return;
    setBusyId(inv.id);
    startTransition(async () => {
      try {
        await sendInvoiceEmailAction(inv.facturapi_id!, inv.customer_email || r.guest_email);
        setRowMsg(p => ({ ...p, [inv.id]: { kind: 'ok', text: `Enviada a ${inv.customer_email || r.guest_email}` } }));
      } catch (err: unknown) {
        setRowMsg(p => ({ ...p, [inv.id]: { kind: 'error', text: err instanceof Error ? err.message : 'Error al enviar' } }));
      } finally { setBusyId(null); }
    });
  };

  const handleCancel = (inv: StoredInvoice) => {
    if (!inv.facturapi_id) return;
    setBusyId(inv.id);
    startTransition(async () => {
      try {
        await cancelInvoiceAction({ invoice_id: inv.id, facturapi_id: inv.facturapi_id!, motive: cancelMotive });
        setCancelling(null);
        router.refresh();
      } catch (err: unknown) {
        setRowMsg(p => ({ ...p, [inv.id]: { kind: 'error', text: err instanceof Error ? err.message : 'Error al cancelar' } }));
      } finally { setBusyId(null); }
    });
  };

  // ── Estilos (los mismos tokens que el resto de la ficha) ─────────────────

  const sectionStyle: React.CSSProperties = { background: '#fff', border: '1px solid #e8e4de', borderRadius: '14px', padding: '22px 24px' };
  const titleStyle: React.CSSProperties = { margin: '0 0 14px', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#856d47' };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.84rem', outline: 'none', boxSizing: 'border-box', background: '#fafaf8' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.68rem', fontWeight: 600, color: 'rgba(15,15,15,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '5px' };
  const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' };
  const pillBtn = (color: string): React.CSSProperties => ({ padding: '5px 10px', borderRadius: '6px', border: `1px solid ${color}`, color, background: 'transparent', fontSize: '0.72rem', fontWeight: 600, textDecoration: 'none', cursor: 'pointer' });

  if (!configured) {
    return (
      <div style={sectionStyle}>
        <p style={titleStyle}>Facturación SAT (CFDI 4.0)</p>
        <div style={{ background: '#fff8e1', border: '1px solid #f39c1230', borderRadius: '10px', padding: '14px 16px', fontSize: '0.82rem', color: '#856d47', lineHeight: 1.6 }}>
          <strong>Configuración pendiente.</strong> Falta la variable de entorno{' '}
          <code style={{ background: '#f5f3ef', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>FACTURAPI_SECRET_KEY</code>.
        </div>
      </div>
    );
  }

  return (
    <div style={sectionStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
        <p style={{ ...titleStyle, marginBottom: 0 }}>Facturación SAT (CFDI 4.0)</p>
        {!showForm && nightsLeft > 0 && (
          <button onClick={() => setShowForm(true)} style={{ ...pillBtn('#856d47'), padding: '6px 14px', fontSize: '0.78rem' }}>
            + Facturar parcialidad
          </button>
        )}
      </div>

      {testMode && (
        <div style={{ background: '#fff8e1', border: '1px solid #f39c1250', borderRadius: '8px', padding: '8px 12px', fontSize: '0.75rem', color: '#856d47', marginBottom: '12px', fontWeight: 600 }}>
          MODO PRUEBA — se usa la llave <code>sk_test_</code>. Nada de lo que emitas aquí es válido ante el SAT.
        </div>
      )}

      {/* Cuánto llevas facturado */}
      <div style={{ fontSize: '0.76rem', color: '#6b6b6b', marginBottom: '14px' }}>
        Facturado <strong>{nightsInvoiced}</strong> de <strong>{r.nights}</strong> noches ·{' '}
        {nightsLeft > 0
          ? <>quedan <strong>{nightsLeft}</strong> por facturar</>
          : <span style={{ color: '#27ae60', fontWeight: 700 }}>reservación facturada por completo</span>}
      </div>

      {notice && <div style={{ background: '#eafaf1', border: '1px solid #27ae6040', borderRadius: '8px', padding: '10px 12px', fontSize: '0.78rem', color: '#1e8449', marginBottom: '12px' }}>{notice}</div>}

      {/* Facturas emitidas */}
      {existingInvoices.length > 0 && (
        <div style={{ marginBottom: showForm ? '20px' : 0 }}>
          {existingInvoices.map(inv => {
            const cancelled = inv.status === 'canceled';
            const failed = inv.status === 'failed';
            return (
              <div key={inv.id} style={{ padding: '12px 14px', borderRadius: '8px', background: cancelled || failed ? '#faf5f5' : inv.test_mode ? '#fffdf5' : '#f5f3ef', border: inv.test_mode ? '1px dashed #d4a017' : 'none', marginBottom: '8px', opacity: cancelled || failed ? 0.75 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1a1a1a' }}>
                      {inv.test_mode && (
                        <span style={{ background: '#d4a017', color: '#fff', padding: '1px 6px', borderRadius: 4, fontSize: '0.62rem', letterSpacing: '0.06em', marginRight: 8 }}>
                          PRUEBA
                        </span>
                      )}
                      {inv.series}{inv.folio_number} · {inv.customer_rfc} — {inv.customer_name}
                      {cancelled && <span style={{ color: '#c62828', marginLeft: 8 }}>CANCELADA</span>}
                      {failed && <span style={{ color: '#c62828', marginLeft: 8 }}>NO SE TIMBRÓ</span>}
                    </div>
                    {inv.test_mode && (
                      <div style={{ fontSize: '0.68rem', color: '#8a6d1f', marginTop: '2px' }}>
                        Sin validez ante el SAT · no cuenta para el avance de facturación
                      </div>
                    )}
                    {inv.period_start && (
                      <div style={{ fontSize: '0.7rem', color: '#777', marginTop: '2px' }}>
                        {inv.nights} noche(s) · {inv.period_start} al {inv.period_end}
                      </div>
                    )}
                    <div style={{ fontSize: '0.66rem', color: '#999', fontFamily: 'monospace', marginTop: '2px' }}>
                      {inv.folio_fiscal || inv.facturapi_id || '—'}
                    </div>
                    {failed && inv.error_message && (
                      <div style={{ fontSize: '0.7rem', color: '#c62828', marginTop: '4px' }}>{inv.error_message}</div>
                    )}
                  </div>
                  {!failed && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <a href={`/api/admin/invoices/${inv.facturapi_id}/pdf`} target="_blank" rel="noreferrer" style={pillBtn('#c62828')}>PDF</a>
                      <a href={`/api/admin/invoices/${inv.facturapi_id}/xml`} style={pillBtn('#2980b9')}>XML</a>
                      {!cancelled && (
                        <>
                          <button onClick={() => handleSendEmail(inv)} disabled={busyId === inv.id} style={pillBtn('#27ae60')}>
                            {busyId === inv.id ? '…' : 'Enviar'}
                          </button>
                          <button onClick={() => setCancelling(cancelling === inv.id ? null : inv.id)} style={pillBtn('#96603a')}>
                            Cancelar
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Desglose fiscal de la factura */}
                {!failed && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e4ded2', fontSize: '0.72rem', color: '#5c4a2e', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                    <span>Subtotal ${money(inv.subtotal_mxn)}</span>
                    <span>IVA ${money(inv.iva_mxn)}</span>
                    {num(inv.ish_mxn) > 0 && <span>ISH ${money(inv.ish_mxn)}</span>}
                    {num(inv.ret_isr_mxn) > 0 && <span>Ret. ISR −${money(inv.ret_isr_mxn)}</span>}
                    <strong>Total ${money(inv.total_mxn)}</strong>
                  </div>
                )}

                {/* Confirmación de cancelación */}
                {cancelling === inv.id && (
                  <div style={{ marginTop: '10px', padding: '12px', borderRadius: '8px', background: '#fff', border: '1px solid #c6282840' }}>
                    <p style={{ margin: '0 0 8px', fontSize: '0.76rem', color: '#c62828', fontWeight: 600 }}>
                      Cancelar ante el SAT es irreversible. Elige el motivo:
                    </p>
                    <select value={cancelMotive} onChange={e => setCancelMotive(e.target.value)} style={{ ...inputStyle, marginBottom: '10px' }}>
                      {MOTIVOS_CANCELACION.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleCancel(inv)} disabled={busyId === inv.id || cancelMotive === '01'} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: cancelMotive === '01' ? '#ccc' : '#c62828', color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: cancelMotive === '01' ? 'not-allowed' : 'pointer' }}>
                        {busyId === inv.id ? 'Cancelando…' : 'Sí, cancelar'}
                      </button>
                      <button onClick={() => setCancelling(null)} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #e0dbd4', background: '#fff', fontSize: '0.78rem', cursor: 'pointer' }}>
                        No
                      </button>
                    </div>
                    {cancelMotive === '01' && (
                      <p style={{ margin: '8px 0 0', fontSize: '0.7rem', color: '#856d47' }}>
                        El motivo 01 requiere emitir primero el CFDI que la sustituye. Usa el 02 si solo hubo un error.
                      </p>
                    )}
                  </div>
                )}

                {rowMsg[inv.id] && (
                  <div style={{ fontSize: '0.7rem', marginTop: '6px', color: rowMsg[inv.id].kind === 'ok' ? '#27ae60' : '#c62828' }}>
                    {rowMsg[inv.id].text}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {existingInvoices.length === 0 && !showForm && (
        <p style={{ fontSize: '0.78rem', color: '#aaa', margin: 0 }}>Sin facturas emitidas para esta reservación.</p>
      )}

      {/* Formulario */}
      {showForm && (
        <form onSubmit={handleCreate}>
          {/* Tramo */}
          <div style={{ background: '#fafaf8', border: '1px solid #e8e4de', borderRadius: '10px', padding: '18px', marginBottom: '14px' }}>
            <p style={{ margin: '0 0 14px', fontSize: '0.72rem', fontWeight: 700, color: '#856d47', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Periodo a facturar
            </p>
            <div style={gridStyle}>
              <div>
                <label style={labelStyle}>Desde</label>
                <input type="date" style={inputStyle} value={form.period_start} onChange={e => set('period_start', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Hasta</label>
                <input type="date" style={inputStyle} value={form.period_end} onChange={e => set('period_end', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Tarifa por noche (sin impuestos)</label>
                <input type="number" min="1" step="0.01" style={inputStyle} value={form.base_rate} onChange={e => set('base_rate', e.target.value)} />
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '0.74rem', color: '#856d47' }}>
              {nights > 0 ? `${nights} noche${nights !== 1 ? 's' : ''}` : 'Captura el periodo'} · quedan {nightsLeft} por facturar
            </p>
          </div>

          {/* Receptor */}
          <div style={{ background: '#fafaf8', border: '1px solid #e8e4de', borderRadius: '10px', padding: '18px', marginBottom: '14px' }}>
            <p style={{ margin: '0 0 14px', fontSize: '0.72rem', fontWeight: 700, color: '#856d47', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Datos del receptor
            </p>
            <div style={gridStyle}>
              <div>
                <label style={labelStyle}>RFC</label>
                <input required style={inputStyle} value={form.customer_rfc} placeholder="SAO030421M70"
                  onChange={e => set('customer_rfc', e.target.value.toUpperCase().replace(/\s/g, ''))} />
              </div>
              <div>
                <label style={labelStyle}>Razón social</label>
                <input required style={inputStyle} value={form.customer_name}
                  onChange={e => set('customer_name', e.target.value.toUpperCase())} />
              </div>
            </div>
            <div style={gridStyle}>
              <div>
                <label style={labelStyle}>Régimen fiscal</label>
                <select required style={inputStyle} value={form.customer_tax_system} onChange={e => set('customer_tax_system', e.target.value)}>
                  {REGIMENES_FISCALES.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>CP del receptor</label>
                <input required inputMode="numeric" maxLength={5} style={inputStyle} value={form.customer_zip}
                  onChange={e => set('customer_zip', e.target.value.replace(/\D/g, ''))} placeholder="83165" />
              </div>
            </div>
            <div style={gridStyle}>
              <div>
                <label style={labelStyle}>Correo</label>
                <input type="email" required style={inputStyle} value={form.customer_email} onChange={e => set('customer_email', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Uso CFDI</label>
                <select required style={inputStyle} value={form.uso_cfdi} onChange={e => set('uso_cfdi', e.target.value)}>
                  {USOS_CFDI.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ ...gridStyle, marginBottom: 0 }}>
              <div>
                <label style={labelStyle}>Forma de pago</label>
                <select required style={inputStyle} value={form.payment_form} onChange={e => set('payment_form', e.target.value)}>
                  {FORMAS_PAGO_SAT.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Método de pago</label>
                <select required style={inputStyle} value={form.payment_method_sat} onChange={e => set('payment_method_sat', e.target.value)}>
                  <option value="PUE">PUE — Pago en una sola exhibición</option>
                  <option value="PPD">PPD — Pago en parcialidades o diferido</option>
                </select>
              </div>
            </div>
          </div>

          {/* Desglose en vivo — el número que debe cuadrar con la terminal */}
          <div style={{ background: '#f5f3ef', borderRadius: '10px', padding: '14px 16px', marginBottom: '14px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', color: '#5c4a2e' }}>
              <tbody>
                <tr>
                  <td style={{ paddingBottom: 4 }}>Hospedaje — {nights} noche(s) × ${money(baseRate)}</td>
                  <td style={{ paddingBottom: 4, textAlign: 'right' }}>${money(breakdown.subtotal)}</td>
                </tr>
                <tr>
                  <td style={{ paddingBottom: 4 }}>IVA {(fiscal.ivaRate * 100).toFixed(0)}%</td>
                  <td style={{ paddingBottom: 4, textAlign: 'right' }}>${money(breakdown.iva)}</td>
                </tr>
                <tr>
                  <td style={{ paddingBottom: 4 }}>ISH {(fiscal.ishRate * 100).toFixed(0)}% (impuesto estatal)</td>
                  <td style={{ paddingBottom: 4, textAlign: 'right' }}>${money(breakdown.ish)}</td>
                </tr>
                {/* La retención SIEMPRE se muestra, aplique o no. Si solo apareciera
                    cuando aplica, el total saltaría $225 al terminar de escribir el
                    RFC sin que nada lo explique. */}
                <tr>
                  <td style={{ paddingBottom: 4, color: withholding ? '#c62828' : '#a09786' }}>
                    Retención ISR {(fiscal.retIsrRate * 100).toFixed(2)}%
                    {withholding
                      ? ' — receptor persona moral (Art. 113-J LISR)'
                      : form.customer_rfc.length === 0
                        ? ' — captura el RFC del receptor'
                        : form.customer_rfc.length === 13
                          ? ' — no aplica, el receptor es persona física'
                          : ' — RFC incompleto'}
                  </td>
                  <td style={{ paddingBottom: 4, textAlign: 'right', color: withholding ? '#c62828' : '#a09786' }}>
                    {withholding ? `−$${money(breakdown.retIsr)}` : '$0.00'}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td style={{ borderTop: '1px solid #d4c9b5', paddingTop: 6, fontWeight: 700 }}>Total del CFDI</td>
                  <td style={{ borderTop: '1px solid #d4c9b5', paddingTop: 6, textAlign: 'right', fontWeight: 700, fontSize: '0.95rem' }}>
                    ${money(breakdown.total)} MXN
                  </td>
                </tr>
              </tfoot>
            </table>
            <p style={{ margin: '10px 0 0', fontSize: '0.7rem', color: '#856d47' }}>
              Confirma que este total coincide con lo que cobraste antes de timbrar.
            </p>
          </div>

          {problems.length > 0 && (
            <ul style={{ margin: '0 0 12px', paddingLeft: 18, color: '#96603a', fontSize: '0.76rem' }}>
              {problems.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          )}
          {error && <p style={{ color: '#c0392b', fontSize: '0.8rem', marginBottom: 10, whiteSpace: 'pre-line' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" disabled={!canSubmit} style={{
              padding: '10px 22px', borderRadius: '8px', border: 'none',
              background: canSubmit ? '#856d47' : '#ccc', color: '#fff',
              fontSize: '0.83rem', fontWeight: 700, cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}>
              {isPending ? 'Timbrando…' : `Emitir factura por $${money(breakdown.total)}`}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setError(''); }} style={{
              padding: '10px 16px', borderRadius: '8px', border: '1px solid #e0dbd4',
              background: '#fff', color: '#6b6b6b', fontSize: '0.83rem', cursor: 'pointer',
            }}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
