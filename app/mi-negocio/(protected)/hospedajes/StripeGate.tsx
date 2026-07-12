'use client';

import { useState } from 'react';
import { loadConnectAndInitialize, type StripeConnectInstance } from '@stripe/connect-js';
import { ConnectComponentsProvider, ConnectAccountOnboarding } from '@stripe/react-connect-js';
import { host, hostJson, type Me } from './host';
import { C, card, Button, Banner, muted } from './ui';

interface SessionResp {
  account_id: string;
  client_secret: string;
  publishable_key: string;
  onboarding_complete: boolean;
}

/**
 * Gate de cobros: convierte al usuario en anfitrión (organizer) y ejecuta el
 * onboarding embebido de Stripe Connect en la web (mismo endpoint que iOS).
 * Al terminar, verifica el estado real y avisa al padre para refrescar.
 */
export default function StripeGate({ me, onDone }: { me: Me | null; onDone: () => void }) {
  const [phase, setPhase] = useState<'idle' | 'starting' | 'onboarding' | 'done'>('idle');
  const [error, setError] = useState('');
  const [connect, setConnect] = useState<StripeConnectInstance | null>(null);

  async function start() {
    setError('');
    setPhase('starting');
    try {
      // 1. Asegura rol organizer (idempotente).
      if (me?.role !== 'organizer') {
        await hostJson('organizer/become', 'POST', {});
      }
      // 2. Crea la cuenta Express + Account Session.
      const session = await hostJson<SessionResp>('organizer/onboarding/session', 'POST', {});
      if (session.onboarding_complete) {
        onDone();
        return;
      }
      // 3. Inicializa el SDK embebido; reusa el primer secret y luego pide frescos.
      let firstSecret: string | null = session.client_secret;
      const instance = loadConnectAndInitialize({
        publishableKey: session.publishable_key,
        fetchClientSecret: async () => {
          if (firstSecret) {
            const s = firstSecret;
            firstSecret = null;
            return s;
          }
          const fresh = await hostJson<SessionResp>('organizer/onboarding/session', 'POST', {});
          return fresh.client_secret;
        },
        appearance: {
          variables: {
            colorPrimary: '#0d221e',
            fontFamily: 'system-ui, sans-serif',
            borderRadius: '12px',
          },
        },
      });
      setConnect(instance);
      setPhase('onboarding');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar la verificación.');
      setPhase('idle');
    }
  }

  async function handleExit() {
    setPhase('done');
    try {
      const res = await host<{ onboarding_complete: boolean }>('organizer/onboarding/complete', { method: 'POST' });
      if (!res.onboarding_complete) {
        setError('La verificación aún no está completa. Puedes retomarla cuando quieras.');
      }
    } catch {
      /* el webhook la completará de forma asíncrona */
    } finally {
      onDone();
    }
  }

  if (phase === 'onboarding' && connect) {
    return (
      <div style={card}>
        <ConnectComponentsProvider connectInstance={connect}>
          <ConnectAccountOnboarding onExit={handleExit} />
        </ConnectComponentsProvider>
      </div>
    );
  }

  return (
    <div style={{ ...card, background: 'linear-gradient(135deg, #0d221e 0%, #1a3d35 100%)', color: '#faf8f4' }}>
      <p style={{ fontFamily: C.serif, fontSize: '1.1rem', margin: '0 0 6px' }}>
        Activa tus cobros para publicar
      </p>
      <p style={{ ...muted, color: 'rgba(250,248,244,0.72)', marginBottom: '1.25rem' }}>
        Verifica tu identidad y cuenta bancaria con Stripe (seguro, toma unos minutos). Recibes los pagos
        de tus reservas directo a tu cuenta; Santiapp cobra una comisión por transacción.
      </p>
      {error && <Banner tone="warn">{error}</Banner>}
      <Button onClick={start} disabled={phase === 'starting'} style={{ background: '#faf8f4', color: '#0d221e' }}>
        {phase === 'starting' ? 'Preparando…' : me?.stripe_account_id ? 'Continuar verificación' : 'Activar cobros'}
      </Button>
    </div>
  );
}
