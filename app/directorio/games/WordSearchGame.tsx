'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/* ── Word list ── */
const WORDS = [
  'CASCADA', 'ENCINO', 'SIERRA', 'CABALLO', 'MATACANES',
  'FESTIVAL', 'CIELO', 'SANTIAGO', 'ROBLE', 'PRESA',
];

const GRID_SIZE = 11;

type Cell = { letter: string; wordIndex: number[] };

function buildGrid(): { grid: Cell[][]; placements: { word: string; cells: [number, number][] }[] } {
  const directions: [number, number][] = [[0,1],[1,0],[1,1],[0,-1],[-1,0],[-1,-1],[1,-1],[-1,1]];
  const empty: Cell[][] = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ({ letter: '', wordIndex: [] }))
  );
  const placements: { word: string; cells: [number, number][] }[] = [];

  for (const word of WORDS) {
    let placed = false;
    for (let attempt = 0; attempt < 200 && !placed; attempt++) {
      const [dr, dc] = directions[Math.floor(Math.random() * directions.length)];
      const r = Math.floor(Math.random() * GRID_SIZE);
      const c = Math.floor(Math.random() * GRID_SIZE);
      const cells: [number, number][] = [];
      let fits = true;
      for (let i = 0; i < word.length; i++) {
        const nr = r + dr * i, nc = c + dc * i;
        if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) { fits = false; break; }
        if (empty[nr][nc].letter && empty[nr][nc].letter !== word[i]) { fits = false; break; }
        cells.push([nr, nc]);
      }
      if (fits) {
        const wi = placements.length;
        for (let i = 0; i < word.length; i++) {
          const [nr, nc] = cells[i];
          empty[nr][nc].letter = word[i];
          empty[nr][nc].wordIndex = [...empty[nr][nc].wordIndex, wi];
        }
        placements.push({ word, cells });
        placed = true;
      }
    }
  }

  // Fill remaining with random letters
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < GRID_SIZE; r++)
    for (let c = 0; c < GRID_SIZE; c++)
      if (!empty[r][c].letter)
        empty[r][c].letter = alpha[Math.floor(Math.random() * alpha.length)];

  return { grid: empty, placements };
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60), ss = s % 60;
  return `${m}:${String(ss).padStart(2, '0')}`;
}

interface Props {
  onComplete: (seconds: number) => void;
  onProgress?: (found: number) => void;
  disabled?: boolean;
}

