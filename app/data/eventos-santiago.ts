/**
 * EVENTOS Y FESTIVALES DE SANTIAGO, NUEVO LEÓN
 * ─────────────────────────────────────────────
 * Archivo de referencia para ajuste de tarifas en temporada alta.
 * Actualizar fechas cada año según confirmación oficial.
 *
 * TARIFAS HOTEL EL ENCINO:
 *   • Entre semana (Lun-Jue):  $1,500 MXN / noche
 *   • Fin de semana (Vie-Dom): $2,500 MXN / noche
 *   • Temporada de festival:   Precio especial (definir por evento)
 *
 * Para ajustar precios en temporada de festival,
 * consultar con Claude y proporcionar las fechas del evento.
 */

export interface Evento {
  nombre: string;
  fechaAprox: string;       // Fecha aproximada o rango
  tipo: 'festival' | 'feria' | 'temporada' | 'puente';
  impacto: 'alto' | 'medio' | 'bajo';
  descripcion: string;
  tarifaEspecial?: boolean; // true = aplicar sobreprecio
}

export const eventosSantiago: Evento[] = [
  {
    nombre: 'Santiago Cielo Mágico',
    fechaAprox: 'Octubre – Noviembre (varía cada año)',
    tipo: 'festival',
    impacto: 'alto',
    descripcion: 'Festival internacional de globos aerostáticos. Uno de los eventos más grandes del norte de México. Atrae miles de visitantes.',
    tarifaEspecial: true,
  },
  {
    nombre: 'Semana Santa',
    fechaAprox: 'Marzo – Abril (varía cada año)',
    tipo: 'temporada',
    impacto: 'alto',
    descripcion: 'Temporada alta. Alta demanda de hospedaje en toda la región de Santiago.',
    tarifaEspecial: true,
  },
  {
    nombre: 'Fiestas Patrias',
    fechaAprox: '13 – 16 de Septiembre',
    tipo: 'puente',
    impacto: 'alto',
    descripcion: 'Puente largo de Independencia. Alta ocupación hotelera.',
    tarifaEspecial: true,
  },
  {
    nombre: 'Año Nuevo',
    fechaAprox: '30 Diciembre – 2 Enero',
    tipo: 'temporada',
    impacto: 'alto',
    descripcion: 'Temporada navideña y año nuevo. Demanda muy alta.',
    tarifaEspecial: true,
  },
  {
    nombre: 'Puente de Día de Muertos',
    fechaAprox: '1 – 3 de Noviembre',
    tipo: 'puente',
    impacto: 'medio',
    descripcion: 'Puente de día de muertos, temporada media-alta.',
    tarifaEspecial: false,
  },
  {
    nombre: 'Puente de Revolución',
    fechaAprox: '18 – 20 de Noviembre',
    tipo: 'puente',
    impacto: 'medio',
    descripcion: 'Puente largo de Revolución Mexicana.',
    tarifaEspecial: false,
  },
  {
    nombre: 'Festival Cola de Caballo',
    fechaAprox: 'Temporada de verano (Junio – Agosto)',
    tipo: 'temporada',
    impacto: 'medio',
    descripcion: 'Temporada alta de visitantes a la cascada Cola de Caballo en Santiago. Mayor flujo turístico.',
    tarifaEspecial: false,
  },
  {
    nombre: 'Puente de Navidad',
    fechaAprox: '24 – 26 de Diciembre',
    tipo: 'temporada',
    impacto: 'alto',
    descripcion: 'Navidad, temporada alta.',
    tarifaEspecial: true,
  },
  {
    nombre: 'Puente de Reyes',
    fechaAprox: '5 – 7 de Enero',
    tipo: 'puente',
    impacto: 'medio',
    descripcion: 'Puente de Reyes Magos.',
    tarifaEspecial: false,
  },
];

/**
 * Obtiene eventos con tarifa especial (temporada alta)
 */
export const eventosTarifaEspecial = eventosSantiago.filter(e => e.tarifaEspecial);

/**
 * Obtiene eventos de impacto alto
 */
export const eventosImpactoAlto = eventosSantiago.filter(e => e.impacto === 'alto');
