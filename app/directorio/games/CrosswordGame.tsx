'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/* ─── Crossword — Santiago, N.L.: historia, eventos y datos ─── */
/*
  Grid 8 rows × 9 cols:

        0     1     2     3     4     5     6     7     8
  r0: [null, null,  'T',  'U',  'R',  'I',  'S',  'T',  'A']
  r1: ['E',  'N',  'C',  'I',  'N',  'O',  'A', null, null ]
  r2: [null, null,  'A',  'R',  'O',  'B',  'L',  'E', null]
  r3: [null, null,  'S', null,  'R', null,  'T', null, null]
  r4: [null, null,  'C',  'I',  'E',  'L',  'O', null, null]
  r5: [null, null,  'A', null,  'S', null, null, null, null]
  r6: [null, null,  'D', null,  'T', null, null, null, null]
  r7: [null, null,  'A', null,  'E', null, null, null, null]

  Words:
  1 across (0,2,7): TURISTA
  2 down   (0,6,5): SALTO
  3 across (1,0,6): ENCINO
  4 down   (1,2,7): CASCADA
  5 down   (1,4,7): NORESTE
  6 across (2,3,5): ROBLE
  7 across (4,2,5): CIELO
*/

const SOLUTION: (string | null)[][] = [
  [null, null, 'T', 'U', 'R', 'I', 'S', 'T', 'A'],
  ['E',  'N',  'C', 'I', 'N', 'O', 'A', null, null],
  [null, null, 'A', 'R', 'O', 'B', 'L', 'E', null],
  [null, null, 'S', null,'R', null,'T', null, null],
  [null, null, 'C', 'I', 'E', 'L', 'O', null, null],
  [null, null, 'A', null,'S', null, null,null, null],
  [null, null, 'D', null,'T', null, null,null, null],
  [null, null, 'A', null,'E', null, null,null, null],
];

const ROWS = SOLUTION.length;
const COLS = SOLUTION[0].length;

interface WordDef {
  number: number;
  direction: 'across' | 'down';
  row: number; col: number;
  length: number;
  clue: string;
}

const WORDS: WordDef[] = [
  {
    number: 1, direction: 'across', row: 0, col: 2, length: 7,
    clue: 'Santiago recibe miles de _____ cada año gracias al Festival Cielo Mágico y sus cascadas',
  },
  {
    number: 2, direction: 'down', row: 0, col: 6, length: 5,
    clue: 'Cascada El ___: una de las más altas de Nuevo León, a pocos km del centro de Santiago',
  },
  {
    number: 3, direction: 'across', row: 1, col: 0, length: 6,
    clue: 'Árbol de hoja dura que da nombre al hotel boutique del centro histórico de Santiago',
  },
  {
    number: 4, direction: 'down', row: 1, col: 2, length: 7,
    clue: 'Santiago tiene más de 30 de estas formaciones naturales; Cola de Caballo es la más visitada',
  },
  {
    number: 5, direction: 'down', row: 1, col: 4, length: 7,
    clue: 'Región de México a la que pertenece Nuevo León; Santiago se ubica en esta zona del país',
  },
  {
    number: 6, direction: 'across', row: 2, col: 3, length: 5,
    clue: 'Árbol que comparte el bosque serrano con el encino; madera muy apreciada en la región',
  },
  {
    number: 7, direction: 'across', row: 4, col: 2, length: 5,
    clue: 'Festival _____ Mágico — espectáculo de globos aerostáticos que ilumina Santiago cada año',
  },
];

function buildNumberGrid(): (number | null)[][] {
  const ng: (number | null)[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  for (const w of WORDS) { if (!ng[w.row][w.col]) ng[w.row][w.col] = w.number; }
  return ng;
}
const NUMBER_GRID = buildNumberGrid();

type Dir = 'across' | 'down';

interface Props {
  onComplete: (seconds: number) => void;
  onProgress?: (filledCount: number) => void;
  disabled?: boolean;
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60), ss = s % 60;
  return `${m}:${String(ss).padStart(2, '0')}`;
}

