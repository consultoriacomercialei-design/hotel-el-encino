'use client';

import { useState, useTransition } from 'react';
import { searchCalendarEventsAction, deleteCalendarEventByIdAction } from './actions';

interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  description?: string;
}

export default function CalendarCleanupTool() {
  const [query, setQuery] = useState('');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setError('');
    setEvents([]);
    setSearched(false);
    startTransition(async () => {
      const res = await searchCalendarEventsAction(query.trim());
      if (res.ok) {
        setEvents(res.events);
        setSearched(true);
      } else {
        setError(res.error ?? 'Error al buscar en Google Calendar');
      }
    });
  };

  const handleDelete = (eventId: string) => {
    setDeletingId(eventId);
    startTransition(async () => {
      const res = await deleteCalendarEventByIdAction(eventId);
      if (res.ok) {
        setDeletedIds(prev => new Set([...prev, eventId]));
      } else {
        setError(res.error ?? 'Error al eliminar el evento');
      }
      setDeletingId(null);
    });
  };

  const visibleEvents = events.filter(ev => !deletedIds.has(ev.id));

  return (
    <div style={{
      background: '#fff', border: '1px solid #e8e4de', borderRadius: '14px',
      padding: '20px 22px', marginTop: '28px',
    }}>
      <p style={{ margin: '0 0 4px', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#856d47' }}>
        Herramientas de calendario
      </p>
      <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: '#6b6b6b', lineHeight: 1.5 }}>
        Busca eventos en Google Calendar por folio o nombre. Elige cuál borrar — no se elimina nada automáticamente.
      </p>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: '220px' }}>
          <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 600, color: 'rgba(15,15,15,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '5px' }}>
            Buscar en Google Calendar
          </label>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="RSV-36 o nombre del huésped"
            required
            style={{
              width: '100%', padding: '9px 12px', borderRadius: '8px',
              border: '1px solid #ddd', fontSize: '0.84rem',
              boxSizing: 'border-box', background: '#fafaf8',
            }}
          />
        </div>
        <button
          type="submit"
          disabled={isPending || !query.trim()}
          style={{
            padding: '9px 18px', borderRadius: '8px', border: 'none',
            background: isPending ? '#ccc' : '#856d47', color: '#fff',
            fontSize: '0.82rem', fontWeight: 600,
            cursor: isPending || !query.trim() ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {isPending && !deletingId ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      {error && (
        <p style={{ marginTop: '12px', fontSize: '0.8rem', color: '#c62828', background: '#ffebee', borderRadius: '8px', padding: '10px 14px' }}>
          ✗ {error}
        </p>
      )}

      {searched && visibleEvents.length === 0 && (
        <p style={{ marginTop: '14px', fontSize: '0.8rem', color: '#2e7d32', background: '#e8f5e9', borderRadius: '8px', padding: '10px 14px' }}>
          ✓ No se encontraron eventos con ese texto en Google Calendar.
        </p>
      )}

      {visibleEvents.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <p style={{ margin: '0 0 10px', fontSize: '0.72rem', fontWeight: 700, color: '#856d47', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {visibleEvents.length} evento{visibleEvents.length !== 1 ? 's' : ''} encontrado{visibleEvents.length !== 1 ? 's' : ''}
          </p>
          {visibleEvents.map(ev => (
            <div key={ev.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 14px', borderRadius: '8px', background: '#f5f3ef',
              marginBottom: '8px', gap: '12px', flexWrap: 'wrap',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1a1a1a', marginBottom: '2px' }}>
                  {ev.summary}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#888' }}>
                  {ev.start}{ev.end && ev.end !== ev.start ? ` → ${ev.end}` : ''}
                </div>
                {ev.description && (
                  <div style={{ fontSize: '0.68rem', color: '#aaa', marginTop: '2px', whiteSpace: 'pre-wrap', maxHeight: '48px', overflow: 'hidden' }}>
                    {ev.description.slice(0, 120)}{ev.description.length > 120 ? '…' : ''}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleDelete(ev.id)}
                disabled={deletingId === ev.id}
                style={{
                  padding: '6px 14px', borderRadius: '6px', border: '1px solid #c62828',
                  background: 'transparent', color: '#c62828', fontSize: '0.75rem',
                  fontWeight: 600, cursor: deletingId === ev.id ? 'not-allowed' : 'pointer',
                  opacity: deletingId === ev.id ? 0.5 : 1, whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                {deletingId === ev.id ? 'Eliminando…' : 'Eliminar este evento'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
