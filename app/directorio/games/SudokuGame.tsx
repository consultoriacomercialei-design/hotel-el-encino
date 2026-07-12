'use client';

import { useState, useEffect, useRef } from 'react';

/* ── Fixed puzzle (0 = empty) ── */
const PUZZLE = [
  [5,3,0,0,7,0,0,0,0],
  [6,0,0,1,9,5,0,0,0],
  [0,9,8,0,0,0,0,6,0],
  [8,0,0,0,6,0,0,0,3],
  [4,0,0,8,0,3,0,0,1],
  [7,0,0,0,2,0,0,0,6],
  [0,6,0,0,0,0,2,8,0],
  [0,0,0,4,1,9,0,0,5],
  [0,0,0,0,8,0,0,7,9],
];

const SOLUTION = [
  [5,3,4,6,7,8,9,1,2],
  [6,7,2,1,9,5,3,4,8],
  [1,9,8,3,4,2,5,6,7],
  [8,5,9,7,6,1,4,2,3],
  [4,2,6,8,5,3,7,9,1],
  [7,1,3,9,2,4,8,5,6],
  [9,6,1,5,3,7,2,8,4],
  [2,8,7,4,1,9,6,3,5],
  [3,4,5,2,8,6,1,7,9],
];

const GIVEN = PUZZLE.map(row => row.map(v => v !== 0));

function fmtTime(s: number) {
  const m = Math.floor(s / 60), ss = s % 60;
  return `${m}:${String(ss).padStart(2, '0')}`;
}

interface Props {
  onComplete: (seconds: number) => void;
  onProgress?: (filled: number) => void;
  disabled?: boolean;
}

