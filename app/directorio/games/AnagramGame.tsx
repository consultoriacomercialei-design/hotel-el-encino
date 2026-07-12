'use client';

import { useState, useEffect, useRef } from 'react';

const PUZZLES = [
  { word: 'CASCADA',   clue: 'Caída de agua entre peñascos — hay varias en la sierra de Santiago' },
  { word: 'ENCINO',    clue: 'Árbol que da nombre al hotel boutique en el centro histórico' },
  { word: 'MATACANES', clue: 'Cañón de aventura extrema, famoso por sus toboganes naturales' },
  { word: 'FESTIVAL',  clue: 'Evento de globos aerostáticos que ilumina Santiago cada año' },
  { word: 'CABALLO',   clue: 'Cola de ___ — la cascada más visitada del municipio' },
  { word: 'SIERRA',    clue: 'Cordillera que rodea Santiago y la hace tan especial' },
  { word: 'PRESA',     clue: 'La ___ La Boca: embalse ideal para kayak y pesca cerca de Santiago' },
  { word: 'ROBLE',     clue: 'Árbol de madera muy dura, típico del bosque serrano de Nuevo León' },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60), ss = s % 60;
  return `${m}:${String(ss).padStart(2, '0')}`;
}

interface Props {
  onComplete: (seconds: number) => void;
  onProgress?: (solved: number) => void;
  disabled?: boolean;
}

