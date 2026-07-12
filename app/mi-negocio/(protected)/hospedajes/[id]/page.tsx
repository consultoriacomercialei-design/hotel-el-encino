'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { host, type LodgingDetail, type RoomSummary, STATUS_LABEL } from '../host';
import { C, eyebrow, h1, Badge, Banner, Spinner, BackLink } from '../ui';
import EditLodging from './EditLodging';
import RoomsList from './RoomsList';
import TapeChart from './TapeChart';
import Reservations from './Reservations';

type Tab = 'datos' | 'habitaciones' | 'calendario' | 'reservas';
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'datos', label: 'Datos' },
  { id: 'habitaciones', label: 'Habitaciones' },
  { id: 'calendario', label: 'Calendario' },
  { id: 'reservas', label: 'Reservas' },
];

export default function ManageLodgingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [lodging, setLodging] = useState<LodgingDetail | null>(null);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [tab, setTab] = useState<Tab>('datos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await host<{ lodging: LodgingDetail; rooms: RoomSummary[] }>(`organizer/lodgings/${id}`);
      setLodging(data.lodging);
      setRooms(data.rooms ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el hospedaje.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <Spinner label="Cargando hospedaje…" />;
  if (error || !lodging) {
    return (
      <>
        <BackLink href="/mi-negocio/hospedajes">Mis hospedajes</BackLink>
        <Banner tone="error">{error || 'Hospedaje no encontrado.'}</Banner>
      </>
    );
  }

  return (
    <>
      <BackLink href="/mi-negocio/hospedajes">Mis hospedajes</BackLink>
      <div style={{ marginBottom: '1.25rem' }}>
        <p style={eyebrow}>Hospedaje</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <h1 style={{ ...h1, margin: 0 }}>{lodging.name}</h1>
          <Badge
            color={lodging.status === 'published' ? '#2a7a4f' : 'rgba(0,0,0,0.5)'}
            bg={lodging.status === 'published' ? 'rgba(42,122,79,0.1)' : 'rgba(0,0,0,0.06)'}
          >
            {STATUS_LABEL[lodging.status] ?? lodging.status}
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.08)', overflowX: 'auto' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              fontFamily: C.sans, fontSize: '0.8rem', padding: '10px 14px', cursor: 'pointer',
              background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.id ? C.forest : 'transparent'}`,
              color: tab === t.id ? (C.forest as string) : 'rgba(0,0,0,0.45)', fontWeight: tab === t.id ? 600 : 400,
              whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'datos' && <EditLodging lodging={lodging} onSaved={(l) => setLodging(l)} />}
      {tab === 'habitaciones' && <RoomsList lodgingId={id} rooms={rooms} onChanged={load} />}
      {tab === 'calendario' && <TapeChart lodgingId={id} />}
      {tab === 'reservas' && <Reservations lodgingId={id} rooms={rooms} />}
    </>
  );
}