export default function SudokuGame({ onComplete, onProgress, disabled = false }: Props) {
  const [grid, setGrid]       = useState<number[][]>(() => PUZZLE.map(r => [...r]));
  const [active, setActive]   = useState<[number,number] | null>(null);
  const [errors, setErrors]   = useState<Set<string>>(new Set());
  const [elapsed, setElapsed] = useState(0);
  const [started, setStarted] = useState(false);
  const [complete, setComplete] = useState(false);
  const [cellSize, setCellSize] = useState(44);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // Responsive cell size
  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        const w = e.contentRect.width;
        setCellSize(Math.max(22, Math.min(44, Math.floor((w - 24) / 9) - 3)));
      }
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Timer
  useEffect(() => {
    if (started && !complete) {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [started, complete]);

  function handleCellClick(r: number, c: number) {
    if (disabled || complete || GIVEN[r][c]) return;
    setActive([r, c]);
    if (!started) setStarted(true);
  }

  function placeNumber(n: number) {
    if (!active || disabled || complete) return;
    const [ar, ac] = active;
    if (GIVEN[ar][ac]) return;

    const ng = grid.map(row => [...row]);
    ng[ar][ac] = n;
    setGrid(ng);

    // Check error
    const isWrong = n !== 0 && SOLUTION[ar][ac] !== n;
    const key = `${ar}-${ac}`;
    const ne = new Set(errors);
    if (isWrong) ne.add(key); else ne.delete(key);
    setErrors(ne);

    // Progress: count filled non-given cells
    let filled = 0;
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (!GIVEN[r][c] && ng[r][c] !== 0) filled++;
    onProgress?.(filled);

    // Check complete
    let done = true;
    for (let r = 0; r < 9 && done; r++)
      for (let c = 0; c < 9 && done; c++)
        if (ng[r][c] !== SOLUTION[r][c]) done = false;

    if (done) {
      setComplete(true);
      if (intervalRef.current) clearInterval(intervalRef.current);
      onComplete(elapsed || 1);
    }
  }

  // Keyboard support
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!active || disabled || complete) return;
      const n = parseInt(e.key);
      if (n >= 1 && n <= 9) placeNumber(n);
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') placeNumber(0);
      if (e.key === 'ArrowUp'    && active[0] > 0) setActive([active[0]-1, active[1]]);
      if (e.key === 'ArrowDown'  && active[0] < 8) setActive([active[0]+1, active[1]]);
      if (e.key === 'ArrowLeft'  && active[1] > 0) setActive([active[0], active[1]-1]);
      if (e.key === 'ArrowRight' && active[1] < 8) setActive([active[0], active[1]+1]);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, disabled, complete, grid, elapsed]);

  function isHighlightedRow(r: number, c: number) {
    if (!active) return false;
    return active[0] === r || active[1] === c;
  }

  function isBox(r: number, c: number) {
    if (!active) return false;
    return Math.floor(active[0]/3) === Math.floor(r/3) && Math.floor(active[1]/3) === Math.floor(c/3);
  }

  function isSameNum(r: number, c: number) {
    if (!active || !grid[active[0]][active[1]]) return false;
    return grid[r][c] === grid[active[0]][active[1]] && grid[r][c] !== 0;
  }

  const NUMS = [1,2,3,4,5,6,7,8,9];

  return (
    <div ref={containerRef} style={{ userSelect: 'none' }}>
      {/* Timer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <span style={{ fontFamily: 'var(--sans)', fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase',
          color: complete ? 'rgba(42,200,100,0.85)' : started ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.28)' }}>
          {complete ? '✓ Completado' : started ? '⏱ Cronómetro' : 'Toca una celda para comenzar'}
        </span>
        <span style={{ fontFamily: 'var(--sans)', fontSize: 'clamp(1rem, 2.5vw, 1.3rem)', fontWeight: 700,
          letterSpacing: '0.08em', color: complete ? 'rgba(42,200,100,0.9)' : 'rgba(255,255,255,0.85)' }}>
          {fmtTime(elapsed)}
        </span>
      </div>

      {/* Sudoku grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(9, ${cellSize}px)`,
        gap: '2px', background: 'rgba(0,0,0,0.3)', padding: '3px', borderRadius: '10px',
        width: 'fit-content', marginBottom: '1rem', margin: '0 auto 1rem',
      }}>
        {grid.map((row, r) => row.map((val, c) => {
          const isActive = active?.[0] === r && active?.[1] === c;
          const isHl     = !isActive && (isHighlightedRow(r, c) || isBox(r, c));
          const isSame   = !isActive && isSameNum(r, c);
          const isGiven  = GIVEN[r][c];
          const isErr    = errors.has(`${r}-${c}`);
          const boxRight = c === 2 || c === 5;
          const boxBottom = r === 2 || r === 5;

          return (
            <div key={`${r}-${c}`}
              onClick={() => handleCellClick(r, c)}
              style={{
                width: cellSize, height: cellSize,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '3px', cursor: isGiven ? 'default' : 'pointer',
                marginRight: boxRight ? '3px' : 0,
                marginBottom: boxBottom ? '3px' : 0,
                background: isActive
                  ? 'rgba(212,168,83,0.85)'
                  : isSame
                    ? 'rgba(212,168,83,0.20)'
                    : isHl
                      ? 'rgba(255,255,255,0.10)'
                      : 'rgba(255,255,255,0.06)',
                border: isActive ? '2px solid rgba(212,168,83,1)' : '1.5px solid rgba(255,255,255,0.08)',
                transition: 'background 0.1s',
                fontFamily: 'var(--sans)',
                fontSize: `${Math.round(cellSize * 0.44)}px`,
                fontWeight: isGiven ? 700 : 600,
                color: isErr
                  ? 'rgba(255,80,80,0.9)'
                  : isActive
                    ? '#5c3d00'
                    : isGiven
                      ? 'rgba(255,255,255,0.90)'
                      : 'rgba(168,220,192,0.90)',
              }}
            >
              {val !== 0 ? val : ''}
            </div>
          );
        }))}
      </div>

      {/* Number pad */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {NUMS.map(n => (
          <button key={n} onClick={() => placeNumber(n)}
            style={{
              width: Math.max(30, cellSize - 4), height: Math.max(30, cellSize - 4),
              borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.09)', cursor: 'pointer',
              fontFamily: 'var(--sans)', fontSize: `${Math.round(cellSize * 0.38)}px`, fontWeight: 700,
              color: 'rgba(255,255,255,0.80)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.1s',
            }}
          >{n}</button>
        ))}
        <button onClick={() => placeNumber(0)}
          style={{
            padding: '0 12px', height: Math.max(30, cellSize - 4),
            borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.06)', cursor: 'pointer',
            fontFamily: 'var(--sans)', fontSize: '0.6rem', letterSpacing: '0.08em',
            color: 'rgba(255,255,255,0.45)',
          }}
        >✕</button>
      </div>
    </div>
  );
}
