export type Category =
  // Naturaleza & Aventura
  | 'naturaleza' | 'aventura' | 'lago' | 'senderismo'
  // Cultura & Eventos
  | 'festival' | 'cultura' | 'iglesias'
  // Comida & Bebida
  | 'restaurantes' | 'cafes' | 'bares' | 'gastronomia'
  // Turismo & Comercio
  | 'tours' | 'hospedaje' | 'bienestar' | 'entretenimiento' | 'tiendas' | 'floreria'
  // Salud & Belleza
  | 'salud' | 'veterinaria' | 'farmacia' | 'belleza'
  // Servicios
  | 'automotriz' | 'servicios' | 'bancos';

export type ListingTier = 'free' | 'featured' | 'hero';

export interface Listing {
  slug: string;
  name: string;
  category: Category;
  categoryLabel: string;
  shortDesc: string;
  longDesc: string;
  address: string;
  distanceKm: number;
  distanceMin: number;
  duration: string;
  priceRange: string;
  hours: string;
  tips: string[];
  src: string;
  photos?: string[];   // slideshow — hero/featured up to 3, free max 1
  imgFocus?: string;   // CSS objectPosition — e.g. 'center 30%', 'top', '50% 20%'
  alt: string;
  tag: string | null;
  website: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  facebook: string | null;
  lat: number;
  lng: number;
  tier: ListingTier;
  isUserListing?: boolean;  // from Supabase — show in Recientes section
  created_at?: string;      // ISO date — used to determine "Nuevo" badge expiry
}

export const CATEGORY_LABEL: Record<Category, string> = {
  // Naturaleza & Aventura
  naturaleza:     'Naturaleza',
  aventura:       'Aventura Extrema',
  lago:           'Lago & Deportes',
  senderismo:     'Senderismo & Rutas',
  // Cultura & Eventos
  festival:       'Festivales',
  cultura:        'Historia & Cultura',
  iglesias:       'Iglesias & Capillas',
  // Comida & Bebida
  restaurantes:   'Restaurantes',
  cafes:          'Cafés & Panaderías',
  bares:          'Bares & Cantinas',
  gastronomia:    'Gastronomía',
  // Turismo & Comercio
  tours:          'Tours & Guías',
  hospedaje:      'Hospedaje',
  bienestar:      'Bienestar & Spa',
  entretenimiento:'Entretenimiento',
  tiendas:        'Tiendas & Artesanías',
  floreria:       'Florería & Arreglos',
  // Salud & Belleza
  salud:          'Médicos & Salud',
  veterinaria:    'Veterinarias',
  farmacia:       'Farmacias',
  belleza:        'Salones & Estéticas',
  // Servicios
  automotriz:     'Gasolineras & Mecánicos',
  servicios:      'Servicios & Delivery',
  bancos:         'Bancos & ATMs',
};

export const CATEGORY_ICON: Record<Category, string> = {
  naturaleza:     '🌊',
  aventura:       '🧗',
  lago:           '⛵',
  senderismo:     '🥾',
  festival:       '🎈',
  cultura:        '🏛',
  iglesias:       '⛪',
  restaurantes:   '🍽',
  cafes:          '☕',
  bares:          '🍺',
  gastronomia:    '🥩',
  tours:          '🗺',
  hospedaje:      '🏨',
  bienestar:      '🌿',
  entretenimiento:'🎭',
  tiendas:        '🛍',
  floreria:       '💐',
  salud:          '🏥',
  veterinaria:    '🐾',
  farmacia:       '💊',
  belleza:        '✂️',
  automotriz:     '⛽',
  servicios:      '🔧',
  bancos:         '🏦',
};

