import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Política de Privacidad — Hotel El Encino Santiago',
  description: 'Política de privacidad y tratamiento de datos personales de Hotel El Encino Santiago, Nuevo León.',
  robots: { index: true, follow: true },
  alternates: { canonical: '/privacidad' },
};

export default function PrivacidadPage() {
  return (
    <main style={{ background: 'var(--paper)', color: 'var(--ink)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'var(--forest)', padding: 'clamp(4rem, 8vw, 7rem) clamp(1.5rem, 5vw, 5rem) clamp(3rem, 6vw, 5rem)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <Link
            href="/"
            style={{ fontFamily: 'var(--sans)', fontSize: '0.75rem', color: 'rgba(250,250,250,0.5)', textDecoration: 'none', letterSpacing: '0.12em', textTransform: 'uppercase' }}
          >
            ← Hotel El Encino
          </Link>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', fontWeight: 400, color: 'var(--paper)', marginTop: '1.5rem', lineHeight: 1.1 }}>
            Política de Privacidad
          </h1>
          <p style={{ fontFamily: 'var(--sans)', fontSize: '0.85rem', color: 'rgba(250,250,250,0.45)', marginTop: '1rem' }}>
            Última actualización: 6 de abril de 2026
          </p>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: 'clamp(3rem, 6vw, 5rem) clamp(1.5rem, 5vw, 5rem)' }}>
        <div style={{ fontFamily: 'var(--sans)', fontSize: '0.95rem', lineHeight: 1.8, color: 'var(--ink)' }}>

          <Section title="1. Responsable del Tratamiento">
            <p>
              <strong>Hotel El Encino Santiago</strong>, con domicilio en Hermenegildo Galeana 200, Col. Centro, Santiago, Nuevo León, C.P. 67310, México, es responsable del tratamiento de sus datos personales conforme a la <em>Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)</em>.
            </p>
            <p style={{ marginTop: '1rem' }}>
              Contacto de privacidad: <a href="mailto:elencino_22@hotmail.com" style={{ color: 'var(--warm)' }}>elencino_22@hotmail.com</a>
            </p>
          </Section>

          <Section title="2. Datos que Recopilamos">
            <p>Recopilamos únicamente los datos necesarios para prestar el servicio de hospedaje:</p>
            <ul style={{ marginTop: '0.75rem', paddingLeft: '1.5rem', lineHeight: 2 }}>
              <li><strong>Datos de reservación:</strong> nombre completo, correo electrónico, teléfono, fechas de estancia, tipo de habitación.</li>
              <li><strong>Datos de pago:</strong> procesados exclusivamente por Mercado Pago; Hotel El Encino no almacena datos de tarjetas.</li>
              <li><strong>Datos de navegación:</strong> dirección IP, tipo de navegador, páginas visitadas (Google Analytics 4, anonimizado).</li>
              <li><strong>Datos de registro en directorio:</strong> nombre de negocio, correo electrónico, descripción e imágenes (solo si usa nuestra plataforma de directorio).</li>
            </ul>
          </Section>

          <Section title="3. Finalidad del Tratamiento">
            <ul style={{ paddingLeft: '1.5rem', lineHeight: 2 }}>
              <li>Gestionar y confirmar su reservación de hospedaje.</li>
              <li>Procesar pagos en línea a través de Mercado Pago.</li>
              <li>Enviar confirmaciones, recordatorios y comunicaciones relacionadas con su estancia.</li>
              <li>Mejorar la experiencia del usuario en nuestro sitio web (analytics anonimizado).</li>
              <li>Cumplir obligaciones legales y fiscales.</li>
            </ul>
            <p style={{ marginTop: '1rem' }}>
              <strong>No vendemos, compartimos ni cedemos</strong> sus datos personales a terceros con fines comerciales o publicitarios sin su consentimiento expreso.
            </p>
          </Section>

          <Section title="4. Transferencia de Datos">
            <p>Sus datos pueden ser transferidos, únicamente para las finalidades descritas, a:</p>
            <ul style={{ paddingLeft: '1.5rem', lineHeight: 2, marginTop: '0.75rem' }}>
              <li><strong>Mercado Pago</strong> — procesamiento de pagos.</li>
              <li><strong>Google LLC</strong> — analytics y servicios de calendario (bajo el escudo de privacidad UE-EE.UU. y cláusulas contractuales estándar).</li>
              <li><strong>Resend Inc.</strong> — envío de correos transaccionales.</li>
              <li><strong>Supabase Inc.</strong> — almacenamiento de base de datos (servidores en la región de EE.UU. / AWS).</li>
              <li><strong>Autoridades competentes</strong> — cuando sea requerido por ley.</li>
            </ul>
          </Section>

          <Section title="5. Derechos ARCO">
            <p>
              Como titular de sus datos, usted tiene derecho a <strong>Acceder, Rectificar, Cancelar u Oponerse (ARCO)</strong> al tratamiento de sus datos personales, así como a revocar su consentimiento en cualquier momento, enviando una solicitud a:{' '}
              <a href="mailto:elencino_22@hotmail.com" style={{ color: 'var(--warm)' }}>elencino_22@hotmail.com</a>
            </p>
            <p style={{ marginTop: '1rem' }}>
              Su solicitud deberá incluir: nombre completo, descripción clara del derecho a ejercer, y cualquier documento que facilite la localización de sus datos. Responderemos en un plazo máximo de 20 días hábiles.
            </p>
          </Section>

          <Section title="6. Cookies y Tecnologías de Rastreo">
            <p>
              Utilizamos cookies propias y de terceros (Google Analytics 4) para analizar el uso del sitio de forma anónima y agregada. Puede deshabilitar las cookies en la configuración de su navegador; esto no afectará su capacidad de realizar una reservación.
            </p>
            <p style={{ marginTop: '1rem' }}>
              No utilizamos cookies de rastreo publicitario de terceros.
            </p>
          </Section>

          <Section title="7. Seguridad">
            <p>
              Implementamos medidas técnicas y organizativas para proteger sus datos: cifrado en tránsito (HTTPS/TLS), control de acceso basado en roles, y almacenamiento en infraestructura con políticas de seguridad estrictas. Los datos de pago son manejados íntegramente por Mercado Pago bajo cumplimiento PCI DSS.
            </p>
          </Section>

          <Section title="8. Retención de Datos">
            <p>
              Conservamos sus datos de reservación durante el período de su estancia más <strong>5 años</strong> conforme a obligaciones fiscales y contables. Los datos de analytics se conservan por <strong>26 meses</strong> (configuración de Google Analytics 4).
            </p>
          </Section>

          <Section title="9. Cambios a esta Política">
            <p>
              Podemos actualizar esta política periódicamente. Publicaremos la versión actualizada en esta página con la nueva fecha de vigencia. Si los cambios son sustanciales, lo notificaremos por correo electrónico a los huéspedes con reservaciones activas.
            </p>
          </Section>

          <Section title="10. Contacto">
            <p>
              Para cualquier duda sobre esta política o el tratamiento de sus datos personales, contáctenos:
            </p>
            <address style={{ fontStyle: 'normal', marginTop: '1rem', lineHeight: 2, color: 'var(--muted)' }}>
              Hotel El Encino Santiago<br />
              Hermenegildo Galeana 200, Col. Centro<br />
              Santiago, Nuevo León, C.P. 67310, México<br />
              <a href="mailto:elencino_22@hotmail.com" style={{ color: 'var(--warm)' }}>elencino_22@hotmail.com</a><br />
              <a href="tel:+528123816588" style={{ color: 'var(--warm)' }}>+52 (81) 2381 6588</a>
            </address>
          </Section>

          <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <Link href="/terminos" style={{ color: 'var(--warm)', fontFamily: 'var(--sans)', fontSize: '0.85rem' }}>
              Términos y Condiciones
            </Link>
            <Link href="/" style={{ color: 'var(--muted)', fontFamily: 'var(--sans)', fontSize: '0.85rem' }}>
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '2.5rem' }}>
      <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.25rem', fontWeight: 400, color: 'var(--forest)', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
        {title}
      </h2>
      {children}
    </section>
  );
}
