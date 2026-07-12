import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Términos y Condiciones — Hotel El Encino Santiago',
  description: 'Términos y condiciones de uso y hospedaje de Hotel El Encino Santiago, Nuevo León.',
  robots: { index: true, follow: true },
  alternates: { canonical: '/terminos' },
};

export default function TerminosPage() {
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
            Términos y Condiciones
          </h1>
          <p style={{ fontFamily: 'var(--sans)', fontSize: '0.85rem', color: 'rgba(250,250,250,0.45)', marginTop: '1rem' }}>
            Última actualización: 6 de abril de 2026
          </p>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: 'clamp(3rem, 6vw, 5rem) clamp(1.5rem, 5vw, 5rem)' }}>
        <div style={{ fontFamily: 'var(--sans)', fontSize: '0.95rem', lineHeight: 1.8, color: 'var(--ink)' }}>

          <Section title="1. Aceptación">
            <p>
              Al realizar una reservación o utilizar los servicios de <strong>Hotel El Encino Santiago</strong>, usted acepta estos Términos y Condiciones en su totalidad. Si no está de acuerdo con alguna parte, le pedimos no utilizar nuestros servicios.
            </p>
          </Section>

          <Section title="2. Reservaciones">
            <ul style={{ paddingLeft: '1.5rem', lineHeight: 2 }}>
              <li>Las reservaciones están sujetas a disponibilidad.</li>
              <li>Una reservación se considera <strong>confirmada</strong> únicamente cuando el huésped recibe un correo de confirmación con número de folio.</li>
              <li>El huésped debe confirmar su llegada por WhatsApp dentro de las <strong>2 horas</strong> siguientes a realizar la reservación; de lo contrario, la habitación puede ser liberada.</li>
              <li>Nos reservamos el derecho de rechazar reservaciones a nuestra discreción, en cuyo caso se realizará el reembolso total.</li>
            </ul>
          </Section>

          <Section title="3. Tarifas y Pagos">
            <ul style={{ paddingLeft: '1.5rem', lineHeight: 2 }}>
              <li>Las tarifas se expresan en <strong>pesos mexicanos (MXN)</strong> e incluyen IVA cuando aplica.</li>
              <li>Los pagos en línea se procesan a través de <strong>Mercado Pago</strong>; Hotel El Encino no almacena datos de tarjetas.</li>
              <li>Las tarifas pueden variar por temporada, fechas especiales o disponibilidad. La tarifa confirmada al momento de la reservación es la que aplica.</li>
              <li>El pago en efectivo está disponible al momento del check-in para reservaciones con método de pago "pago en hotel".</li>
            </ul>
          </Section>

          <Section title="4. Cancelaciones y Reembolsos">
            <ul style={{ paddingLeft: '1.5rem', lineHeight: 2 }}>
              <li><strong>Cancelación gratuita:</strong> hasta 48 horas antes de la fecha de check-in.</li>
              <li><strong>Cancelación tardía:</strong> menos de 48 horas antes, se cobra el equivalente a <strong>1 noche</strong> de hospedaje.</li>
              <li><strong>No show:</strong> si no se presenta sin cancelar, se cobra el total de la reservación.</li>
              <li>Los reembolsos por pagos en línea (Mercado Pago) se procesan en un plazo de <strong>5 a 10 días hábiles</strong> al método de pago original.</li>
              <li>En caso de cancelación por causas imputables al hotel (fuerza mayor, daños, etc.), se realizará el reembolso total sin penalización.</li>
            </ul>
          </Section>

          <Section title="5. Check-in y Check-out">
            <ul style={{ paddingLeft: '1.5rem', lineHeight: 2 }}>
              <li><strong>Check-in:</strong> desde las 3:00 PM (15:00 hrs).</li>
              <li><strong>Check-out:</strong> antes de las 12:00 PM.</li>
              <li>El early check-in y late check-out están sujetos a disponibilidad y pueden tener cargo adicional.</li>
              <li>Se solicitará identificación oficial vigente al momento del check-in.</li>
            </ul>
          </Section>

          <Section title="6. Políticas del Hotel">
            <ul style={{ paddingLeft: '1.5rem', lineHeight: 2 }}>
              <li><strong>No se permiten mascotas.</strong></li>
              <li><strong>Prohibido fumar</strong> dentro de las habitaciones y áreas comunes.</li>
              <li>Respeto al horario de silencio: 10:00 PM a 8:00 AM.</li>
              <li>El hotel no se hace responsable por objetos de valor no resguardados en la habitación.</li>
              <li>Daños a las instalaciones serán cargados a la tarjeta o depósito del huésped.</li>
              <li>El acceso a las instalaciones es exclusivo para huéspedes registrados.</li>
            </ul>
          </Section>

          <Section title="7. Directorio de Negocios">
            <p>
              Los negocios que se registran en nuestro directorio (&quot;Guía Santiago&quot;) aceptan adicionalmente:
            </p>
            <ul style={{ paddingLeft: '1.5rem', lineHeight: 2, marginTop: '0.75rem' }}>
              <li>Que la información publicada es verídica y de su responsabilidad.</li>
              <li>Que Hotel El Encino puede moderar o retirar contenido que viole estas condiciones o sea inapropiado.</li>
              <li>Que el listado gratuito no implica ninguna relación comercial o de representación con Hotel El Encino.</li>
              <li>Que sus datos de contacto pueden ser visibles para usuarios del directorio.</li>
            </ul>
          </Section>

          <Section title="8. Propiedad Intelectual">
            <p>
              Todo el contenido de este sitio web (textos, fotografías, logotipos, diseño) es propiedad de Hotel El Encino Santiago o se usa bajo licencia. Queda prohibida su reproducción total o parcial sin autorización escrita.
            </p>
          </Section>

          <Section title="9. Limitación de Responsabilidad">
            <p>
              Hotel El Encino no será responsable por daños indirectos, incidentales o consecuentes derivados del uso de nuestros servicios, incluyendo pero no limitado a: pérdida de equipaje, accidentes fuera de las instalaciones del hotel, o interrupciones del servicio por causas de fuerza mayor (desastres naturales, actos de autoridad, pandemia, etc.).
            </p>
          </Section>

          <Section title="10. Ley Aplicable y Jurisdicción">
            <p>
              Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Para cualquier controversia, las partes se someten a la jurisdicción de los tribunales competentes del Estado de Nuevo León, renunciando a cualquier otro fuero que pudiera corresponderles por razón de sus domicilios presentes o futuros.
            </p>
          </Section>

          <Section title="11. Contacto">
            <p>
              Para aclaraciones sobre estos términos:
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
            <Link href="/privacidad" style={{ color: 'var(--warm)', fontFamily: 'var(--sans)', fontSize: '0.85rem' }}>
              Política de Privacidad
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
