/**
 * /admin/configuracion
 * Manage room prices and add-ons — changes reflect immediately in the booking modal.
 */
import { loadSettingsAction } from './actions';
import ConfigForm from './ConfigForm';
import CalendarCleanupTool from './CalendarCleanupTool';

export default async function ConfiguracionPage() {
  const { prices, addons } = await loadSettingsAction();

  return (
    <div style={{ maxWidth: '720px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '1.35rem', fontWeight: 700, color: '#1a1a1a' }}>Configuración</h1>
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b6b6b' }}>
          Precios de habitaciones y add-ons del formulario de reserva. Los cambios aplican en tiempo real sin redeploy.
        </p>
      </div>

      <ConfigForm initialPrices={prices} initialAddons={addons} />
      <CalendarCleanupTool />
    </div>
  );
}