export const listings: Listing[] = [
  /* ── HERO: Hotel El Encino ──────────────────────────────── */
  {
    slug: 'hotel-el-encino',
    name: 'Hotel El Encino',
    category: 'hospedaje',
    categoryLabel: 'Hospedaje',
    shortDesc: 'El hotel boutique del centro histórico de Santiago — a pasos de la catedral, con habitaciones únicas y el mejor servicio de la región.',
    longDesc: `Hotel El Encino es el corazón del centro histórico de Santiago, N.L. Ubicado a metros de la Parroquia de Santiago Apóstol, es la base perfecta para explorar el pueblo y toda la sierra.

Cada habitación tiene personalidad propia: decoración cuidada, camas de lujo y la tranquilidad de estar en el centro del pueblo sin el ruido de la carretera. Despierta con vistas al jardín o a los tejados coloniales del centro.

Desde aquí puedes caminar a la plaza, tomar un café en el jardín, y salir en minutos hacia la Cascada Cola de Caballo, la Presa La Boca o el Cañón Matacanes. También organizamos o recomendamos tours, transporte y actividades para que tu visita sea perfecta.`,
    address: 'Centro Histórico, Santiago, Nuevo León',
    distanceKm: 0,
    distanceMin: 0,
    duration: 'Desde 1 noche',
    priceRange: 'Desde $1,200 MXN / noche',
    hours: 'Recepción 24 hrs · Check-in 15:00 · Check-out 12:00',
    tips: [
      'Reserva directamente aquí para la mejor tarifa garantizada',
      'Pregunta en recepción por tours y actividades — tenemos los mejores contactos',
      'Parking disponible — consulta disponibilidad al reservar',
    ],
    src: '/IMG_4874.PNG',
    photos: ['/IMG_4874.PNG', '/IMG_4875.PNG', '/IMG_4876.PNG'],
    imgFocus: 'center 40%',
    alt: 'Hotel El Encino, Santiago Nuevo León — vista exterior al atardecer',
    tag: 'Tu base en Santiago',
    website: 'https://hotelelencino.com',
    phone: '+528123816588',
    whatsapp: '+528123816588',
    instagram: 'https://www.instagram.com/elencinohospedaje',
    facebook: 'https://www.facebook.com/hotelencinosantiago',
    lat: 25.4220,
    lng: -100.1573,
    tier: 'hero',
  },

  /* ── Naturaleza & Aventura ──────────────────────────────── */
  {
    slug: 'cascada-cola-de-caballo',
    name: 'Cascada Cola de Caballo',
    category: 'naturaleza',
    categoryLabel: 'Naturaleza',
    shortDesc: 'La cascada más icónica de Nuevo León — 25 metros de caída libre en plena Sierra Madre.',
    longDesc: `La Cascada Cola de Caballo es el atractivo natural más visitado de Santiago, N.L., y uno de los más emblemáticos de todo Nuevo León. Con una caída de aproximadamente 25 metros, esta impresionante catarata se encuentra dentro del Parque Nacional Cumbres de Monterrey, rodeada de vegetación exuberante y paredes de roca que encuadran perfectamente el espectáculo del agua.

El acceso es sencillo: desde el hotel llegas en menos de 20 minutos. En la entrada del parque hay estacionamiento, pequeños puestos de comida y tiendas de recuerdos. Desde la entrada caminas unos 800 metros por un sendero bien señalizado hasta el pie de la cascada, donde podrás sentir el frío del agua y la niebla que sube desde el cañón.

Los fines de semana y días festivos puede haber largas filas de autos — te recomendamos ir entre semana o llegar antes de las 10am. En épocas de lluvia (junio-septiembre) el caudal es espectacular; en temporada seca la cascada puede reducirse pero sigue siendo un paseo muy agradable.`,
    address: 'Parque Nacional Cola de Caballo, Villa de Santiago, N.L.',
    distanceKm: 14,
    distanceMin: 20,
    duration: '2-4 horas',
    priceRange: '$80-120 MXN entrada',
    hours: 'Lun-Dom 9:00 - 17:00',
    tips: [
      'Llega antes de las 10am los fines de semana — después hay mucha gente',
      'Lleva ropa que pueda mojarse si quieres acercarte a la base',
      'Hay tuk-tuks desde la entrada hasta la cascada si no quieres caminar',
      'Lleva efectivo — la entrada y los puestos solo aceptan efectivo',
    ],
    src: '/cola-de-caballo.jpeg',
    imgFocus: 'center 20%',
    alt: 'Cascada Cola de Caballo, Parque Nacional, Santiago Nuevo León',
    tag: 'Más visitada',
    website: null,
    phone: null,
    whatsapp: null,
    instagram: null,
    facebook: null,
    lat: 25.3653032,
    lng: -100.1630615,
    tier: 'free',
  },
  {
    slug: 'canon-matacanes',
    name: 'Cañón Matacanes',
    category: 'aventura',
    categoryLabel: 'Aventura Extrema',
    shortDesc: 'Rapel en cascadas, toboganes naturales y saltos al río — el recorrido de aventura más famoso del norte de México.',
    longDesc: `El Cañón Matacanes es considerado uno de los recorridos de aventura más emocionantes del norte de México. El tour estándar dura entre 6 y 8 horas y consiste en atravesar el cañón del río La Mina con 14 rappels (el más alto de 25 metros), toboganes naturales tallados en roca, saltos al río desde diferentes alturas y caminatas entre paredes de piedra de hasta 100 metros.

El recorrido es de dificultad media-alta. No se requiere experiencia previa en rappel, pero sí condición física básica. Las operadoras certificadas proporcionan todo el equipo: casco, arnés, chaleco salvavidas, cuerdas y guías certificados.

El precio incluye equipo completo y guía; varía entre $900 y $1,400 MXN. Reserva con al menos 24 horas de anticipación. El cañón se cierra cuando hay avisos de lluvia en la sierra.`,
    address: 'Cañón Matacanes, Municipio de Santiago, N.L.',
    distanceKm: 22,
    distanceMin: 30,
    duration: '6-8 horas (día completo)',
    priceRange: '$900-1,400 MXN con guía',
    hours: 'Salidas 8:00am · Reservar 24h antes',
    tips: [
      'Reserva con anticipación — los cupos se llenan rápido en fines de semana',
      'Lleva ropa sintética (no algodón) — se moja todo',
      'Come bien antes — es un recorrido exigente',
      'Confirma el día anterior si hay riesgo de lluvia en la sierra',
    ],
    src: '/matacanes.jpg',
    imgFocus: 'center 30%',
    alt: 'Cañón Matacanes, rapel y aventura extrema, Santiago Nuevo León',
    tag: 'Must Do',
    website: null,
    phone: null,
    whatsapp: null,
    instagram: null,
    facebook: null,
    lat: 25.264694,
    lng: -100.167384,
    tier: 'free',
  },
  {
    slug: 'presa-la-boca',
    name: 'Presa La Boca',
    category: 'lago',
    categoryLabel: 'Lago & Deportes',
    shortDesc: 'Embalse espectacular con catamarán, kayak, pesca y gastronomía local en sus orillas.',
    longDesc: `La Presa La Boca es uno de los destinos más completos de Santiago: combina naturaleza, deportes acuáticos, gastronomía y atardeceres que vale la pena ver. El embalse tiene una superficie de más de 35 km² rodeado por la Sierra Madre.

En sus orillas encontrarás restaurantes de mariscos donde se come el mejor caldo de camarón de la región. Para actividades en el agua, hay catamarán, lanchas, kayaks y paddleboards. El atardecer aquí es de los más fotografiados de Nuevo León.`,
    address: 'Presa La Boca, Santiago, N.L.',
    distanceKm: 7,
    distanceMin: 10,
    duration: '2-4 horas',
    priceRange: 'Entrada libre · Actividades $150-400 MXN',
    hours: 'Abierto todo el día · Restaurantes 12:00-20:00',
    tips: [
      'El atardecer es espectacular — llega a las 5:30pm',
      'Los restaurantes se llenan los domingos — llega antes de las 2pm',
      'Lleva abrigo si vas en la tarde, el viento baja fresco de la sierra',
    ],
    src: '/presadelaboca.webp',
    alt: 'Presa La Boca, Santiago Nuevo León, catamarán y pesca',
    tag: null,
    website: null,
    phone: null,
    whatsapp: null,
    instagram: null,
    facebook: null,
    lat: 25.4880,
    lng: -100.1000,
    tier: 'free',
  },
  {
    slug: 'el-cielito',
    name: 'El Cielito',
    category: 'senderismo',
    categoryLabel: 'Senderismo & Rutas',
    shortDesc: 'Mirador natural escondido entre la sierra con vistas panorámicas únicas del valle de Santiago.',
    longDesc: `El Cielito es un punto elevado en la sierra desde donde se domina una vista panorámica del valle de Santiago, la Presa La Boca y Monterrey en el horizonte. Ideal para fotografía de paisaje al amanecer o atardecer.

El acceso requiere SUV o vehículo de doble tracción y una caminata de 15-20 minutos. No hay servicios — lleva todo lo que necesites.`,
    address: 'El Cielito, Sierra de Santiago, N.L.',
    distanceKm: 18,
    distanceMin: 25,
    duration: '2-3 horas',
    priceRange: 'Acceso libre',
    hours: 'Abierto todo el día · Mejor al amanecer o atardecer',
    tips: [
      'Necesitas vehículo 4x4 o SUV para la brecha de acceso',
      'El amanecer con niebla en el valle es espectacular',
      'Usa Google Maps: busca "El Cielito Santiago NL"',
    ],
    src: '/elcielito.jpg',
    alt: 'El Cielito, senderismo y mirador, Santiago Nuevo León',
    tag: null,
    website: null,
    phone: null,
    whatsapp: null,
    instagram: null,
    facebook: null,
    lat: 25.404469,
    lng: -100.108903,
    tier: 'free',
  },

  /* ── Cultura ────────────────────────────────────────────── */
  {
    slug: 'catedral-santiago-apostol',
    name: 'Catedral de Santiago Apóstol',
    category: 'cultura',
    categoryLabel: 'Historia & Cultura',
    shortDesc: 'Joya colonial del siglo XVIII en el corazón del centro histórico — a pasos del hotel.',
    longDesc: `La Parroquia de Santiago Apóstol es el corazón histórico y espiritual del municipio. Construida en el siglo XVIII, domina la plaza principal con sus dos torres de cantera. Es el símbolo más reconocible de Santiago.

Alrededor se extiende el jardín principal con puestos de comida local los fines de semana. La catedral es especialmente hermosa durante las Fiestas Patronales del 25 de julio y en Semana Santa.`,
    address: 'Plaza Principal, Centro Histórico de Santiago, N.L.',
    distanceKm: 0.1,
    distanceMin: 1,
    duration: '30-60 minutos',
    priceRange: 'Acceso libre',
    hours: 'Lun-Dom 7:00 - 20:00',
    tips: [
      'Está a 1 minuto caminando del hotel',
      'Las fiestas patronales del 25 de julio son las más espectaculares del año',
      'El jardín los sábados tiene mercado de artesanías locales',
    ],
    src: '/parroquia-santiago.jpg',
    alt: 'Catedral de Santiago Apóstol, centro histórico Santiago Nuevo León',
    tag: 'A pasos',
    website: null,
    phone: null,
    whatsapp: null,
    instagram: null,
    facebook: null,
    lat: 25.4244,
    lng: -100.1514,
    tier: 'free',
  },

  /* ── Cultura: Casa de la Cultura ───────────────────────── */
  {
    slug: 'casa-de-la-cultura-santiago',
    name: 'Casa de la Cultura y Museo',
    category: 'cultura',
    categoryLabel: 'Historia & Cultura',
    shortDesc: 'El museo municipal de Santiago resguarda la historia del municipio — arte, arqueología y patrimonio regional.',
    longDesc: `La Casa de la Cultura y Museo de Santiago es el espacio dedicado a preservar y difundir el patrimonio histórico, artístico y cultural del municipio. Ubicada en el centro histórico, a metros de la Parroquia de Santiago Apóstol, exhibe colecciones de arqueología, arte popular, fotografía histórica y objetos de la vida cotidiana del siglo XIX y XX.

Es el punto de partida ideal para entender la historia y el alma de Santiago antes de explorar el municipio. Las exposiciones temporales traen artistas locales y nacionales con regularidad.`,
    address: 'Centro Histórico, Santiago, N.L. (junto a la plaza principal)',
    distanceKm: 0.1,
    distanceMin: 2,
    duration: '1-2 horas',
    priceRange: 'Acceso libre o cuota de recuperación',
    hours: 'Mar-Dom 10:00 - 18:00',
    tips: [
      'Está a 2 minutos caminando del hotel',
      'Ideal para empezar el día — contexto histórico del pueblo',
      'Consulta agenda de exposiciones temporales',
    ],
    src: '/parroquia-santiago.jpg',
    alt: 'Casa de la Cultura y Museo de Santiago, Nuevo León',
    tag: 'Patrimonio',
    website: null,
    phone: '+52 81 2285 0060',
    whatsapp: null,
    instagram: null,
    facebook: null,
    lat: 25.424049,
    lng: -100.152043,
    tier: 'free',
  },

  /* ── Naturaleza: Cascada El Salto ───────────────────────── */
  {
    slug: 'cascada-el-salto',
    name: 'Cascada El Salto',
    category: 'naturaleza',
    categoryLabel: 'Naturaleza',
    shortDesc: 'Cascada escondida en la sierra poniente de Santiago — un secreto local rodeado de vegetación virgen.',
    longDesc: `La Cascada El Salto es uno de esos lugares que los locales guardan como tesoro. Ubicada en la sierra al poniente del municipio, esta cascada de mediana altura cae sobre una poza natural ideal para refrescarse en verano.

El acceso requiere vehículo y caminata por brecha. No hay servicios — la experiencia es totalmente natural. El mejor momento para visitarla es en temporada de lluvias (julio-septiembre) cuando el caudal está en su punto máximo.`,
    address: 'Sierra Poniente de Santiago, N.L.',
    distanceKm: 20,
    distanceMin: 30,
    duration: '2-4 horas',
    priceRange: 'Acceso libre',
    hours: 'Abierto todo el día · Mejor de 9am a 4pm',
    tips: [
      'Requiere vehículo con buena altura — brecha sin pavimento',
      'Lleva comida y agua — no hay tiendas',
      'El caudal es mayor de julio a septiembre',
      'Pregunta en el hotel por las indicaciones exactas para llegar',
    ],
    src: '/cola-de-caballo.jpeg',
    alt: 'Cascada El Salto, sierra poniente de Santiago Nuevo León',
    tag: 'Secreto local',
    website: null,
    phone: null,
    whatsapp: null,
    instagram: null,
    facebook: null,
    lat: 25.391373,
    lng: -100.238314,
    tier: 'free',
  },

  /* ── Festival ───────────────────────────────────────────── */
  {
    slug: 'festival-cielo-magico',
    name: 'Festival Cielo Mágico',
    category: 'festival',
    categoryLabel: 'Festivales',
    shortDesc: 'El festival de globos aerostáticos más grande del norte de México llena el cielo de Santiago cada octubre.',
    longDesc: `El Festival Internacional Santiago Cielo Mágico es el evento más grande de Santiago: más de 40 globos aerostáticos de diferentes países cada octubre. Night glow, conciertos, artesanías y actividades para toda la familia.

Reserva el hotel con 3-4 semanas de anticipación durante el festival — el hospedaje se agota completamente.`,
    address: 'Santiago, Nuevo León (sede varía por edición)',
    distanceKm: 1,
    distanceMin: 5,
    duration: 'Varios días (3-5 días)',
    priceRange: 'Entrada gratuita · Vuelos en globo desde $2,500 MXN',
    hours: 'Amanecer hasta noche · Consultar fechas cada año',
    tips: [
      'Reserva el hotel con 3-4 semanas de anticipación',
      'El amanecer del primer día es el más fotogénico',
      'Los vuelos en globo se agotan semanas antes',
    ],
    src: '/cielo-magico-festival.jpg',
    alt: 'Festival Santiago Cielo Mágico, globos aerostáticos, Nuevo León',
    tag: 'Oct – Nov',
    website: null,
    phone: null,
    whatsapp: null,
    instagram: null,
    facebook: null,
    lat: 25.4200,
    lng: -100.1300,
    tier: 'free',
  },
];

export function getListingBySlug(slug: string): Listing | undefined {
  return listings.find(l => l.slug === slug);
}

export function getListingsByCategory(category: Category): Listing[] {
  return listings.filter(l => l.category === category);
}
