'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { compressToWebP } from '@/app/lib/compress';
import { host, hostJson, pesos } from '../../hospedajes/host';
import { C, card, eyebrow, h1, h2, muted, Button, Field, TextInput, TextArea, Select, Badge, Banner, Spinner, BackLink } from '../../hospedajes/ui';
import { EVENT_CATEGORIES, EVENT_STATUS_LABEL, isoToLocal, localToISO, uploadEventCover, type EventDetail, type EventsResponse } from '../events';

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [ev, setEv] = useState<EventDetail | null>(null);
  const [tickets, setTickets] = useState<EventsResponse['events'][number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Campos editables
  const [f, setF] = useState({ name: '', category: '', venueName: '', venueAddress: '', startsLocal: '', endsLocal: '', description: '', cover: '', feeMode: 'absorb' });
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  const load = useCallback(async () => {
    setError('');
    try {
      const [detail, list] = await Promise.all([
        host<{ event: EventDetail }>(`organizer/events/${id}`),
        host<EventsResponse>('organizer/events').catch(() => ({ events: [], totals: { sold: 0, revenue_cents: 0, validated: 0 } })),
      ]);
      const e = detail.event;
      setEv(e);
      setTickets(list.events.find((x) => x.id === id) ?? null);
      setF({
        name: e.name, category: e.category ?? '', venueName: e.venue_name, venueAddress: e.venue_address ?? '',
        startsLocal: isoToLocal(e.starts_at), endsLocal: isoToLocal(e.ends_at),
        description: e.description ?? '', cover: e.cover_image_url ?? '', feeMode: e.fee_mode || 'absorb',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el evento.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  async function handleCover(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const blob = await compressToWebP(file).catch(() => file);
      const img = blob instanceof File ? blob : new File([blob], 'cover.webp', { type: 'image/webp' });
      set('cover', await uploadEventCover(img));
    } catch (e) {
      setMsg({ tone: 'error', text: e instanceof Error ? e.message : 'No se pudo subir.' });
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (localToISO(f.endsLocal) <= localToISO(f.startsLocal)) { setMsg({ tone: 'error', text: 'El fin debe ser posterior al inicio.' }); return; }
    setSaving(true); setMsg(null);
    try {
      await hostJson(`organizer/events/${id}`, 'PATCH', {
        name: f.name.trim(), category: f.category || null, venue_name: f.venueName.trim(),
        venue_address: f.venueAddress.trim() || null, description: f.description.trim() || null,
        cover_image_url: f.cover || null, fee_mode: f.feeMode,
        starts_at: localToISO(f.startsLocal), ends_at: localToISO(f.endsLocal),
      });
      setMsg({ tone: 'success', text: 'Evento guardado.' });
      await load();
    } catch (e) {
      setMsg({ tone: 'error', text: e instanceof Error ? e.message : 'No se pudo guardar.' });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const sold = tickets?.stats.sold ?? 0;
    const confirmMsg = sold > 0
      ? `Este evento tiene ${sold} boleto(s) vendido(s). Al eliminarlo se CANCELA y se reembolsa a los compradores. ¿Continuar?`
      : '¿Eliminar este evento?';
    if (!window.confirm(confirmMsg)) return;
    setDeleting(true); setMsg(null);
    try {
      const res = await host<{ deleted: boolean; cancelled: boolean; refunded: number }>(`organizer/events/${id}`, { method: 'DELETE' });
      if (res.cancelled) {
        setMsg({ tone: 'success', text: `Evento cancelado y ${res.refunded} reembolso(s) emitido(s).` });
        await load();
      } else {
        router.push('/mi-negocio/eventos');
      }
    } catch (e) {
      setMsg({ tone: 'error', text: e instanceof Error ? e.message : 'No se pudo eliminar.' });
      setDeleting(false);
    }
  }

  if (loading) return <Spinner label="Cargando evento…" />;
  if (error || !ev) {
    return (<><BackLink href="/mi-negocio/eventos">Mis eventos</BackLink><Banner tone="error">{error || 'Evento no encontrado.'}</Banner></>);
  }

  return (
    <>
      <BackLink href="/mi-negocio/eventos">Mis eventos</BackLink>
      <div style={{ marginBottom: '1.25rem' }}>
        <p style={eyebrow}>Evento</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <h1 style={{ ...h1, margin: 0 }}>{ev.name}</h1>
          <Badge color={ev.status === 'published' ? '#2a7a4f' : 'rgba(0,0,0,0.5)'} bg={ev.status === 'published' ? 'rgba(42,122,79,0.1)' : 'rgba(0,0,0,0.06)'}>
            {EVENT_STATUS_LABEL[ev.status] ?? ev.status}
          </Badge>
        </div>
      </div>

      {msg && <Banner tone={msg.tone}>{msg.text}</Banner>}

      {/* Boletos vendidos (solo lectura) */}
      {tickets && tickets.ticket_types.length > 0 && (
        <div style={{ ...card, marginBottom: '1.25rem' }}>
          <h2 style={{ ...h2, fontSize: '1.05rem', marginBottom: '0.75rem' }}>Ventas</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {tickets.ticket_types.map((t) => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: C.sans, fontSize: '0.82rem', color: C.ink }}>
                <span>{t.name} · {pesos(t.price_cents)}</span>
                <span style={{ color: 'rgba(0,0,0,0.55)' }}>{t.quantity_sold} / {t.quantity_total}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', marginTop: 4, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontFamily: C.sans, fontSize: '0.82rem' }}>
              <span style={{ color: 'rgba(0,0,0,0.5)' }}>Ingresos</span>
              <strong>{pesos(tickets.stats.revenue_cents)}</strong>
            </div>
          </div>
          <p style={{ ...muted, fontSize: '0.7rem', marginTop: 8 }}>Los tipos de boleto se definen al crear el evento y no se editan aquí.</p>
        </div>
      )}

      {/* Editar metadatos */}
      <div style={{ ...card, marginBottom: '1.25rem' }}>
        <Field label="Nombre"><TextInput value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Categoría">
          <Select value={f.category} onChange={(e) => set('category', e.target.value)}>
            <option value="">Sin categoría</option>
            {EVENT_CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Field label="Inicio"><TextInput type="datetime-local" value={f.startsLocal} onChange={(e) => set('startsLocal', e.target.value)} /></Field>
          <Field label="Fin"><TextInput type="datetime-local" value={f.endsLocal} onChange={(e) => set('endsLocal', e.target.value)} /></Field>
        </div>
        <Field label="Lugar"><TextInput value={f.venueName} onChange={(e) => set('venueName', e.target.value)} /></Field>
        <Field label="Dirección"><TextInput value={f.venueAddress} onChange={(e) => set('venueAddress', e.target.value)} /></Field>
        <Field label="Descripción"><TextArea value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
        <Field label="Portada">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {f.cover && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.cover} alt="" style={{ width: 120, height: 68, objectFit: 'cover', borderRadius: 10 }} />
            )}
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? 'Subiendo…' : f.cover ? 'Cambiar' : 'Subir'}
            </Button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => handleCover(e.target.files?.[0])} />
          </div>
        </Field>
        <Field label="Comisión de Santiapp">
          <Select value={f.feeMode} onChange={(e) => set('feeMode', e.target.value)}>
            <option value="absorb">Absorber (la pago yo)</option>
            <option value="pass">Trasladar al comprador</option>
          </Select>
        </Field>
        <Button onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</Button>
      </div>

      {/* Zona peligro */}
      <div style={{ ...card, borderColor: 'rgba(176,57,42,0.2)' }}>
        <h2 style={{ ...h2, fontSize: '1rem', marginBottom: '0.4rem' }}>Eliminar evento</h2>
        <p style={{ ...muted, marginBottom: '0.9rem' }}>Si hay boletos vendidos, se cancela y se reembolsa automáticamente a los compradores.</p>
        <Button variant="danger" onClick={remove} disabled={deleting}>{deleting ? 'Procesando…' : 'Eliminar evento'}</Button>
      </div>
    </>
  );
}
