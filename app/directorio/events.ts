export type EventCategory = 'religioso' | 'gastronomico' | 'cultural' | 'aventura' | 'festival' | 'comunidad';

export interface GuiaEvent {
  id: string;
  title: string;
  category: EventCategory;
  startDate: string;   // 'YYYY-MM-DD'
  endDate: string;     // 'YYYY-MM-DD'
  time?: string;       // '20:00'
  location: string;
  shortDesc: string;
  price: string;
  src: string;
  alt: string;
  tag?: string;
  organizer?: string;
}

export const EVENT_CATEGORY_LABEL: Record<EventCategory, string> = {
  religioso:    'Religioso & Tradición',
  gastronomico: 'Gastronomía',
  cultural:     'Cultural',
  aventura:     'Aventura',
  festival:     'Festival',
  comunidad:    'Comunidad',
};

export const EVENT_CATEGORY_ICON: Record<EventCategory, string> = {
  religioso:    '✝',
  gastronomico: '🍖',
  cultural:     '🎭',
  aventura:     '🧗',
  festival:     '🎈',
  comunidad:    '🤝',
};

export const events: GuiaEvent[] = [
  {
    id: 'via-crucis-2026',
    title: 'Vía Crucis de Semana Santa',
    category: 'religioso',
    startDate: '2026-04-03',
    endDate: '2026-04-03',
    time: '20:00',
    location: 'Centro Histórico de Santiago — sale de la Parroquia de Santiago Apóstol',
    shortDesc: 'Procesión nocturna del Vía Crucis por las calles del centro histórico. Antorchas encendidas, música sacra y tradición centenaria.',
    price: 'Entrada libre',
    src: '/parroquia-santiago.jpg',
    alt: 'Vía Crucis Semana Santa Santiago NL, procesión nocturna',
    tag: '¡Esta semana!',
    organizer: 'Parroquia de Santiago Apóstol',
  },
  {
    id: 'callejoneada-abril-2026',
    title: 'Callejoneada Primaveral del Centro',
    category: 'cultural',
    startDate: '2026-04-18',
    endDate: '2026-04-18',
    time: '19:00',
    location: 'Calles del Centro Histórico, Santiago, N.L.',
    shortDesc: 'Recorre las calles históricas del centro al ritmo de estudiantinas y música regional. Vino, botanas y mucho ambiente.',
    price: 'Copa de vino incluida · $150 MXN',
    src: '/santiago-plaza.webp',
    alt: 'Callejoneada Santiago NL, música y tradición',
    tag: 'Próximo',
    organizer: 'Comerciantes del Centro Histórico',
  },
  {
    id: 'festival-cervecero-2026',
    title: 'Festival Cervecero de Santiago',
    category: 'gastronomico',
    startDate: '2026-05-23',
    endDate: '2026-05-24',
    time: '14:00',
    location: 'Zona Presa La Boca, Santiago, N.L.',
    shortDesc: 'Más de 20 cervecerías artesanales regiomontanas con vistas al lago. Comida, música en vivo y el mejor ambiente de primavera.',
    price: 'Entrada $100 MXN · Fichas para cervezas aparte',
    src: '/presadelaboca.webp',
    alt: 'Festival Cervecero Santiago NL, cervezas artesanales Presa La Boca',
    tag: 'Mayo',
    organizer: 'Asociación Cervecera Regiomontana',
  },
  {
    id: 'festival-parrilladas-2026',
    title: 'Festival de Parrilladas — Sociedad Mexicana de Parrilleros',
    category: 'gastronomico',
    startDate: '2026-06-13',
    endDate: '2026-06-14',
    time: '12:00',
    location: 'Parque Municipal de Santiago, N.L.',
    shortDesc: 'Los mejores parrilleros del país traen su fuego a Santiago. Competencias en vivo, degustaciones y el humo más apetitoso de Nuevo León.',
    price: 'Entrada libre · Degustaciones desde $80 MXN',
    src: '/santiagosevive.jpeg',
    alt: 'Festival de Parrilladas Santiago NL, Sociedad Mexicana de Parrilleros',
    tag: 'Junio',
    organizer: 'Sociedad Mexicana de Parrilleros',
  },
  {
    id: 'fiestas-patronales-2026',
    title: 'Fiestas Patronales de Santiago Apóstol',
    category: 'religioso',
    startDate: '2026-07-24',
    endDate: '2026-07-27',
    time: '09:00',
    location: 'Plaza Principal y Centro Histórico, Santiago, N.L.',
    shortDesc: 'Las fiestas más importantes del año. Misa solemne, fuegos artificiales, jaripeo, bailes regionales y música toda la noche. El 25 de julio es el día central.',
    price: 'Entrada libre',
    src: '/parroquia-santiago.jpg',
    alt: 'Fiestas Patronales Santiago Apóstol 25 de julio Santiago NL',
    tag: '25 de Julio',
    organizer: 'Municipio de Santiago y Parroquia Santiago Apóstol',
  },
  {
    id: 'callejoneada-verano-2026',
    title: 'Callejoneada de Verano',
    category: 'cultural',
    startDate: '2026-08-15',
    endDate: '2026-08-15',
    time: '19:30',
    location: 'Calles del Centro Histórico, Santiago, N.L.',
    shortDesc: 'La callejoneada más grande del verano. Estudiantinas, vinos locales, y un recorrido por los rincones más bonitos del centro histórico.',
    price: 'Copa incluida · $150 MXN',
    src: '/santiago-plaza.webp',
    alt: 'Callejoneada de verano Santiago NL',
    tag: 'Agosto',
    organizer: 'Comerciantes del Centro Histórico',
  },
  {
    id: 'cielo-magico-2026',
    title: 'Festival Internacional Santiago Cielo Mágico 2026',
    category: 'festival',
    startDate: '2026-10-17',
    endDate: '2026-10-20',
    time: '06:00',
    location: 'Santiago, Nuevo León (sede por confirmar)',
    shortDesc: 'El festival de globos aerostáticos más grande del norte de México. 40+ globos, night glow, conciertos y actividades para toda la familia.',
    price: 'Entrada gratuita · Vuelos desde $2,500 MXN',
    src: '/cielo-magico-festival.jpg',
    alt: 'Festival Cielo Mágico Santiago NL 2026, globos aerostáticos',
    tag: 'Octubre',
    organizer: 'Municipio de Santiago',
  },
];
