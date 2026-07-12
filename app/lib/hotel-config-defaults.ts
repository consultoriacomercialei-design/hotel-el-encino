/**
 * Defaults de precios y add-ons del hotel. Viven aquí (no en el route file)
 * porque los route handlers de App Router NO pueden exportar constantes
 * arbitrarias — solo GET/POST/etc. + `config`. Turbopack lo permitía, pero el
 * build de webpack (y las versiones nuevas de Next) lo rechazan.
 *
 * Consumidores: `app/api/public/hotel-config/route.ts` (fallback) y
 * `app/admin/(protected)/configuracion/actions.ts`.
 */

export const DEFAULT_PRICES = {
  weekday:       1500,
  weekend:       2500,
  extra_adult:    500,
  special_extra:  500,
  semana_santa:  3000,
};

export const DEFAULT_ADDONS = [
  { id: 'breakfast',    icon: '🥐', title: 'Desayuno continental', subtitle: '$280 por persona · café, fruta y pan',          unitPrice: 280, perNight: true,  perPerson: true,  active: true },
  { id: 'late_checkout',icon: '⏰', title: 'Late check-out',       subtitle: 'Salida hasta las 2:00 PM (regular: 12:00 PM)',  unitPrice: 350, perNight: false,                   active: true },
  { id: 'early_checkin',icon: '🌅', title: 'Early check-in',       subtitle: 'Entrada desde las 10:00 AM (regular: 3:00 PM)', unitPrice: 350, perNight: false,                   active: true },
  { id: 'decoration',   icon: '🎉', title: 'Decoración especial',  subtitle: 'Globos, flores y mensaje personalizado',        unitPrice: 650, perNight: false,                   active: true },
  { id: 'wine',         icon: '🍷', title: 'Botella de vino',      subtitle: 'Vino tinto o blanco de bienvenida',             unitPrice: 480, perNight: false,                   active: true },
];
