/**
 * /reservacion/confirmada/preview
 * Static design preview — no Supabase needed.
 * Remove this file before deploying to production.
 */
import ConfirmadaClient from '../ConfirmadaClient';

const MOCK = {
  id:            'preview-id',
  folio:         'RSV-32',
  guestName:     'Fátima García Silva',
  guestEmail:    'fatima@ejemplo.com',
  guestPhone:    '81 1234 5678',
  roomLabel:     'Habitación Doble',
  checkIn:       'sábado, 19 de abril de 2026',
  checkOut:      'domingo, 20 de abril de 2026',
  nights:        1,
  total:         2500,
  guests:        '2 adultos',
  status:        'confirmed',
  paymentMethod: 'online',
  waUrl:         'https://wa.me/528119999318',
};

export default function PreviewConfirmada() {
  return <ConfirmadaClient reservation={MOCK} />;
}
