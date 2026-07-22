'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { trackChatOpen } from '@/app/lib/analytics';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const LG = {
  background: 'linear-gradient(160deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.08) 55%, rgba(255,255,255,0.22) 100%)',
  backdropFilter: 'blur(52px) saturate(200%) brightness(1.05)',
  WebkitBackdropFilter: 'blur(52px) saturate(200%) brightness(1.05)',
  border: '1px solid rgba(255,255,255,0.48)',
  boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.88), inset 0 -0.5px 0 rgba(255,255,255,0.12), 0 24px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.10)',
};

const SUGGESTIONS = [
  '¿Dónde están ubicados?',
  '¿Qué incluye la habitación?',
  '¿Cuál es el horario de check-in?',
  '¿Tienen estacionamiento?',
];

export default function AIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      trackChatOpen();
      if (messages.length === 0) {
        setMessages([{
          role: 'assistant',
          content: '¡Hola! Soy el asistente de Hotel El Encino Santiago. ¿En qué puedo ayudarte? 🏨',
        }]);
      }
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg: Message = { role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          history: messages.slice(-6),
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Lo siento, hubo un problema. Contáctanos por WhatsApp al +52 (81) 2381 6588.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ── Floating button ── */}
      <motion.button
        onClick={() => setOpen(v => !v)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Abrir asistente"
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 48,
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          /* Liquid Glass button */
          background: open
            ? 'linear-gradient(135deg, rgba(133,109,71,0.72) 0%, rgba(133,109,71,0.48) 100%)'
            : 'linear-gradient(135deg, rgba(13,34,30,0.72) 0%, rgba(13,34,30,0.48) 100%)',
          backdropFilter: 'blur(32px) saturate(180%)',
          WebkitBackdropFilter: 'blur(32px) saturate(180%)',
          boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.5), 0 8px 32px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.12)',
          transition: 'background 0.3s ease',
        }}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.svg key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}
              width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </motion.svg>
          ) : (
            <motion.svg key="chat" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ duration: 0.2 }}
              width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.button>

      {/* ── Chat window ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.35, ease: [0.5, 0.2, 0.1, 1.14] }}
            style={{
              position: 'fixed',
              bottom: '5.5rem',
              right: '1.5rem',
              zIndex: 48,
              width: 'min(340px, calc(100vw - 3rem))',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              ...LG,
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 'calc(100dvh - 8rem)',
            }}
          >
            {/* Specular top */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: '8%',
              right: '8%',
              height: '0.5px',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.9) 40%, rgba(255,255,255,0.9) 60%, transparent)',
              pointerEvents: 'none',
              zIndex: 2,
            }} />

            {/* Header */}
            <div style={{
              padding: '16px 20px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(133,109,71,0.7), rgba(13,34,30,0.7))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid rgba(255,255,255,0.3)',
                flexShrink: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.6">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <div>
                <p style={{ fontFamily: 'var(--serif)', fontSize: '0.85rem', color: 'var(--ink)', letterSpacing: '0.05em', lineHeight: 1.2 }}>
                  El Encino Santiago
                </p>
                <p style={{ fontFamily: 'var(--sans)', fontSize: '0.62rem', color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Asistente · En línea
                </p>
              </div>
            </div>

            {/* Messages */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              minHeight: '200px',
            }}>
              {messages.map((m, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                }}>
                  <div style={{
                    maxWidth: '82%',
                    padding: '10px 14px',
                    borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    fontFamily: 'var(--sans)',
                    fontSize: '0.82rem',
                    lineHeight: 1.5,
                    fontWeight: 300,
                    background: m.role === 'user'
                      ? 'linear-gradient(135deg, rgba(133,109,71,0.75), rgba(133,109,71,0.55))'
                      : 'rgba(255,255,255,0.55)',
                    color: m.role === 'user' ? '#fff' : 'var(--ink)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: m.role === 'user'
                      ? '1px solid rgba(133,109,71,0.3)'
                      : '1px solid rgba(255,255,255,0.6)',
                    boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.4)',
                  }}>
                    {m.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div style={{ display: 'flex', gap: '5px', padding: '4px 14px' }}>
                  {[0, 1, 2].map(i => (
                    <motion.div key={i}
                      animate={{ y: [0, -4, 0] }}
                      transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                      style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(133,109,71,0.5)' }}
                    />
                  ))}
                </div>
              )}

              {/* Quick suggestions — only when first msg */}
              {messages.length === 1 && !loading && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => send(s)} style={{
                      fontFamily: 'var(--sans)',
                      fontSize: '0.7rem',
                      color: 'var(--paper)',
                      background: 'linear-gradient(135deg, rgba(133,109,71,0.72) 0%, rgba(133,109,71,0.52) 100%)',
                      backdropFilter: 'blur(16px) saturate(160%)',
                      WebkitBackdropFilter: 'blur(16px) saturate(160%)',
                      border: '1px solid rgba(255,255,255,0.25)',
                      borderTop: '1px solid rgba(255,255,255,0.45)',
                      boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.45)',
                      borderRadius: 'var(--radius-pill)',
                      padding: '6px 13px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(133,109,71,0.92) 0%, rgba(133,109,71,0.72) 100%)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(133,109,71,0.72) 0%, rgba(133,109,71,0.52) 100%)'; }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{
              padding: '12px',
              borderTop: '1px solid rgba(255,255,255,0.2)',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
            }}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') send(input); }}
                placeholder="Escribe tu pregunta…"
                maxLength={300}
                style={{
                  flex: 1,
                  fontFamily: 'var(--sans)',
                  fontSize: '0.82rem',
                  color: 'var(--ink)',
                  background: 'rgba(255,255,255,0.55)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.6)',
                  borderRadius: 'var(--radius-pill)',
                  padding: '10px 16px',
                  outline: 'none',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)',
                }}
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || loading}
                style={{
                  width: '36px', height: '36px',
                  borderRadius: '50%',
                  border: 'none',
                  cursor: input.trim() && !loading ? 'pointer' : 'default',
                  background: input.trim() && !loading
                    ? 'var(--warm)'
                    : 'rgba(133,109,71,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>

            {/* Footer */}
            <div style={{
              padding: '6px 16px 10px',
              textAlign: 'center',
              fontFamily: 'var(--sans)',
              fontSize: '0.58rem',
              color: 'var(--muted)',
              letterSpacing: '0.05em',
            }}>
              IA · Solo preguntas generales ·{' '}
              <a href="https://wa.me/528123816588" target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--warm)', textDecoration: 'none' }}>
                WhatsApp para reservas
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
