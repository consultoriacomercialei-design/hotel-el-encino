'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createInvoiceAction,
  sendInvoiceEmailAction,
  type StoredInvoice,
} from '../../invoice-actions';
import { USOS_CFDI, REGIMENES_FISCALES } from '@/app/lib/facturapi';

interface LineItem {
  description: string;
  amount: number;
  date?: string;
  nights?: number;
}

interface Props {
  reservation: {
    id: string;
    folio: string;
    guest_name: string;
    guest_email: string;
    check_in: string;
    nights: number;
    total_mxn: number;
    payment_method: string;
    line_items?: LineItem[];
  };
  existingInvoices: StoredInvoice[];
  configured: boolean;
}

const PUBLICO_GENERAL = {
  rfc:        'XAXX010101000',
  name:       'PUBLICO EN GENERAL',
  taxSystem:  '616',
  zip:        '',
  usoCfdi:    'S01',
};

export default function InvoiceSection({ reservation: r, existingInvoices, configured }: Props) {
  const router   = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm]      = useState(false);
  const [error, setError]            = useState('');
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [emailStatus, setEmailStatus]  = useState<Record<string, 'ok' | 'error'>>({});
  const [emailMsg, setEmailMsg]        = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    customer_rfc:        PUBLICO_GENERAL.rfc,
    customer_name:       PUBLICO_GENERAL.name,
    customer_tax_system: PUBLICO_GENERAL.taxSystem,
    customer_zip:        PUBLICO_GENERAL.zip,
    customer_email:      r.guest_email,
    uso_cfdi:            PUBLICO_GENERAL.usoCfdi,
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const isPublicoGeneral = form.customer_rfc.toUpperCase() === 'XAXX010101000';

  // RFC validation: persona moral 12 chars, física 13 chars
  const RFC_RE = /^([A-ZÑ&]{3,4})(\d{6})([A-Z\d]{3})$/;
  const rfcIsValid = isPublicoGeneral || RFC_RE.test(form.customer_rfc.toUpperCase());

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPublicoGeneral && !rfcIsValid) {
      setError('RFC inválido. Debe tener 12 o 13 caracteres (ej: XAXX010101000 o MELM8504216Y3).'); return;
    }
    if (!form.customer_zip && !isPublicoGeneral) {
      setError('El código postal del receptor es requerido para CFDI 4.0'); return;
    }
    setError('');
    startTransition(async () => {
      try {
        const result = await createInvoiceAction({
          reservation_id:      r.id,
          folio:               r.folio,
          check_in:            r.check_in,
          nights:              r.nights,
          total_mxn:           r.total_mxn,
          payment_method:      r.payment_method,
          guest_email:         r.guest_email,
          customer_rfc:        form.customer_rfc,
          customer_name:       form.customer_name,
          customer_tax_system: form.customer_tax_system,
          customer_zip:        isPublicoGeneral ? '00000' : form.customer_zip,
          customer_email:      form.customer_email,
          uso_cfdi:            form.uso_cfdi,
          // Partidas detalladas (solo si existen en la reservación)
          line_items:          r.line_items && r.line_items.length > 0 ? r.line_items : undefined,
        });
        if (result.ok) {
          setShowForm(false);
          router.refresh();
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error al generar factura');
      }
    });
  };

  const handleSendEmail = (facturapi_id: string, email: string) => {
    setSendingEmail(facturapi_id);
    setEmailMsg(prev => ({ ...prev, [facturapi_id]: '' }));
    startTransition(async () => {
      try {
        await sendInvoiceEmailAction(facturapi_id, email);
        setEmailStatus(prev => ({ ...prev, [facturapi_id]: 'ok' }));
        setEmailMsg(prev => ({ ...prev, [facturapi_id]: `Factura enviada a ${email}` }));
      } catch (err: unknown) {
        setEmailStatus(prev => ({ ...prev, [facturapi_id]: 'error' }));
        setEmailMsg(prev => ({ ...prev, [facturapi_id]: err instanceof Error ? err.message : 'Error al enviar' }));
      } finally {
        setSendingEmail(null);
      }
    });
  };

  const sectionStyle: React.CSSProperties = {
    background: '#fff', border: '1px solid #e8e4de', borderRadius: '14px', padding: '22px 24px',
  };
  const titleStyle: React.CSSProperties = {
    margin: '0 0 14px', fontSize: '0.68rem', fontWeight: 700,
    letterSpacing: '0.12em', textTransform: 'uppercase', color: '#856d47',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: '8px',
    border: '1px solid #ddd', fontSize: '0.84rem', outline: 'none',
    boxSizing: 'border-box', background: '#fafaf8',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.68rem', fontWeight: 600,
    color: 'rgba(15,15,15,0.55)', letterSpacing: '0.08em',
    textTransform: 'uppercase', marginBottom: '5px',
  };

  if (!configured) {
    return (
      <div style={sectionStyle}>
        <p style={titleStyle}>Facturación SAT (CFDI 4.0)</p>
        <div style={{ background: '#fff8e1', border: '1px solid #f39c1230', borderRadius: '10px', padding: '14px 16px', fontSize: '0.82rem', color: '#856d47', lineHeight: 1.6 }}>
          <strong>Configuración pendiente.</strong> Para emitir CFDIs agrega la variable de entorno:
          <br />
          <code style={{ background: '#f5f3ef', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem' }}>FACTURAPI_SECRET_KEY</code>
          <br /><br />
          Crea tu cuenta en <strong>facturapi.io</strong>, sube tu CSD y obtén tu API key de producción.
        </div>
      </div>
    );
  }

  return (
    <div style={sectionStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <p style={{ ...titleStyle, marginBottom: 0 }}>Facturación SAT (CFDI 4.0)</p>
        {!showForm && (
          <button onClick={() => setShowForm(true)} style={{
            padding: '6px 14px', borderRadius: '8px', border: '1px solid #856d47',
            background: 'transparent', color: '#856d47', fontSize: '0.78rem',
            fontWeight: 600, cursor: 'pointer',
          }}>
            + Nueva factura
          </button>
        )}
      </div>

      {/* Facturas existentes */}
      {existingInvoices.length > 0 && (
        <div style={{ marginBottom: showForm ? '20px' : '0' }}>
          {existingInvoices.map(inv => (
            <div key={inv.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 12px', borderRadius: '8px', background: '#f5f3ef', marginBottom: '8px',
              flexWrap: 'wrap', gap: '8px',
            }}>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1a1a1a' }}>
                  {inv.customer_rfc} — {inv.customer_name}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#888', fontFamily: 'monospace', marginTop: '2px' }}>
                  {inv.folio_fiscal || inv.facturapi_id}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#888', marginTop: '1px' }}>
                  ${inv.total_mxn.toLocaleString('es-MX')} MXN · {new Date(inv.created_at).toLocaleDateString('es-MX')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <a
                  href={`/api/admin/invoices/${inv.facturapi_id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #c62828', color: '#c62828', fontSize: '0.72rem', fontWeight: 600, textDecoration: 'none' }}
                >
                  PDF
                </a>
                <a
                  href={`/api/admin/invoices/${inv.facturapi_id}/xml`}
                  style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #2980b9', color: '#2980b9', fontSize: '0.72rem', fontWeight: 600, textDecoration: 'none' }}
                >
                  XML
                </a>
                <button
                  onClick={() => handleSendEmail(inv.facturapi_id, r.guest_email)}
                  disabled={sendingEmail === inv.facturapi_id}
                  style={{
                    padding: '5px 10px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer',
                    background: 'transparent', fontSize: '0.72rem',
                    border: `1px solid ${emailStatus[inv.facturapi_id] === 'ok' ? '#27ae60' : emailStatus[inv.facturapi_id] === 'error' ? '#c62828' : '#27ae60'}`,
                    color: emailStatus[inv.facturapi_id] === 'ok' ? '#27ae60' : emailStatus[inv.facturapi_id] === 'error' ? '#c62828' : '#27ae60',
                    opacity: sendingEmail === inv.facturapi_id ? 0.5 : 1,
                  }}
                >
                  {sendingEmail === inv.facturapi_id ? '…' : emailStatus[inv.facturapi_id] === 'ok' ? '✓ Enviado' : emailStatus[inv.facturapi_id] === 'error' ? '✗ Error' : 'Enviar'}
                </button>
              </div>
              {emailMsg[inv.facturapi_id] && (
                <div style={{ width: '100%', fontSize: '0.7rem', color: emailStatus[inv.facturapi_id] === 'ok' ? '#27ae60' : '#c62828', paddingTop: '4px' }}>
                  {emailMsg[inv.facturapi_id]}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {existingInvoices.length === 0 && !showForm && (
        <p style={{ fontSize: '0.78rem', color: '#aaa', margin: 0 }}>Sin facturas emitidas para esta reservación.</p>
      )}

      {/* Formulario nueva factura */}
      {showForm && (
        <form onSubmit={handleCreate}>
          <div style={{ background: '#fafaf8', border: '1px solid #e8e4de', borderRadius: '10px', padding: '18px', marginBottom: '14px' }}>
            <p style={{ margin: '0 0 14px', fontSize: '0.72rem', fontWeight: 700, color: '#856d47', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Datos del receptor
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>RFC receptor</label>
                <input
                  required
                  style={{
                    ...inputStyle,
                    borderColor: !isPublicoGeneral && form.customer_rfc.length > 0 && !rfcIsValid ? '#c62828' : '#ddd',
                  }}
                  value={form.customer_rfc}
                  onChange={e => {
                    const v = e.target.value.toUpperCase();
                    set('customer_rfc', v);
                    if (v === 'XAXX010101000') {
                      set('customer_name', PUBLICO_GENERAL.name);
                      set('customer_tax_system', PUBLICO_GENERAL.taxSystem);
                      set('uso_cfdi', PUBLICO_GENERAL.usoCfdi);
                    }
                  }}
                  placeholder="XAXX010101000"
                />
                {!isPublicoGeneral && form.customer_rfc.length > 0 && !rfcIsValid && (
                  <p style={{ margin: '3px 0 0', fontSize: '0.68rem', color: '#c62828' }}>
                    RFC incompleto o con formato incorrecto
                  </p>
                )}
              </div>
              <div>
                <label style={labelStyle}>Razón social</label>
                <input required style={inputStyle} value={form.customer_name} onChange={e => set('customer_name', e.target.value.toUpperCase())} placeholder="PUBLICO EN GENERAL" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>Régimen fiscal</label>
                <select required style={inputStyle} value={form.customer_tax_system} onChange={e => set('customer_tax_system', e.target.value)}>
                  {REGIMENES_FISCALES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>CP del receptor</label>
                <input
                  style={inputStyle} value={form.customer_zip}
                  onChange={e => set('customer_zip', e.target.value)}
                  placeholder={isPublicoGeneral ? '00000 (auto)' : 'Requerido CFDI 4.0'}
                  disabled={isPublicoGeneral}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Email receptor</label>
                <input type="email" required style={inputStyle} value={form.customer_email} onChange={e => set('customer_email', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Uso CFDI</label>
                <select required style={inputStyle} value={form.uso_cfdi} onChange={e => set('uso_cfdi', e.target.value)}>
                  {USOS_CFDI.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Desglose de conceptos a facturar */}
          <div style={{ background: '#f5f3ef', borderRadius: '8px', padding: '12px 14px', fontSize: '0.78rem', color: '#856d47', marginBottom: '14px' }}>
            {r.line_items && r.line_items.length > 0 ? (
              <>
                <div style={{ fontWeight: 700, marginBottom: '8px' }}>
                  Conceptos a incluir en el CFDI — {r.folio}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                  <tbody>
                    {r.line_items.map((item, i) => (
                      <tr key={i}>
                        <td style={{ paddingBottom: '4px', color: '#5c4a2e' }}>{item.description}</td>
                        <td style={{ paddingBottom: '4px', textAlign: 'right', whiteSpace: 'nowrap', color: '#5c4a2e' }}>${item.amount.toLocaleString('es-MX')} MXN</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td style={{ borderTop: '1px solid #d4c9b5', paddingTop: '6px', fontWeight: 700 }}>Total (IVA 16% incluido)</td>
                      <td style={{ borderTop: '1px solid #d4c9b5', paddingTop: '6px', textAlign: 'right', fontWeight: 700 }}>${r.total_mxn.toLocaleString('es-MX')} MXN</td>
                    </tr>
                  </tfoot>
                </table>
              </>
            ) : (
              <>Monto a facturar: <strong>${r.total_mxn.toLocaleString('es-MX')} MXN</strong> (IVA 16% incluido) · Folio {r.folio}</>
            )}
          </div>

          {error && <p style={{ color: '#c0392b', fontSize: '0.8rem', marginBottom: '10px' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" disabled={isPending} style={{
              padding: '10px 22px', borderRadius: '8px', border: 'none',
              background: isPending ? '#ccc' : '#856d47', color: '#fff',
              fontSize: '0.83rem', fontWeight: 700, cursor: isPending ? 'not-allowed' : 'pointer',
            }}>
              {isPending ? 'Generando CFDI…' : 'Emitir factura'}
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