export default function CrosswordGame({ onComplete, onProgress, disabled = false }: Props) {
  const [grid, setGrid]           = useState<string[][]>(() =>
    Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => ''))
  );
  const [active, setActive]       = useState<[number, number] | null>(null);
  const [direction, setDirection] = useState<Dir>('across');
  const [elapsed, setElapsed]     = useState(0);
  const [started, setStarted]     = useState(false);
  const [complete, setComplete]   = useState(false);
  const [cellSize, setCellSize]   = useState(38);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  const gridRef     = useRef<HTMLDivElement>(null);
  const lastKeyRef  = useRef<string>('');

  // Responsive: compute cell size from the full-width container
  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        const w = e.contentRect.width;
        const ideal = Math.floor((w - 8) / COLS) - 2;
        setCellSize(Math.max(22, Math.min(52, ideal)));
      }
    });
    if (gridRef.current) obs.observe(gridRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (started && !complete) {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [started, complete]);

  const checkComplete = useCallback((g: string[][]) => {
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (SOLUTION[r][c] !== null && g[r][c].toUpperCase() !== SOLUTION[r][c]) return false;
    return true;
  }, []);

  function getWordCells(r: number, c: number, dir: Dir): [number, number][] {
    const word = WORDS.find(w => {
      if (w.direction !== dir) return false;
      if (dir === 'across') return w.row === r && c >= w.col && c < w.col + w.length;
      return w.col === c && r >= w.row && r < w.row + w.length;
    });
    if (!word) return [];
    return Array.from({ length: word.length }, (_, i) =>
      dir === 'across' ? [word.row, word.col + i] : [word.row + i, word.col]
    ) as [number, number][];
  }

  function isHighlighted(r: number, c: number) {
    if (!active) return false;
    return getWordCells(active[0], active[1], direction).some(([wr, wc]) => wr === r && wc === c);
  }

  function isCorrect(r: number, c: number) {
    return SOLUTION[r][c] !== null && grid[r][c].toUpperCase() === SOLUTION[r][c];
  }

  function handleCellClick(r: number, c: number) {
    if (SOLUTION[r][c] === null || disabled || complete) return;
    if (active && active[0] === r && active[1] === c) {
      const other: Dir = direction === 'across' ? 'down' : 'across';
      const hasOther = WORDS.some(w => {
        if (w.direction !== other) return false;
        if (other === 'across') return w.row === r && c >= w.col && c < w.col + w.length;
        return w.col === c && r >= w.row && r < w.row + w.length;
      });
      if (hasOther) setDirection(other);
    } else {
      setActive([r, c]);
      const hasAcross = WORDS.some(w => w.direction === 'across' && w.row === r && c >= w.col && c < w.col + w.length);
      const hasDown   = WORDS.some(w => w.direction === 'down'   && w.col === c && r >= w.row && r < w.row + w.length);
      if (hasAcross && !hasDown) setDirection('across');
      else if (hasDown && !hasAcross) setDirection('down');
    }
    if (!started) setStarted(true);
    inputRef.current?.focus();
  }

  function advanceCell(r: number, c: number, dir: Dir) {
    const cells = getWordCells(r, c, dir);
    const idx = cells.findIndex(([wr, wc]) => wr === r && wc === c);
    return idx < cells.length - 1 ? cells[idx + 1] : null;
  }

  function retreatCell(r: number, c: number, dir: Dir) {
    const cells = getWordCells(r, c, dir);
    const idx = cells.findIndex(([wr, wc]) => wr === r && wc === c);
    return idx > 0 ? cells[idx - 1] : null;
  }

  function placeLetter(letter: string) {
    if (!active || disabled || complete) return;
    const [ar, ac] = active;
    if (!started) setStarted(true);
    const ng = grid.map(row => [...row]);
    ng[ar][ac] = letter;
    setGrid(ng);
    const filled = ng.flat().filter(v => v).length;
    onProgress?.(filled);
    if (checkComplete(ng)) {
      setComplete(true);
      if (intervalRef.current) clearInterval(intervalRef.current);
      onComplete(elapsed || 1);
    }
    const next = advanceCell(ar, ac, direction);
    if (next) setActive(next);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (!active || disabled || complete) return;
    const [ar, ac] = active;
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (grid[ar][ac]) {
        const ng = grid.map(row => [...row]);
        ng[ar][ac] = '';
        setGrid(ng);
        onProgress?.(ng.flat().filter(v => v).length);
      } else {
        const prev = retreatCell(ar, ac, direction);
        if (prev) setActive(prev);
      }
      return;
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); setDirection('across'); return; }
    if (e.key === 'ArrowDown'  || e.key === 'ArrowUp')   { e.preventDefault(); setDirection('down');   return; }
    if (e.key === 'Tab') { e.preventDefault(); return; }
    const letter = e.key.toUpperCase();
    if (/^[A-ZÁÉÍÓÚÜÑ]$/.test(letter)) {
      lastKeyRef.current = letter;
      placeLetter(letter);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    e.target.value = '';
    if (!val) return;
    const letter = val.slice(-1).toUpperCase();
    if (!/^[A-ZÁÉÍÓÚÜÑ]$/.test(letter)) return;
    if (lastKeyRef.current === letter) { lastKeyRef.current = ''; return; }
    lastKeyRef.current = '';
    placeLetter(letter);
  }

  const acrossClues = WORDS.filter(w => w.direction === 'across');
  const downClues   = WORDS.filter(w => w.direction === 'down');
  const GAP = 2;

  return (
    <div style={{ userSelect: 'none' }}>
      <input
        ref={inputRef} onKeyDown={handleKey} onChange={handleChange}
        autoComplete="off" autoCorrect="off" autoCapitalize="characters"
        spellCheck={false} inputMode="text" aria-hidden
        style={{ position: 'fixed', top: '-120px', left: '50%', width: '2px', height: '2px', opacity: 0, border: 'none', outline: 'none', padding: 0, fontSize: '16px', pointerEvents: 'none' }}
      />

      {/* Timer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'clamp(0.6rem, 1.5vw, 1rem)' }}>
        <span style={{ fontFamily: 'var(--sans)', fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase',
          color: complete ? 'rgba(42,200,100,0.85)' : started ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.28)' }}>
          {complete ? '✓ Completado' : started ? '⏱ Cronómetro' : 'Toca una casilla para comenzar'}
        </span>
        <span style={{ fontFamily: 'var(--sans)', fontSize: 'clamp(0.95rem, 2.2vw, 1.2rem)', fontWeight: 700,
          letterSpacing: '0.08em', minWidth: '48px', textAlign: 'right',
          color: complete ? 'rgba(42,200,100,0.9)' : 'rgba(255,255,255,0.85)' }}>
          {fmtTime(elapsed)}
        </span>
      </div>

      {/* ── BOARD: full-width grid ── */}
      <div ref={gridRef} style={{ width: '100%', marginBottom: 'clamp(0.75rem, 2vw, 1.25rem)' }}>
        <div role="grid" aria-label="Crucigrama" style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLS}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${ROWS}, ${cellSize}px)`,
          gap: `${GAP}px`,
          background: 'rgba(0,0,0,0.25)', padding: `${GAP}px`,
          borderRadius: '10px', width: 'fit-content',
          margin: '0 auto',
        }}>
          {SOLUTION.map((row, r) => row.map((sol, c) => {
            if (sol === null) {
              return <div key={`${r}-${c}`} style={{ width: cellSize, height: cellSize, background: 'rgba(0,0,0,0.65)', borderRadius: '3px' }} />;
            }
            const isAct  = active?.[0] === r && active?.[1] === c;
            const isHl   = isHighlighted(r, c);
            const isCorr = isCorrect(r, c);
            const num    = NUMBER_GRID[r][c];
            const val    = grid[r][c];
            return (
              <div key={`${r}-${c}`} role="gridcell" onClick={() => handleCellClick(r, c)} style={{
                width: cellSize, height: cellSize, position: 'relative', cursor: 'pointer', borderRadius: '3px',
                background: isAct ? 'rgba(212,168,83,0.92)' : isHl ? 'rgba(212,168,83,0.22)' : isCorr && val ? 'rgba(240,255,247,0.92)' : 'rgba(255,255,255,0.94)',
                border: isAct ? '2px solid rgba(212,168,83,1)' : isCorr && val ? '1.5px solid rgba(42,122,79,0.35)' : '1.5px solid rgba(200,200,200,0.4)',
                boxShadow: isAct ? '0 2px 10px rgba(212,168,83,0.40)' : '0 1px 3px rgba(0,0,0,0.12)',
                transition: 'background 0.10s, border 0.10s',
              }}>
                {num && (
                  <span style={{ position: 'absolute', top: '1px', left: '2px', fontFamily: 'var(--sans)', fontSize: `${Math.max(6, cellSize * 0.18)}px`, fontWeight: 700, lineHeight: 1, color: isAct ? 'rgba(100,70,10,0.75)' : 'rgba(100,100,100,0.7)' }}>{num}</span>
                )}
                <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--sans)', fontSize: `${Math.round(cellSize * 0.44)}px`, fontWeight: 800, textTransform: 'uppercase', color: isAct ? '#5c3d00' : isCorr && val ? '#1a6638' : 'rgba(20,20,20,0.9)', letterSpacing: '-0.01em' }}>
                  {val}
                </span>
              </div>
            );
          }))}
        </div>
      </div>

      {/* ── CLUES: two columns below the grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(0.75rem, 2vw, 1.5rem)' }}>
        <div>
          <p style={{ fontFamily: 'var(--sans)', fontSize: '0.52rem', letterSpacing: '0.20em', textTransform: 'uppercase', color: 'var(--warm)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '0.5rem' }}>
            <span style={{ display: 'inline-block', width: '10px', height: '1px', background: 'rgba(168,130,84,0.6)' }} />
            Horizontales
          </p>
          {acrossClues.map(w => (
            <ClueItem key={`a${w.number}`} word={w} active={active} direction={direction}
              onClick={() => { setActive([w.row, w.col]); setDirection('across'); if (!started) setStarted(true); inputRef.current?.focus(); }} />
          ))}
        </div>
        <div>
          <p style={{ fontFamily: 'var(--sans)', fontSize: '0.52rem', letterSpacing: '0.20em', textTransform: 'uppercase', color: 'var(--warm)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '0.5rem' }}>
            <span style={{ display: 'inline-block', width: '10px', height: '1px', background: 'rgba(168,130,84,0.6)' }} />
            Verticales
          </p>
          {downClues.map(w => (
            <ClueItem key={`d${w.number}`} word={w} active={active} direction={direction}
              onClick={() => { setActive([w.row, w.col]); setDirection('down'); if (!started) setStarted(true); inputRef.current?.focus(); }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ClueItem({ word, active, direction, onClick }: {
  word: WordDef; active: [number,number] | null; direction: Dir; onClick: () => void;
}) {
  const isAct = active ? (() => {
    if (word.direction !== direction) return false;
    const [ar, ac] = active;
    if (word.direction === 'across') return word.row === ar && ac >= word.col && ac < word.col + word.length;
    return word.col === ac && ar >= word.row && ar < word.row + word.length;
  })() : false;

  return (
    <button onClick={onClick} style={{
      display: 'flex', width: '100%', textAlign: 'left', border: 'none',
      padding: '4px 6px 4px 5px', borderRadius: '7px', cursor: 'pointer', gap: '5px',
      background: isAct ? 'rgba(212,168,83,0.16)' : 'transparent',
      marginBottom: '1px', transition: 'background 0.12s',
    } as React.CSSProperties}>
      <span style={{ fontFamily: 'var(--sans)', fontSize: 'clamp(0.58rem, 1.1vw, 0.68rem)', fontWeight: 700, flexShrink: 0, minWidth: '16px', color: isAct ? 'var(--warm)' : 'rgba(255,255,255,0.42)', lineHeight: 1.5 }}>
        {word.number}.
      </span>
      <span style={{ fontFamily: 'var(--sans)', fontSize: 'clamp(0.58rem, 1.1vw, 0.68rem)', color: isAct ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.48)', lineHeight: 1.5 }}>
        {word.clue}
      </span>
    </button>
  );
}
