/**
 * Defaults de precios y add-ons del hotel. Viven aquí (no en el route file)
 * porque los route handlers de App Router NO pueden exportar constantes
 * arbitrarias — solo GET/POST/etc. + `config`. Turbopack lo permitía, pero el
 * build de webpack (y las versiones nuevas de Next) lo rechazan.
 *
 * Consumidores: `app/api/public/hotel-config/route.ts` (fallback) y
 * `app/admin/(protected)/configuracion/actions.ts`.
 */

import type { Season } from './pricing';

export const DEFAULT_PRICES = {
  weekday:        1500,
  weekend:        2500,
  extra_adult:     500,
  base_occupancy:    2,  // adultos incluidos en la tarifa base, por habitación
  max_occupancy:     4,  // tope de personas por habitación (más → otra habitación)
  special_extra:   500,  // @deprecated — migrado a `seasons`
  semana_santa:   3000,  // @deprecated — migrado a `seasons`
};

/**
 * Temporadas por defecto (key `seasons` de hotel_settings). Punto de partida ya
 * acotado a fechas reales — antes estaban hardcodeadas por mes completo en el
 * modal. El dueño las edita/activa/borra desde /admin/configuracion.
 */
export const DEFAULT_SEASONS: Season[] = [
  { id: 'semana-santa',    label: 'Semana Santa',       active: true,  type: 'flat',      amount: 3000, ranges: [{ from: '2026-03-28', to: '2026-04-05' }] },
  { id: 'fiestas-patrias', label: 'Fiestas Patrias',    active: true,  type: 'surcharge', amount: 1000, ranges: [{ from: '2026-09-12', to: '2026-09-17' }] },
  { id: 'cielo-magico',    label: 'Cielo Mágico',       active: false, type: 'surcharge', amount:  500, ranges: [{ from: '2026-10-15', to: '2026-11-15' }] },
  { id: 'navidad',         label: 'Temporada Navideña', active: false, type: 'surcharge', amount:  500, ranges: [{ from: '2026-12-20', to: '2026-12-26' }] },
  { id: 'ano-nuevo',       label: 'Año Nuevo',          active: false, type: 'surcharge', amount:  500, ranges: [{ from: '2026-12-30', to: '2027-01-02' }] },
];

export const DEFAULT_ADDONS = [
  { id: 'breakfast',    icon: '🥐', title: 'Desayuno continental', subtitle: '$280 por persona · café, fruta y pan',          unitPrice: 280, perNight: true,  perPerson: true,  active: true },
  { id: 'late_checkout',icon: '⏰', title: 'Late check-out',       subtitle: 'Salida hasta las 2:00 PM (regular: 12:00 PM)',  unitPrice: 350, perNight: false,                   active: true },
  { id: 'early_checkin',icon: '🌅', title: 'Early check-in',       subtitle: 'Entrada desde las 10:00 AM (regular: 3:00 PM)', unitPrice: 350, perNight: false,                   active: true },
  { id: 'decoration',   icon: '🎉', title: 'Decoración especial',  subtitle: 'Globos, flores y mensaje personalizado',        unitPrice: 650, perNight: false,                   active: true },
  { id: 'wine',         icon: '🍷', title: 'Botella de vino',      subtitle: 'Vino tinto o blanco de bienvenida',             unitPrice: 480, perNight: false,                   active: true },
];