export default function AnagramGame({ onComplete, onProgress, disabled = false }: Props) {
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [solved, setSolved]           = useState<Set<number>>(new Set());
  const [letters, setLetters]         = useState<string[]>([]);
  const [selected, setSelected]       = useState<number[]>([]); // indices in letters[]
  const [shake, setShake]             = useState(false);
  const [elapsed, setElapsed]         = useState(0);
  const [started, setStarted]         = useState(false);
  const [complete, setComplete]       = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const puzzle = PUZZLES[puzzleIndex];

  // Reset letters when puzzle changes
  useEffect(() => {
    let scrambled = shuffle(puzzle.word.split(''));
    while (scrambled.join('') === puzzle.word)
      scrambled = shuffle(puzzle.word.split(''));
    setLetters(scrambled);
    setSelected([]);
  }, [puzzleIndex, puzzle.word]);

  // Timer
  useEffect(() => {
    if (started && !complete) {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [started, complete]);

  function handleLetterClick(idx: number) {
    if (disabled || complete || selected.includes(idx)) return;
    if (!started) setStarted(true);
    const next = [...selected, idx];
    setSelected(next);

    if (next.length === puzzle.word.length) {
      const attempt = next.map(i => letters[i]).join('');
      if (attempt === puzzle.word) {
        const ns = new Set(solved);
        ns.add(puzzleIndex);
        setSolved(ns);
        onProgress?.(ns.size);

        if (ns.size === PUZZLES.length) {
          setComplete(true);
          if (intervalRef.current) clearInterval(intervalRef.current);
          onComplete(elapsed || 1);
          return;
        }
        setTimeout(() => {
          setPuzzleIndex(i => (i + 1) % PUZZLES.length);
        }, 600);
      } else {
        setShake(true);
        setTimeout(() => { setShake(false); setSelected([]); }, 550);
      }
    }
  }

  function handleUnselect(pos: number) {
    if (disabled || complete) return;
    setSelected(prev => prev.filter((_, i) => i !== pos));
  }

  function handleShuffle() {
    setLetters(prev => shuffle([...prev]));
    setSelected([]);
  }

  const answer = selected.map(i => letters[i]).join('');

  return (
    <div style={{ userSelect: 'none' }}>
      {/* Timer + progress */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span style={{ fontFamily: 'var(--sans)', fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase',
          color: complete ? 'rgba(42,200,100,0.85)' : started ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.28)' }}>
          {complete ? '✓ ¡Completado!' : `Resuelta ${solved.size}/${PUZZLES.length}`}
        </span>
        <span style={{ fontFamily: 'var(--sans)', fontSize: 'clamp(0.95rem, 2.2vw, 1.2rem)', fontWeight: 700,
          letterSpacing: '0.08em', color: complete ? 'rgba(42,200,100,0.9)' : 'rgba(255,255,255,0.85)' }}>
          {fmtTime(elapsed)}
        </span>
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {PUZZLES.map((_, i) => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: '50%',
            background: solved.has(i)
              ? 'rgba(80,200,120,0.85)'
              : i === puzzleIndex
                ? 'rgba(212,168,83,0.8)'
                : 'rgba(255,255,255,0.15)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

      {/* ── BOARD: answer slots ── */}
      <div style={{
        display: 'flex', gap: '5px', flexWrap: 'wrap',
        marginBottom: '0.9rem', minHeight: '46px', alignItems: 'center', justifyContent: 'center',
        animation: shake ? 'shake 0.45s ease' : undefined,
      }}>
        {Array.from({ length: puzzle.word.length }, (_, pos) => {
          const letter = selected[pos] !== undefined ? letters[selected[pos]] : '';
          return (
            <div key={pos}
              onClick={() => letter && handleUnselect(pos)}
              style={{
                width: 'clamp(30px, 7vw, 42px)', height: 'clamp(36px, 8vw, 48px)',
                borderRadius: '9px', cursor: letter ? 'pointer' : 'default',
                border: letter
                  ? '2px solid rgba(212,168,83,0.70)'
                  : '2px dashed rgba(255,255,255,0.18)',
                background: letter ? 'rgba(212,168,83,0.18)' : 'rgba(255,255,255,0.04)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--sans)', fontSize: 'clamp(0.9rem, 2.8vw, 1.15rem)', fontWeight: 800,
                color: letter ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.12)',
                transition: 'all 0.15s',
              }}
            >
              {letter}
            </div>
          );
        })}
        {answer.length > 0 && !shake && (
          <button onClick={() => setSelected([])}
            style={{
              marginLeft: '3px', background: 'transparent',
              border: 'none', cursor: 'pointer', padding: '4px',
              color: 'rgba(255,255,255,0.30)', fontSize: '0.75rem',
            }}>✕</button>
        )}
      </div>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>

      {/* ── BOARD: scrambled letter tiles ── */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '1.1rem', justifyContent: 'center' }}>
        {letters.map((letter, idx) => {
          const isUsed = selected.includes(idx);
          return (
            <button key={idx} onClick={() => handleLetterClick(idx)}
              disabled={isUsed || disabled || complete}
              style={{
                width: 'clamp(34px, 8vw, 44px)', height: 'clamp(40px, 9vw, 52px)',
                borderRadius: '11px', cursor: isUsed ? 'default' : 'pointer',
                border: '2px solid',
                borderColor: isUsed ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.25)',
                background: isUsed
                  ? 'rgba(255,255,255,0.04)'
                  : 'linear-gradient(145deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 100%)',
                backdropFilter: 'blur(8px)',
                fontFamily: 'var(--sans)', fontSize: 'clamp(1rem, 3.2vw, 1.25rem)', fontWeight: 800,
                color: isUsed ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.92)',
                transition: 'all 0.12s',
                boxShadow: isUsed ? 'none' : '0 3px 10px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.18)',
              }}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {/* ── Clue box — below the board ── */}
      <div style={{
        background: 'rgba(255,255,255,0.06)', borderRadius: '11px',
        border: '1px solid rgba(255,255,255,0.10)',
        padding: '0.75rem 1rem', marginBottom: '0.9rem',
        display: 'flex', gap: '10px', alignItems: 'flex-start',
      }}>
        <span style={{ fontFamily: 'var(--sans)', fontSize: '0.52rem', letterSpacing: '0.18em',
          textTransform: 'uppercase', color: 'var(--warm)', flexShrink: 0, paddingTop: '2px' }}>Pista</span>
        <p style={{ fontFamily: 'var(--sans)', fontSize: 'clamp(0.72rem, 1.6vw, 0.84rem)',
          color: 'rgba(255,255,255,0.70)', lineHeight: 1.5, margin: 0 }}>
          {puzzle.clue}
        </p>
      </div>

      {/* Shuffle button */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button onClick={handleShuffle}
          style={{
            fontFamily: 'var(--sans)', fontSize: '0.58rem', letterSpacing: '0.10em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: '999px', padding: '7px 18px', cursor: 'pointer',
          }}
        >
          ↺ Mezclar letras
        </button>
      </div>
    </div>
  );
}