export default function WordSearchGame({ onComplete, onProgress, disabled = false }: Props) {
  const [{ grid, placements }] = useState(() => buildGrid());
  const [found, setFound]         = useState<Set<number>>(new Set());
  const [selecting, setSelecting] = useState<[number, number][]>([]);
  const [elapsed, setElapsed]     = useState(0);
  const [started, setStarted]     = useState(false);
  const [complete, setComplete]   = useState(false);
  const [cellSize, setCellSize]   = useState(28);
  const gridRef   = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isDragging  = useRef(false);

  // Responsive cell size — keeps grid within full width, max 28px per cell
  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        const w = e.contentRect.width;
        setCellSize(Math.max(18, Math.min(28, Math.floor((w - 8) / GRID_SIZE) - 2)));
      }
    });
    if (gridRef.current) obs.observe(gridRef.current);
    return () => obs.disconnect();
  }, []);

  // Timer
  useEffect(() => {
    if (started && !complete) {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [started, complete]);

  function getLineCells(from: [number,number], to: [number,number]): [number,number][] {
    const [r0,c0] = from, [r1,c1] = to;
    const dr = r1-r0, dc = c1-c0;
    const steps = Math.max(Math.abs(dr), Math.abs(dc));
    if (steps === 0) return [from];
    const sr = dr === 0 ? 0 : dr/Math.abs(dr);
    const sc = dc === 0 ? 0 : dc/Math.abs(dc);
    if (Math.abs(dr) !== Math.abs(dc) && dr !== 0 && dc !== 0) return [from];
    return Array.from({ length: steps+1 }, (_, i) => [r0+sr*i, c0+sc*i] as [number,number]);
  }

  function cellKey(r: number, c: number) { return r * GRID_SIZE + c; }

  function handlePointerDown(r: number, c: number) {
    if (disabled || complete) return;
    if (!started) setStarted(true);
    isDragging.current = true;
    setSelecting([[r, c]]);
  }

  function handlePointerEnter(r: number, c: number) {
    if (!isDragging.current || disabled || complete) return;
    if (selecting.length === 0) return;
    const line = getLineCells(selecting[0], [r, c]);
    setSelecting(line);
  }

  const handlePointerUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (selecting.length < 2) { setSelecting([]); return; }

    const selKeys = new Set(selecting.map(([r,c]) => cellKey(r,c)));
    for (let wi = 0; wi < placements.length; wi++) {
      if (found.has(wi)) continue;
      const { cells } = placements[wi];
      if (cells.length !== selecting.length) continue;
      const wordKeys = new Set(cells.map(([r,c]) => cellKey(r,c)));
      if ([...selKeys].every(k => wordKeys.has(k))) {
        const next = new Set(found);
        next.add(wi);
        setFound(next);
        onProgress?.(next.size);
        if (next.size === placements.length) {
          setComplete(true);
          if (intervalRef.current) clearInterval(intervalRef.current);
          onComplete(elapsed || 1);
        }
        break;
      }
    }
    setSelecting([]);
  }, [selecting, found, placements, elapsed, onComplete, onProgress]);

  useEffect(() => {
    window.addEventListener('pointerup', handlePointerUp);
    return () => window.removeEventListener('pointerup', handlePointerUp);
  }, [handlePointerUp]);

  const selKeys = new Set(selecting.map(([r,c]) => cellKey(r,c)));

  function getCellState(r: number, c: number) {
    const k = cellKey(r, c);
    const isFound = grid[r][c].wordIndex.some(wi => found.has(wi));
    const isSel   = selKeys.has(k);
    return { isFound, isSel };
  }

  return (
    <div style={{ userSelect: 'none' }}>
      {/* Timer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'clamp(0.6rem, 1.5vw, 1rem)' }}>
        <span style={{ fontFamily: 'var(--sans)', fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase',
          color: complete ? 'rgba(42,200,100,0.85)' : started ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.28)' }}>
          {complete ? '✓ Completado' : started ? '⏱ Cronómetro' : 'Arrastra para seleccionar palabras'}
        </span>
        <span style={{ fontFamily: 'var(--sans)', fontSize: 'clamp(0.95rem, 2.2vw, 1.2rem)', fontWeight: 700,
          letterSpacing: '0.08em', color: complete ? 'rgba(42,200,100,0.9)' : 'rgba(255,255,255,0.85)' }}>
          {fmtTime(elapsed)}
        </span>
      </div>

      {/* ── BOARD: full-width grid ── */}
      {/* Outer div: ResizeObserver measures available width */}
      <div ref={gridRef} style={{ width: '100%', marginBottom: 'clamp(0.75rem, 2vw, 1.25rem)' }}
        onPointerLeave={() => { if (isDragging.current) handlePointerUp(); }}
      >
      {/* Inner div: actual grid, fit-content + centered */}
      <div
        style={{
          background: 'rgba(0,0,0,0.25)', borderRadius: '10px', padding: '4px',
          display: 'grid', gridTemplateColumns: `repeat(${GRID_SIZE}, ${cellSize}px)`,
          gap: '2px', touchAction: 'none',
          width: 'fit-content', margin: '0 auto',
        }}
      >
        {grid.map((row, r) => row.map((cell, c) => {
          const { isFound, isSel } = getCellState(r, c);
          return (
            <div key={`${r}-${c}`}
              onPointerDown={() => handlePointerDown(r, c)}
              onPointerEnter={() => handlePointerEnter(r, c)}
              style={{
                width: cellSize, height: cellSize,
                borderRadius: '4px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isSel
                  ? 'rgba(212,168,83,0.75)'
                  : isFound
                    ? 'rgba(42,122,79,0.55)'
                    : 'rgba(255,255,255,0.07)',
                border: isSel ? '1.5px solid rgba(212,168,83,0.9)' : '1.5px solid transparent',
                transition: 'background 0.08s',
                fontFamily: 'var(--sans)',
                fontSize: `${Math.round(cellSize * 0.44)}px`,
                fontWeight: 700,
                color: isSel ? '#5c3d00' : isFound ? 'rgba(180,255,200,0.92)' : 'rgba(255,255,255,0.85)',
                WebkitUserSelect: 'none',
              }}
            >
              {cell.letter}
            </div>
          );
        }))}
      </div>
      </div>{/* closes outer gridRef div */}

      {/* ── Word list: compact horizontal wrap below grid ── */}
      <div>
        <p style={{ fontFamily: 'var(--sans)', fontSize: '0.52rem', letterSpacing: '0.20em',
          textTransform: 'uppercase', color: 'var(--warm)', marginBottom: '0.5rem',
          display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ display: 'inline-block', width: '10px', height: '1px', background: 'rgba(168,130,84,0.6)' }} />
          Encuentra {WORDS.length} palabras — {found.size}/{placements.length} encontradas
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px' }}>
          {placements.map((p, wi) => (
            <span key={p.word} style={{
              fontFamily: 'var(--sans)', fontSize: 'clamp(0.62rem, 1.3vw, 0.74rem)',
              fontWeight: 600, letterSpacing: '0.04em',
              color: found.has(wi) ? 'rgba(80,200,120,0.85)' : 'rgba(255,255,255,0.50)',
              textDecoration: found.has(wi) ? 'line-through' : 'none',
              transition: 'color 0.2s',
            }}>
              {found.has(wi) ? '✓ ' : ''}{p.word}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
