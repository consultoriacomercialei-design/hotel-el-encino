/**
 * /admin/hospedajes/nuevo — alta de un listing de hospedaje (super-admin).
 */
import NuevoHospedajeForm from './NuevoHospedajeForm';

export const dynamic = 'force-dynamic';

export default function NuevoHospedajePage() {
  return (
    <div style={{ padding: '1.5rem', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#283820', marginBottom: '0.25rem' }}>
        Nuevo hospedaje
      </h1>
      <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
        Crea una propiedad con sus habitaciones y tarifas. El dueño debe tener cuenta con verificación
        de pagos (Stripe) completa para recibir las reservas.
      </p>
      <NuevoHospedajeForm />
    </div>
  );
}
