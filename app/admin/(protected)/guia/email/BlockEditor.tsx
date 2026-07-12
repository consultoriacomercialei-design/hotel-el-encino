'use client';

import { useState, useRef, useCallback } from 'react';
import type {
  EmailBlock, BlockType,
  HeaderBlock, TextBlock, ImageBlock,
  ButtonBlock, DividerBlock, SpacerBlock,
  ColumnsBlock, CalloutBlock,
} from './types';
import { BLOCK_PALETTE, makeBlock } from './types';
import ImageUploader from './ImageUploader';

/* ─────────────────────────────────────────────────────────────
   BlockEditor — drag-to-reorder, inline editing per block type
   ───────────────────────────────────────────────────────────── */

interface BlockEditorProps {
  blocks: EmailBlock[];
  onChange: (blocks: EmailBlock[]) => void;
  accentColor?: string;
}

export default function BlockEditor({ blocks, onChange, accentColor = '#856d47' }: BlockEditorProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [showPalette, setShowPalette] = useState(false);
  const [dragSrc, setDragSrc] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const update = useCallback((id: string, patch: Partial<EmailBlock>) => {
    onChange(blocks.map(b => b.id === id ? { ...b, ...patch } as EmailBlock : b));
  }, [blocks, onChange]);

  const remove = useCallback((id: string) => {
    onChange(blocks.filter(b => b.id !== id));
    if (selected === id) setSelected(null);
  }, [blocks, onChange, selected]);

  const addBlock = (type: BlockType) => {
    const newBlock = makeBlock(type);
    onChange([...blocks, newBlock]);
    setSelected(newBlock.id);
    setShowPalette(false);
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const next = [...blocks];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next);
  };

  const moveDown = (idx: number) => {
    if (idx === blocks.length - 1) return;
    const next = [...blocks];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange(next);
  };

  // Drag handlers
  const onDragStart = (idx: number) => setDragSrc(idx);
  const onDragEnter = (idx: number) => setDragOver(idx);
  const onDragEnd   = () => {
    if (dragSrc !== null && dragOver !== null && dragSrc !== dragOver) {
      const next = [...blocks];
      const [item] = next.splice(dragSrc, 1);
      next.splice(dragOver, 0, item);
      onChange(next);
    }
    setDragSrc(null);
    setDragOver(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {blocks.length === 0 && (
        <div style={{
          border: '2px dashed rgba(0,0,0,0.1)', borderRadius: '12px',
          padding: '32px', textAlign: 'center',
        }}>
          <p style={hint}>Haz clic en "+ Agregar bloque" para comenzar a diseñar el email</p>
        </div>
      )}

      {blocks.map((block, idx) => {
        const isSel   = selected === block.id;
        const isDragS = dragSrc  === idx;
        const isDragO = dragOver === idx;
        return (
          <div
            key={block.id}
            draggable
            onDragStart={() => onDragStart(idx)}
            onDragEnter={() => onDragEnter(idx)}
            onDragEnd={onDragEnd}
            onDragOver={e => e.preventDefault()}
            style={{
              border: isSel ? `2px solid ${accentColor}` : isDragO ? '2px solid #2980b9' : '2px solid rgba(0,0,0,0.07)',
              borderRadius: '12px',
              background: isDragS ? 'rgba(0,0,0,0.04)' : '#fff',
              opacity: isDragS ? 0.5 : 1,
              transition: 'border-color 0.12s, opacity 0.15s',
              overflow: 'hidden',
            }}
          >
            {/* Block toolbar */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 10px',
              background: isSel ? `${accentColor}12` : 'rgba(0,0,0,0.02)',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
              cursor: 'grab',
            }}
              onClick={() => setSelected(isSel ? null : block.id)}
            >
              <span style={{ fontSize: '0.7rem', color: '#bbb', cursor: 'grab', userSelect: 'none' }}>⠿</span>
              <span style={{ fontFamily: 'system-ui', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: isSel ? accentColor : '#aaa' }}>
                {BLOCK_PALETTE.find(p => p.type === block.type)?.emoji} {BLOCK_PALETTE.find(p => p.type === block.type)?.label}
              </span>
              <div style={{ flex: 1 }} />
              {/* Controls */}
              <button onClick={e => { e.stopPropagation(); moveUp(idx); }} style={ctrlBtn} title="Subir">↑</button>
              <button onClick={e => { e.stopPropagation(); moveDown(idx); }} style={ctrlBtn} title="Bajar">↓</button>
              <button onClick={e => { e.stopPropagation(); remove(block.id); }} style={{ ...ctrlBtn, color: '#b0392a' }} title="Eliminar">✕</button>
            </div>

            {/* Inline editor — only when selected */}
            {isSel && (
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <BlockEditPanel block={block} onUpdate={p => update(block.id, p)} accentColor={accentColor} />
              </div>
            )}
          </div>
        );
      })}

      {/* Add block */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowPalette(v => !v)}
          style={{
            width: '100%', padding: '10px', borderRadius: '10px',
            border: `1.5px dashed ${showPalette ? accentColor : 'rgba(0,0,0,0.15)'}`,
            background: showPalette ? `${accentColor}08` : 'transparent',
            cursor: 'pointer', fontFamily: 'system-ui', fontSize: '0.75rem',
            color: showPalette ? accentColor : '#888', fontWeight: 600,
            transition: 'all 0.15s',
          }}
        >
          + Agregar bloque
        </button>
        {showPalette && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
            background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)', marginTop: '4px',
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', padding: '12px',
          }}>
            {BLOCK_PALETTE.map(p => (
              <button
                key={p.type}
                onClick={() => addBlock(p.type)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                  padding: '10px 6px', borderRadius: '8px', border: 'none',
                  background: 'rgba(0,0,0,0.03)', cursor: 'pointer',
                  fontFamily: 'system-ui', fontSize: '0.65rem', color: '#444',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = `${accentColor}14`)}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')}
              >
                <span style={{ fontSize: '1.1rem' }}>{p.emoji}</span>
                <span style={{ fontWeight: 600 }}>{p.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Per-block editor panels ─────────────────────────────────── */

function BlockEditPanel({ block, onUpdate, accentColor }: {
  block: EmailBlock;
  onUpdate: (p: Partial<EmailBlock>) => void;
  accentColor: string;
}) {
  switch (block.type) {
    case 'header':  return <HeaderPanel  b={block as HeaderBlock}  u={onUpdate} />;
    case 'text':    return <TextPanel    b={block as TextBlock}    u={onUpdate} accentColor={accentColor} />;
    case 'image':   return <ImagePanel   b={block as ImageBlock}   u={onUpdate} />;
    case 'button':  return <ButtonPanel  b={block as ButtonBlock}  u={onUpdate} />;
    case 'divider': return <DividerPanel b={block as DividerBlock} u={onUpdate} />;
    case 'spacer':  return <SpacerPanel  b={block as SpacerBlock}  u={onUpdate} />;
    case 'columns': return <ColumnsPanel b={block as ColumnsBlock} u={onUpdate} accentColor={accentColor} />;
    case 'callout': return <CalloutPanel b={block as CalloutBlock} u={onUpdate} accentColor={accentColor} />;
    default: return null;
  }
}

/* ── Header panel ────────────────────────────────────────────── */
function HeaderPanel({ b, u }: { b: HeaderBlock; u: (p: Partial<HeaderBlock>) => void }) {
  return (
    <>
      <Field label="Título"><input value={b.title} onChange={e => u({ title: e.target.value })} style={inp} /></Field>
      <Field label="Subtítulo (opcional)"><input value={b.subtitle} onChange={e => u({ subtitle: e.target.value })} style={inp} /></Field>
      <Row>
        <Field label="Fondo"><ColorInput value={b.bgColor} onChange={v => u({ bgColor: v })} /></Field>
        <Field label="Texto"><ColorInput value={b.textColor} onChange={v => u({ textColor: v })} /></Field>
        <Field label="Alineación">
          <AlignToggle value={b.align} onChange={v => u({ align: v as HeaderBlock['align'] })} />
        </Field>
      </Row>
      <ToggleField label='Mostrar badge "Hotel El Encino"' value={b.showBadge} onChange={v => u({ showBadge: v })} />
    </>
  );
}

/* ── Text panel (rich text toolbar) ─────────────────────────── */
function TextPanel({ b, u, accentColor }: { b: TextBlock; u: (p: Partial<TextBlock>) => void; accentColor: string }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const exec = (cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    // sync HTML
    if (editorRef.current) u({ html: editorRef.current.innerHTML });
  };
  return (
    <>
      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', background: 'rgba(0,0,0,0.03)', borderRadius: '8px', padding: '6px 8px' }}>
        {[
          { cmd: 'bold',          icon: '<b>B</b>',  title: 'Negrita' },
          { cmd: 'italic',        icon: '<i>I</i>',  title: 'Cursiva' },
          { cmd: 'underline',     icon: '<u>U</u>',  title: 'Subrayado' },
          { cmd: 'strikeThrough', icon: '<s>S</s>',  title: 'Tachado' },
        ].map(({ cmd, icon, title }) => (
          <button key={cmd} title={title} onMouseDown={e => { e.preventDefault(); exec(cmd); }}
            style={{ ...toolBtn, fontFamily: 'Georgia,serif' }}
            dangerouslySetInnerHTML={{ __html: icon }} />
        ))}
        <div style={sep} />
        {[
          { cmd: 'justifyLeft',   icon: '⬜↖', title: 'Izquierda' },
          { cmd: 'justifyCenter', icon: '≡',   title: 'Centrar' },
          { cmd: 'justifyRight',  icon: '⬜↗', title: 'Derecha' },
        ].map(({ cmd, icon, title }) => (
          <button key={cmd} title={title} onMouseDown={e => { e.preventDefault(); exec(cmd); }} style={toolBtn}>
            {icon}
          </button>
        ))}
        <div style={sep} />
        <button onMouseDown={e => { e.preventDefault(); exec('insertUnorderedList'); }} style={toolBtn} title="Lista">• —</button>
        <button onMouseDown={e => { e.preventDefault(); exec('insertOrderedList'); }} style={toolBtn} title="Lista numerada">1.</button>
        <div style={sep} />
        <select defaultValue="" onChange={e => { exec('fontSize', e.target.value); e.target.value = ''; }}
          style={{ ...toolBtn, padding: '2px 4px', background: '#fff', border: '1px solid rgba(0,0,0,0.12)', borderRadius: '5px' }}>
          <option value="" disabled>Tamaño</option>
          {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{['10','12','14','18','22','28'][n-1]}px</option>)}
        </select>
        <input type="color" title="Color de texto" defaultValue="#1a1a1a"
          onInput={e => exec('foreColor', (e.target as HTMLInputElement).value)}
          style={{ width: '28px', height: '28px', border: 'none', cursor: 'pointer', borderRadius: '5px', padding: '2px' }} />
        <button onMouseDown={e => {
          e.preventDefault();
          const url = prompt('URL del enlace:');
          if (url) exec('createLink', url);
        }} style={toolBtn} title="Enlace">🔗</button>
        <button onMouseDown={e => { e.preventDefault(); exec('unlink'); }} style={toolBtn} title="Quitar enlace">🚫🔗</button>
        <div style={sep} />
        <button onMouseDown={e => { e.preventDefault(); exec('removeFormat'); }} style={toolBtn} title="Limpiar formato">✖ fmt</button>
      </div>
      {/* Editable div */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => { if (editorRef.current) u({ html: editorRef.current.innerHTML }); }}
        dangerouslySetInnerHTML={{ __html: b.html }}
        style={{
          minHeight: '100px', padding: '12px', borderRadius: '8px',
          border: '1px solid rgba(0,0,0,0.12)', background: '#fafafa',
          fontFamily: 'Georgia,serif', fontSize: '15px', color: '#1a1a1a',
          lineHeight: 1.75, outline: 'none',
        }}
      />
      <Field label="Alineación">
        <AlignToggle value={b.align} onChange={v => u({ align: v as TextBlock['align'] })} />
      </Field>
    </>
  );
}

/* ── Image panel ─────────────────────────────────────────────── */
function ImagePanel({ b, u }: { b: ImageBlock; u: (p: Partial<ImageBlock>) => void }) {
  return (
    <>
      <ImageUploader
        label="Imagen"
        previewSrc={b.src}
        onUploaded={url => u({ src: url })}
      />
      {/* Or paste URL */}
      <Field label="O pega URL directamente">
        <input value={b.src} onChange={e => u({ src: e.target.value })}
          placeholder="https://…" style={inp} />
      </Field>
      <Field label="Texto alternativo (SEO)">
        <input value={b.alt} onChange={e => u({ alt: e.target.value })} style={inp} />
      </Field>
      <Row>
        <Field label="Alineación">
          <select value={b.align} onChange={e => u({ align: e.target.value as ImageBlock['align'] })} style={sel}>
            <option value="full">Full ancho</option>
            <option value="center">Centrada</option>
            <option value="left">Izquierda</option>
            <option value="right">Derecha</option>
          </select>
        </Field>
        {b.align !== 'full' && (
          <Field label={`Ancho: ${b.maxWidthPct}%`}>
            <input type="range" min={20} max={100} step={5} value={b.maxWidthPct}
              onChange={e => u({ maxWidthPct: +e.target.value })}
              style={{ width: '100%', accentColor: '#856d47' }} />
          </Field>
        )}
      </Row>
      <Field label="Pie de imagen (caption)">
        <input value={b.caption} onChange={e => u({ caption: e.target.value })} style={inp} placeholder="Texto pequeño bajo la imagen" />
      </Field>
      <Field label="Enlace al hacer clic (opcional)">
        <input value={b.link} onChange={e => u({ link: e.target.value })} style={inp} placeholder="https://…" />
      </Field>
    </>
  );
}

/* ── Button panel ────────────────────────────────────────────── */
function ButtonPanel({ b, u }: { b: ButtonBlock; u: (p: Partial<ButtonBlock>) => void }) {
  return (
    <>
      <Row>
        <Field label="Texto del botón">
          <input value={b.text} onChange={e => u({ text: e.target.value })} style={inp} />
        </Field>
        <Field label="URL">
          <input value={b.url} onChange={e => u({ url: e.target.value })} style={inp} placeholder="https://…" />
        </Field>
      </Row>
      <Row>
        <Field label="Fondo"><ColorInput value={b.bgColor} onChange={v => u({ bgColor: v })} /></Field>
        <Field label="Texto"><ColorInput value={b.textColor} onChange={v => u({ textColor: v })} /></Field>
      </Row>
      <Row>
        <Field label="Forma">
          <select value={b.radius} onChange={e => u({ radius: e.target.value as ButtonBlock['radius'] })} style={sel}>
            <option value="pill">Pill</option>
            <option value="rounded">Redondeado</option>
            <option value="square">Cuadrado</option>
          </select>
        </Field>
        <Field label="Tamaño">
          <select value={b.size} onChange={e => u({ size: e.target.value as ButtonBlock['size'] })} style={sel}>
            <option value="sm">Pequeño</option>
            <option value="md">Mediano</option>
            <option value="lg">Grande</option>
          </select>
        </Field>
        <Field label="Alineación">
          <AlignToggle value={b.align} onChange={v => u({ align: v as ButtonBlock['align'] })} />
        </Field>
      </Row>
    </>
  );
}

/* ── Divider panel ───────────────────────────────────────────── */
function DividerPanel({ b, u }: { b: DividerBlock; u: (p: Partial<DividerBlock>) => void }) {
  return (
    <Row>
      <Field label="Estilo">
        <select value={b.style} onChange={e => u({ style: e.target.value as DividerBlock['style'] })} style={sel}>
          <option value="solid">Sólido</option>
          <option value="dashed">Guiones</option>
          <option value="dotted">Puntos</option>
        </select>
      </Field>
      <Field label="Color"><ColorInput value={b.color} onChange={v => u({ color: v })} /></Field>
      <Field label={`Ancho: ${b.widthPct}%`}>
        <input type="range" min={20} max={100} step={5} value={b.widthPct}
          onChange={e => u({ widthPct: +e.target.value })}
          style={{ width: '100%', accentColor: '#856d47' }} />
      </Field>
      <Field label={`Grosor: ${b.thickness}px`}>
        <input type="range" min={1} max={8} value={b.thickness}
          onChange={e => u({ thickness: +e.target.value })}
          style={{ width: '100%', accentColor: '#856d47' }} />
      </Field>
    </Row>
  );
}

/* ── Spacer panel ────────────────────────────────────────────── */
function SpacerPanel({ b, u }: { b: SpacerBlock; u: (p: Partial<SpacerBlock>) => void }) {
  return (
    <Field label={`Altura: ${b.height}px`}>
      <input type="range" min={8} max={80} step={4} value={b.height}
        onChange={e => u({ height: +e.target.value })}
        style={{ width: '100%', accentColor: '#856d47' }} />
    </Field>
  );
}

/* ── Columns panel ───────────────────────────────────────────── */
function ColumnsPanel({ b, u, accentColor }: { b: ColumnsBlock; u: (p: Partial<ColumnsBlock>) => void; accentColor: string }) {
  const leftRef  = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  return (
    <>
      <Field label={`Columna izquierda (${b.leftWidthPct}%) — texto enriquecido`}>
        <div
          ref={leftRef}
          contentEditable
          suppressContentEditableWarning
          onInput={() => { if (leftRef.current) u({ leftHtml: leftRef.current.innerHTML }); }}
          dangerouslySetInnerHTML={{ __html: b.leftHtml }}
          style={{ minHeight: '60px', padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.12)', background: '#fafafa', fontFamily: 'system-ui', fontSize: '14px', outline: 'none' }}
        />
      </Field>
      <Field label={`Columna derecha (${100 - b.leftWidthPct}%) — texto o imagen`}>
        <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
          {!b.rightImageSrc && (
            <div
              ref={rightRef}
              contentEditable
              suppressContentEditableWarning
              onInput={() => { if (rightRef.current) u({ rightHtml: rightRef.current.innerHTML }); }}
              dangerouslySetInnerHTML={{ __html: b.rightHtml }}
              style={{ minHeight: '60px', padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.12)', background: '#fafafa', fontFamily: 'system-ui', fontSize: '14px', outline: 'none' }}
            />
          )}
          <ImageUploader
            label={b.rightImageSrc ? 'Cambiar imagen de la derecha' : 'O pon una imagen a la derecha'}
            previewSrc={b.rightImageSrc}
            onUploaded={url => u({ rightImageSrc: url })}
          />
          {b.rightImageSrc && (
            <button onClick={() => u({ rightImageSrc: '' })} style={{ ...ctrlBtn, fontSize: '0.7rem', padding: '4px 10px', color: '#b0392a' }}>
              Quitar imagen → usar texto
            </button>
          )}
        </div>
      </Field>
      <Field label={`Proporción izquierda: ${b.leftWidthPct}% / ${100 - b.leftWidthPct}%`}>
        <input type="range" min={30} max={70} step={5} value={b.leftWidthPct}
          onChange={e => u({ leftWidthPct: +e.target.value })}
          style={{ width: '100%', accentColor }} />
      </Field>
    </>
  );
}

/* ── Callout panel ───────────────────────────────────────────── */
function CalloutPanel({ b, u, accentColor }: { b: CalloutBlock; u: (p: Partial<CalloutBlock>) => void; accentColor: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <>
      <Field label="Contenido del callout">
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={() => { if (ref.current) u({ html: ref.current.innerHTML }); }}
          dangerouslySetInnerHTML={{ __html: b.html }}
          style={{ minHeight: '60px', padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.12)', background: '#fafafa', fontFamily: 'system-ui', fontSize: '14px', outline: 'none' }}
        />
      </Field>
      <Row>
        <Field label="Fondo"><ColorInput value={b.bgColor} onChange={v => u({ bgColor: v })} /></Field>
        <Field label="Borde izquierdo"><ColorInput value={b.borderColor} onChange={v => u({ borderColor: v })} /></Field>
        <Field label={`Radio: ${b.radius}px`}>
          <input type="range" min={0} max={20} value={b.radius}
            onChange={e => u({ radius: +e.target.value })}
            style={{ width: '100%', accentColor }} />
        </Field>
      </Row>
    </>
  );
}

/* ── Small shared sub-components ────────────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
      <span style={lbl}>{label}</span>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>{children}</div>;
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <input type="color" value={value.startsWith('rgba') ? '#856d47' : value}
        onChange={e => onChange(e.target.value)}
        style={{ width: '32px', height: '32px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: '6px', cursor: 'pointer', padding: '2px' }} />
      <input value={value} onChange={e => onChange(e.target.value)}
        style={{ ...inp, width: '92px', fontFamily: 'monospace', fontSize: '0.73rem', padding: '5px 7px' }} />
    </div>
  );
}

function AlignToggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: '3px' }}>
      {(['left', 'center', 'right'] as const).map(a => (
        <button key={a} onClick={() => onChange(a)} style={{
          padding: '5px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer',
          background: value === a ? '#0d221e' : 'rgba(0,0,0,0.05)',
          color: value === a ? '#fff' : '#888', fontSize: '0.75rem',
        }}>
          {a === 'left' ? '⬅' : a === 'center' ? '↔' : '➡'}
        </button>
      ))}
    </div>
  );
}

function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const id = `toggle-${Math.random().toString(36).slice(2)}`;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <input type="checkbox" id={id} checked={value} onChange={e => onChange(e.target.checked)}
        style={{ width: '15px', height: '15px', accentColor: '#0d221e', cursor: 'pointer' }} />
      <label htmlFor={id} style={{ fontFamily: 'system-ui', fontSize: '0.78rem', color: '#444', cursor: 'pointer' }}>{label}</label>
    </div>
  );
}

/* ── Shared styles ───────────────────────────────────────────── */
const lbl: React.CSSProperties = {
  fontFamily: 'system-ui', fontSize: '0.6rem', fontWeight: 700,
  letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.38)',
};
const inp: React.CSSProperties = {
  width: '100%', padding: '8px 10px', fontFamily: 'system-ui', fontSize: '0.83rem',
  border: '1px solid rgba(0,0,0,0.12)', borderRadius: '8px', background: '#fafafa',
  outline: 'none', boxSizing: 'border-box', color: '#1a1a1a',
};
const sel: React.CSSProperties = {
  ...inp, cursor: 'pointer',
};
const toolBtn: React.CSSProperties = {
  padding: '4px 7px', borderRadius: '5px', border: 'none',
  background: 'rgba(0,0,0,0.04)', cursor: 'pointer',
  fontFamily: 'system-ui', fontSize: '0.75rem', color: '#444',
};
const sep: React.CSSProperties = {
  width: '1px', background: 'rgba(0,0,0,0.1)', alignSelf: 'stretch',
  margin: '0 2px',
};
const ctrlBtn: React.CSSProperties = {
  padding: '3px 7px', borderRadius: '5px', border: 'none',
  background: 'rgba(0,0,0,0.05)', cursor: 'pointer',
  fontFamily: 'system-ui', fontSize: '0.72rem', color: '#666',
};
const hint: React.CSSProperties = {
  fontFamily: 'system-ui', fontSize: '0.8rem', color: '#bbb', margin: 0,
};
