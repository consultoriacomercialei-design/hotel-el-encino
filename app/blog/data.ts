export interface BlogPost {
  slug: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  excerpt: string;
  coverImage: string;
  coverAlt: string;
  publishedAt: string;
  updatedAt?: string;
  category: string;
  categorySlug: string;
  readTime: number;
  featured: boolean;
  keywords: string[];
  content: string;
}

export const BLOG_CATEGORIES: Record<string, string> = {
  guias:       'Guías de Viaje',
  naturaleza:  'Naturaleza',
  aventura:    'Aventura',
  cultura:     'Cultura & Eventos',
  gastronomia: 'Gastronomía',
  hotel:       'Hotel & Hospedaje',
};

export const blogPosts: BlogPost[] = [
  /* ─────────────────────────────────────────────────────── */
  {
    slug: 'que-hacer-en-santiago-nuevo-leon',
    title: 'Qué hacer en Santiago, Nuevo León: La guía definitiva 2025',
    seoTitle: 'Qué hacer en Santiago Nuevo León 2025 — Guía completa | Hotel El Encino',
    seoDescription: 'Cola de Caballo, Cañón Matacanes, Presa La Boca, Festival Cielo Mágico y más. Todo lo que necesitas saber para visitar Santiago, N.L. desde Monterrey.',
    excerpt: 'Santiago combina cascadas, aventura extrema, historia colonial y gastronomía de rancho a 45 minutos de Monterrey. Aquí está todo lo que necesitas saber.',
    coverImage: '/santiago-aerea.jpeg',
    coverAlt: 'Vista aérea de Santiago, Nuevo León con la Sierra Madre al fondo',
    publishedAt: '2025-04-15',
    category: 'Guías de Viaje',
    categorySlug: 'guias',
    readTime: 8,
    featured: true,
    keywords: ['qué hacer en Santiago Nuevo León', 'turismo Santiago NL', 'atracciones Santiago Nuevo León', 'visitar Santiago NL desde Monterrey'],
    content: `
<p>A tan solo 45 minutos de Monterrey, <strong>Santiago, Nuevo León</strong> es uno de los destinos naturales más completos del norte de México. Esta ciudad serrana combina cascadas imponentes, cañones de aventura extrema, historia colonial y una gastronomía que vale el viaje por sí sola.</p>
<p>Esta guía cubre las mejores atracciones con horarios reales, precios actualizados y consejos que solo conocen los locales.</p>

<h2>Las mejores atracciones de Santiago</h2>

<h3>1. Cascada Cola de Caballo</h3>
<p>La atracción más icónica de Santiago. Esta cascada de 25 metros de caída libre se forma entre paredes de roca cubierta de vegetación que cambia de color con las estaciones. El acceso es por el Parque Ecológico Cola de Caballo: puedes llegar a pie (25 min) o rentar un caballo en la entrada.</p>
<ul>
  <li><strong>Horario:</strong> Lunes a domingo, 8:00 AM – 6:00 PM</li>
  <li><strong>Precio de acceso:</strong> $50–$80 MXN por persona</li>
  <li><strong>Mejor época:</strong> Mayo a octubre (máximo caudal después de lluvias)</li>
  <li><strong>Distancia desde Santiago:</strong> 18 km — 25 min en auto</li>
</ul>
<p><em>Tip:</em> Llega antes de las 10 AM en fin de semana para evitar filas y aprovechar la luz de la mañana para fotos.</p>

<h3>2. Cañón Matacanes</h3>
<p>Considerado por muchos como la aventura más extrema de Nuevo León. El recorrido incluye rappel por cascadas, barranquismo, pasajes subacuáticos y caminata por el interior del cañón. El tour completo toma entre 7 y 9 horas.</p>
<ul>
  <li><strong>Dificultad:</strong> Alta — requiere buena condición física</li>
  <li><strong>Precio del tour guiado:</strong> $800–$1,400 MXN por persona</li>
  <li><strong>Duración:</strong> Día completo — salida 7:00 AM</li>
  <li><strong>Requisito:</strong> Saber nadar, sin problemas cardiacos</li>
</ul>
<p>Solo puedes entrar con un guía certificado. Múltiples operadores locales salen desde Santiago centro todos los días durante temporada (abril–octubre).</p>

<h3>3. Presa La Boca</h3>
<p>El lago artificial más visitado de la región. Con 30 kilómetros de perímetro, La Boca ofrece kayak, paddleboard, pesca, paseos en lancha y picnic en sus riberas. El atardecer con la sierra al fondo es espectacular.</p>
<ul>
  <li><strong>Actividades:</strong> Kayak, pesca deportiva, picnic, ciclismo</li>
  <li><strong>Renta de kayak:</strong> $100–$200 MXN por hora</li>
  <li><strong>Distancia:</strong> 10 km desde Santiago centro</li>
</ul>

<h3>4. Festival Cielo Mágico</h3>
<p>El festival de globos aerostáticos más grande de México se celebra en Santiago cada año (generalmente en noviembre). Más de 60 globos iluminan el cielo durante tres días, con música en vivo, gastronomía y zona de camping.</p>
<ul>
  <li><strong>Fechas:</strong> Generalmente primer fin de semana de noviembre</li>
  <li><strong>Acceso al predio:</strong> Gratuito. Experiencias especiales tienen costo</li>
  <li><strong>Tip:</strong> Los globos vuelan al amanecer (6–8 AM) y al atardecer (5–7 PM)</li>
</ul>

<h3>5. Centro Histórico y Parroquia de Santiago Apóstol</h3>
<p>El Zócalo de Santiago es uno de los más cuidados del estado. La Parroquia (siglo XVII) domina la plaza con su arquitectura colonial. Los domingos por la tarde hay mercado artesanal con dulces de leche, queso de cabra y artesanías en madera.</p>

<h2>Cómo llegar a Santiago desde Monterrey</h2>
<p>El acceso principal es por la <strong>Carretera Nacional 85</strong>. En auto desde Monterrey son 45–55 minutos sin tráfico. También hay camiones desde la Central de Autobuses cada hora ($40–$60 MXN).</p>

<h2>La mejor época para visitar</h2>
<ul>
  <li><strong>Primavera (marzo–mayo):</strong> Clima perfecto, vegetación verde, poca lluvia</li>
  <li><strong>Verano (junio–agosto):</strong> Cascadas en su máximo esplendor, calor y lluvias vespertinas</li>
  <li><strong>Otoño (septiembre–noviembre):</strong> Festival Cielo Mágico, colores de sierra</li>
  <li><strong>Invierno (diciembre–febrero):</strong> Fresco, menos turistas, algunos negocios cierran</li>
</ul>

<h2>Dónde hospedarse en Santiago</h2>
<p>Para sacar el máximo provecho de tu visita, hospedarte al menos una noche es muy recomendable. <strong>Hotel El Encino</strong> está ubicado en pleno centro histórico, a pasos del Zócalo y a minutos de todas las atracciones. Las habitaciones combinan comodidad moderna con la calidez de una casona serrana.</p>
<blockquote>Quedarte en Santiago te permite llegar temprano a Matacanes, ver amanecer en La Boca y cenar en el centro sin el estrés del regreso a Monterrey.</blockquote>
    `.trim(),
  },

  /* ─────────────────────────────────────────────────────── */
  {
    slug: 'cola-de-caballo-cascada-santiago',
    title: 'Cascada Cola de Caballo: Guía completa para visitarla',
    seoTitle: 'Cola de Caballo Santiago NL: Precio, horarios y cómo llegar 2025',
    seoDescription: 'Todo sobre la Cascada Cola de Caballo en Santiago, Nuevo León: cómo llegar, precio de entrada, horarios, qué llevar y los mejores tips para tu visita.',
    excerpt: 'La cascada más icónica de Nuevo León. 25 metros de caída libre en plena sierra de Santiago. Aquí están todos los detalles para que tu visita sea perfecta.',
    coverImage: '/cascadacoladecaballo.jpeg',
    coverAlt: 'Cascada Cola de Caballo entre vegetación serrana de Santiago NL',
    publishedAt: '2025-04-20',
    category: 'Naturaleza',
    categorySlug: 'naturaleza',
    readTime: 5,
    featured: true,
    keywords: ['Cola de Caballo cascada Santiago', 'Cola de Caballo precio 2025', 'Cola de Caballo cómo llegar', 'Parque Ecológico Cola de Caballo'],
    content: `
<p>La <strong>Cascada Cola de Caballo</strong> es el símbolo natural de Santiago, Nuevo León. Con una caída de agua de 25 metros que desciende entre paredes de roca viva y vegetación silvestre, es el punto de partida obligado de cualquier visita a la región.</p>

<h2>Cómo llegar a Cola de Caballo</h2>
<p>La cascada se ubica dentro del <strong>Parque Ecológico Cola de Caballo</strong>, a 18 kilómetros del centro de Santiago. El acceso más sencillo es en auto propio o taxi desde Santiago (15–20 minutos).</p>
<ul>
  <li><strong>Dirección:</strong> Carretera a Cola de Caballo km 18, El Cercado, Santiago</li>
  <li><strong>Coordenadas:</strong> 25.3653, -100.1630</li>
  <li><strong>Desde Monterrey:</strong> Carretera Nacional 85 hacia Santiago, luego desvío señalizado a Cola de Caballo</li>
  <li><strong>Taxi desde Santiago centro:</strong> $80–$120 MXN por trayecto</li>
</ul>

<h2>Horarios y precios 2025</h2>
<ul>
  <li><strong>Horario:</strong> Todos los días, 8:00 AM – 6:00 PM</li>
  <li><strong>Entrada al parque:</strong> $50–$80 MXN por persona (puede variar en temporada)</li>
  <li><strong>Renta de caballo:</strong> $120–$180 MXN ida y vuelta al mirador</li>
  <li><strong>Estacionamiento:</strong> $30–$50 MXN</li>
</ul>

<h2>El recorrido dentro del parque</h2>
<p>Desde la caseta de cobro hasta el mirador de la cascada hay una caminata de aproximadamente 1.5 km (25 minutos) por un sendero bien marcado. El camino es accesible para la mayoría de las personas, aunque tiene algunas pendientes moderadas.</p>
<p>Si prefieres no caminar, los caballos están disponibles en la entrada del parque. La experiencia de subir a caballo entre la vegetación de la sierra es en sí misma un atractivo memorable.</p>

<h2>Cómo varía la cascada según la temporada</h2>
<ul>
  <li><strong>Mayo–octubre (temporada de lluvias):</strong> La cascada está en su máximo esplendor — el agua cae con fuerza y la vegetación está completamente verde.</li>
  <li><strong>Noviembre–abril (temporada seca):</strong> El caudal es menor pero la visita sigue siendo hermosa. Menos turistas y ambiente más tranquilo.</li>
</ul>

<h2>Tips para tu visita</h2>
<ul>
  <li>Llega antes de las 10 AM en fines de semana — después se forman filas largas</li>
  <li>Usa calzado cerrado y ropa cómoda — el sendero puede estar húmedo</li>
  <li>Lleva agua propia — en temporada alta el parque puede agotarla</li>
  <li>Los fines de semana hay vendedores de comida y artesanías en la entrada</li>
  <li>El área alrededor de la cascada es fresca — perfecta para un descanso antes de regresar</li>
</ul>

<h2>Combina Cola de Caballo con otras atracciones</h2>
<p>La ubicación del parque lo hace perfecto para un día completo. Desde la entrada, en 30 minutos en auto puedes estar en Presa La Boca para alquilar kayak, o regresar al centro de Santiago para comer en algún restaurante típico.</p>
<p>Si planeas una escapada de fin de semana, <strong>hospedarte en Hotel El Encino</strong> en Santiago centro te permite visitar Cola de Caballo por la mañana sin las prisas del regreso a Monterrey ese mismo día.</p>
    `.trim(),
  },

  /* ─────────────────────────────────────────────────────── */
  {
    slug: 'canon-matacanes-aventura-extrema-santiago',
    title: 'Cañón Matacanes: La aventura extrema que debes vivir en Santiago',
    seoTitle: 'Cañón Matacanes Santiago NL: Guía completa 2025 — Precio, requisitos y tips',
    seoDescription: 'Todo sobre el Cañón Matacanes en Santiago, Nuevo León: precio del tour, requisitos físicos, qué llevar y por qué es considerado la aventura más extrema de México.',
    excerpt: 'Rappel, barranquismo y caminata subacuática en uno de los cañones más espectaculares de México. Aquí está todo lo que necesitas saber antes de entrar a Matacanes.',
    coverImage: '/matacanes.jpg',
    coverAlt: 'Interior del Cañón Matacanes con agua cristalina y paredes de roca',
    publishedAt: '2025-04-25',
    category: 'Aventura',
    categorySlug: 'aventura',
    readTime: 6,
    featured: true,
    keywords: ['Cañón Matacanes', 'Matacanes tour precio', 'Matacanes aventura extrema', 'barranquismo Santiago NL'],
    content: `
<p>Si buscas la aventura más extrema de Nuevo León, <strong>Cañón Matacanes</strong> es tu destino. Este recorrido de barranquismo y rappel en plena sierra de Santiago es considerado uno de los 10 mejores del país por guías especializados en turismo de aventura.</p>

<h2>¿Qué es Matacanes?</h2>
<p>Matacanes es un cañón natural de 7 kilómetros que se recorre de arriba hacia abajo siguiendo el cauce del río. El recorrido incluye:</p>
<ul>
  <li>Rappel por 3 cascadas (la más alta de 14 metros)</li>
  <li>Caminata subacuática en pasajes estrechos</li>
  <li>Toboganes naturales de roca pulida</li>
  <li>Secciones de natación en pozas profundas</li>
  <li>Saltos opcionales desde formaciones rocosas</li>
</ul>
<p>El recorrido completo toma entre 7 y 9 horas dependiendo del tamaño del grupo y el nivel del agua.</p>

<h2>Requisitos para entrar al cañón</h2>
<p>Matacanes no es apto para todo el mundo. Asegúrate de cumplir estos requisitos antes de reservar:</p>
<ul>
  <li><strong>Saber nadar</strong> — hay secciones donde el agua te cubre completamente</li>
  <li><strong>Buena condición física</strong> — 7+ horas de actividad continua</li>
  <li><strong>Sin problemas cardiacos ni de presión arterial</strong></li>
  <li><strong>Peso máximo:</strong> Aproximadamente 100 kg (varía por operador)</li>
  <li><strong>Edad mínima:</strong> 12–14 años según el operador</li>
  <li><strong>No aplica durante embarazo</strong></li>
</ul>

<h2>Precio y cómo contratar el tour</h2>
<p>Solo se puede entrar al cañón con un guía certificado. El precio incluye equipo completo (casco, arnés, traje de neopreno en temporada fría, cuerdas de rappel) y apoyo logístico.</p>
<ul>
  <li><strong>Precio por persona:</strong> $800 – $1,400 MXN (varía por operador y temporada)</li>
  <li><strong>Horario de salida:</strong> 7:00 AM – 8:00 AM máximo (para terminar antes del anochecer)</li>
  <li><strong>Grupo mínimo:</strong> 4 personas generalmente</li>
  <li><strong>Reserva:</strong> Indispensable con al menos 2 días de anticipación en temporada alta</li>
</ul>

<h2>¿Cuándo ir?</h2>
<p>La mejor temporada es de abril a octubre. En invierno el agua está muy fría. Durante lluvias intensas el acceso puede cerrarse por seguridad — siempre confirma antes de salir.</p>
<ul>
  <li><strong>Temporada ideal:</strong> Abril, mayo, junio y septiembre</li>
  <li><strong>Con precaución:</strong> Julio y agosto (lluvias más intensas — el nivel del agua sube)</li>
  <li><strong>Cerrado o muy frío:</strong> Diciembre a febrero</li>
</ul>

<h2>Qué llevar</h2>
<ul>
  <li>Ropa de baño que puedas mojar completamente — nada nuevo que no quieras estropear</li>
  <li>Zapatos con suela de agarre que puedas mojar (no sandalias)</li>
  <li>Protector solar resistente al agua</li>
  <li>Snacks energéticos — el punto de comida está al final del recorrido</li>
  <li>Bolsas waterproof para teléfono y documentos</li>
</ul>

<blockquote>La mayoría de los visitantes describen Matacanes como "la experiencia más intensa y memorable que han tenido en México". No es exageración.</blockquote>

<h2>Hospédate la noche anterior en Santiago</h2>
<p>La mayoría de los operadores de Matacanes salen desde Santiago centro o tienen punto de encuentro cerca. <strong>Hospedarte en Hotel El Encino</strong> la noche anterior te permite llegar descansado al punto de salida de las 7 AM — sin el desgaste del viaje desde Monterrey a esa hora.</p>
    `.trim(),
  },

  /* ─────────────────────────────────────────────────────── */
  {
    slug: 'itinerario-2-dias-santiago-nuevo-leon',
    title: 'Itinerario perfecto: 2 días en Santiago, Nuevo León',
    seoTitle: 'Itinerario 2 días en Santiago Nuevo León — Qué ver y hacer | 2025',
    seoDescription: 'Itinerario optimizado para 2 días en Santiago NL: Cola de Caballo, Presa La Boca, Matacanes y Centro Histórico. Horarios, costos y logística incluidos.',
    excerpt: 'El itinerario optimizado para dos días en Santiago. Cascadas, aventura, gastronomía y centro histórico — sin carreras y aprovechando cada hora.',
    coverImage: '/santiago-plaza.webp',
    coverAlt: 'Plaza principal del centro histórico de Santiago, Nuevo León',
    publishedAt: '2025-05-01',
    category: 'Guías de Viaje',
    categorySlug: 'guias',
    readTime: 7,
    featured: false,
    keywords: ['itinerario Santiago Nuevo León', 'qué hacer en Santiago 2 días', 'ruta turística Santiago NL', 'fin de semana Santiago NL'],
    content: `
<p>Santiago, Nuevo León tiene suficiente para mantenerte activo varios días. Este itinerario de 2 días está optimizado para ver lo esencial sin carreras, aprovechando cada hora del día.</p>

<h2>Día 1 — Naturaleza y paisajes</h2>

<h3>Mañana: Cola de Caballo (7:00 – 12:00)</h3>
<p><strong>7:30 AM — Desayuno en Santiago centro</strong><br>Empieza el día con machacado con huevo, pan de semita o tamales de rancho en algún restaurant del centro o mercado local.</p>
<p><strong>8:30 AM — Sal hacia Cola de Caballo</strong><br>18 km, 25 minutos. Llegar antes de las 10 AM garantiza menos turistas y la cascada con la mejor luz. Dedica 2.5–3 horas al recorrido completo, con o sin caballo.</p>

<h3>Tarde: Presa La Boca (13:00 – 19:00)</h3>
<p><strong>1:00 PM — Comida en El Cercado</strong><br>Varios restaurantes familiares en el camino de regreso de Cola de Caballo ofrecen cabrito y asado típico.</p>
<p><strong>2:30 PM — Presa La Boca</strong><br>10 km desde Santiago centro. Alquila un kayak o paddleboard ($100–$200/hora) y disfruta el agua tranquila con vista a la sierra. El atardecer en La Boca es de los mejores de la región.</p>
<p><strong>6:30 PM — Cena en el centro</strong><br>La plaza principal se anima en las tardes con puestos de antojitos y el ambiente de pueblo serrano.</p>

<h2>Día 2 — Aventura o cultura, según tu nivel</h2>

<h3>Opción A: Cañón Matacanes (día completo)</h3>
<p>Si decidiste aventurarte, la salida es a las <strong>7:00 AM</strong> desde el punto de reunión con tu operador. El recorrido toma 7–9 horas. Es una experiencia que requiere el día completo y buena condición física. <em>Reserva con 2–3 días de anticipación.</em></p>

<h3>Opción B: El Cielito + Centro Histórico</h3>
<p><strong>8:00 AM — El Cielito</strong><br>Mirador a 3,200 metros de altitud con una de las mejores vistas de toda la sierra. El camino requiere auto con buena tracción.</p>
<p><strong>1:00 PM — Comida y centro histórico</strong><br>Visita la Parroquia de Santiago Apóstol y da una vuelta por el Zócalo. Los domingos hay mercado artesanal con productos locales.</p>
<p><strong>4:00 PM — Cantina o bar local</strong><br>Santiago tiene opciones para probar mezcales del norte y cervezas artesanales antes de regresar.</p>

<h2>Logística y costos estimados</h2>
<ul>
  <li><strong>Transporte:</strong> Auto propio recomendado. Taxi local: $60–$120 MXN por trayecto</li>
  <li><strong>Hospedaje 1 noche:</strong> Hotel El Encino, centro histórico</li>
  <li><strong>Presupuesto sin hospedaje:</strong> $1,800–$3,500 MXN por persona para 2 días</li>
  <li><strong>Efectivo:</strong> Lleva suficiente — no todos los negocios aceptan tarjeta</li>
</ul>

<h2>Consejos prácticos</h2>
<ul>
  <li>Reserva Matacanes con anticipación — los cupos se llenan en temporada alta</li>
  <li>El clima en la sierra puede cambiar rápido — lleva una capa extra aunque salgas con calor</li>
  <li>Protector solar y sombrero son esenciales en verano</li>
  <li>Descarga mapas offline de Santiago por si hay zonas sin señal</li>
</ul>
    `.trim(),
  },

  /* ─────────────────────────────────────────────────────── */
  {
    slug: 'festival-cielo-magico-santiago-2025',
    title: 'Festival Cielo Mágico 2025: Guía completa del festival de globos en Santiago',
    seoTitle: 'Festival Cielo Mágico Santiago 2025 — Fechas, precio y qué esperar',
    seoDescription: 'Guía completa del Festival Cielo Mágico en Santiago, Nuevo León: fechas 2025, precio, horarios de vuelo, Night Glow y dónde hospedarse durante el festival.',
    excerpt: 'El festival de globos aerostáticos más grande de México en Santiago NL. Más de 60 globos, Night Glow, música y gastronomía serrana. Aquí está todo lo que necesitas saber.',
    coverImage: '/cielo-magico-festival.jpg',
    coverAlt: 'Globos aerostáticos iluminando el amanecer en el Festival Cielo Mágico Santiago',
    publishedAt: '2025-05-05',
    category: 'Cultura & Eventos',
    categorySlug: 'cultura',
    readTime: 5,
    featured: true,
    keywords: ['Festival Cielo Mágico 2025', 'Festival Cielo Mágico Santiago fechas', 'globos aerostáticos Nuevo León', 'Festival Cielo Mágico precio'],
    content: `
<p>Cada noviembre, Santiago, Nuevo León se transforma en el escenario del espectáculo de globos aerostáticos más grande de México. El <strong>Festival Cielo Mágico</strong> mezcla colores, música y la magia de ver decenas de globos iluminar el amanecer serrano.</p>

<h2>¿Qué es el Festival Cielo Mágico?</h2>
<p>Es un evento de 3 días que se celebra en Santiago desde 2013. Lo que comenzó como una reunión de pilotos locales creció hasta convertirse en uno de los eventos de turismo más importantes de Nuevo León, atrayendo visitantes de todo México y del extranjero.</p>
<ul>
  <li><strong>Ubicación:</strong> Campo de globos, Santiago, N.L.</li>
  <li><strong>Duración:</strong> 3 días (viernes a domingo)</li>
  <li><strong>Globos participantes:</strong> 50–80 globos aerostáticos de distintos países</li>
  <li><strong>Fechas 2025:</strong> Por confirmar — históricamente primer fin de semana de noviembre</li>
</ul>

<h2>Los mejores momentos del festival</h2>

<h3>Vuelo al amanecer</h3>
<p>El momento más fotográfico. Entre las 6:00 y 8:00 AM, los globos se inflan uno a uno y ascienden sobre la sierra mientras el cielo cambia de colores. Si puedes elegir solo un momento para estar ahí, es este.</p>

<h3>Night Glow</h3>
<p>Los espectáculos nocturnos del viernes y sábado donde los globos se iluminan desde adentro al ritmo de música en vivo. Los colores y patrones de cada globo crean un efecto visual único que no existe en ningún otro festival de México.</p>

<h3>Vuelo tripulado</h3>
<p>Algunos operadores ofrecen vuelos de 45–60 minutos sobre la sierra de Santiago. Las plazas son muy limitadas.</p>
<ul>
  <li><strong>Precio del vuelo:</strong> $2,500–$4,000 MXN por persona</li>
  <li><strong>Reserva:</strong> Con meses de anticipación — se agotan primero</li>
</ul>

<h2>Logística del festival</h2>
<ul>
  <li><strong>Acceso al predio:</strong> Generalmente gratuito</li>
  <li><strong>Estacionamiento:</strong> Limitado — llega muy temprano o usa shuttle desde Santiago centro</li>
  <li><strong>Desde Monterrey:</strong> Camiones especiales se organizan durante el festival</li>
  <li><strong>Gastronomía:</strong> Food trucks y puestos de comida local dentro del predio</li>
</ul>

<h2>Tips para vivir el festival al máximo</h2>
<ul>
  <li><strong>Quédate en Santiago</strong> — los vuelos al amanecer requieren estar ahí a las 5:30 AM</li>
  <li>Lleva abrigo: la madrugada en la sierra de noviembre puede estar muy fría</li>
  <li>Carga tu teléfono la noche anterior — el predio puede no tener cargadores</li>
  <li>Lleva efectivo para los puestos de comida y artesanías</li>
  <li>Si quieres el vuelo en globo, reserva con 2–3 meses de anticipación</li>
</ul>

<h2>Dónde hospedarse durante el festival</h2>
<p><strong>Hotel El Encino</strong>, ubicado en el centro histórico de Santiago, es la opción más conveniente. A pocos minutos del predio, puedes descansar entre vuelos y llegar al Night Glow sin preocuparte por el tráfico de regreso a Monterrey.</p>
<blockquote>Durante el Festival Cielo Mágico las habitaciones se reservan con semanas de anticipación. No dejes tu reserva para el último momento.</blockquote>
    `.trim(),
  },

  /* ─────────────────────────────────────────────────────── */
  {
    slug: 'escapada-fin-de-semana-santiago-desde-monterrey',
    title: 'Por qué Santiago, N.L. es la escapada perfecta desde Monterrey',
    seoTitle: 'Escapada fin de semana Santiago NL desde Monterrey — Guía 2025',
    seoDescription: 'Santiago, Nuevo León a 45 minutos de Monterrey: cascadas, aventura, gastronomía de rancho y un centro histórico que te hace querer quedarte. Planea tu escapada.',
    excerpt: 'A 45 minutos de Monterrey y a años luz del ritmo de la ciudad. Santiago ofrece lo que ningún destino de larga distancia puede: naturaleza extrema sin perder un fin de semana completo.',
    coverImage: '/santiagosevive.jpeg',
    coverAlt: 'Visitantes disfrutando el paisaje serrano de Santiago, Nuevo León',
    publishedAt: '2025-05-10',
    category: 'Guías de Viaje',
    categorySlug: 'guias',
    readTime: 5,
    featured: false,
    keywords: ['escapada Santiago NL desde Monterrey', 'fin de semana Santiago Nuevo León', 'qué hacer Santiago NL fin de semana', 'turismo Santiago NL'],
    content: `
<p>Monterrey tiene muchas virtudes, pero cuando el ruido de la ciudad empieza a pesar, <strong>Santiago, Nuevo León</strong> ofrece exactamente lo que necesitas: sierra, agua, aire limpio y el ritmo de un pueblo que sabe recibir visitantes sin perder su esencia.</p>

<h2>La distancia perfecta</h2>
<p>A diferencia de destinos que requieren vuelos o carreteras largas, Santiago está a <strong>45 minutos de Monterrey</strong> por la Carretera Nacional. Sin embargo, al llegar sientes que dejaste la ciudad completamente atrás.</p>
<ul>
  <li><strong>Distancia:</strong> 45–55 minutos desde Monterrey sin tráfico</li>
  <li><strong>Acceso:</strong> Carretera Nacional 85</li>
  <li><strong>Sin vuelos, sin maletas grandes, sin aeropuerto</strong></li>
</ul>

<h2>Lo que Santiago tiene que Monterrey no puede ofrecer</h2>

<h3>Naturaleza en estado puro</h3>
<p>Cola de Caballo, Matacanes, Presa La Boca y El Cielito son experiencias naturales únicas. En un solo fin de semana puedes nadar bajo una cascada, remar en un lago y ver el amanecer desde 3,200 metros de altitud.</p>

<h3>La sierra más verde</h3>
<p>Santiago está en la vertiente de la Sierra Madre Oriental que recibe más lluvia, haciéndola más exuberante que otros puntos de la sierra. La diferencia es visible especialmente de mayo a octubre.</p>

<h3>Gastronomía de rancho</h3>
<p>El cabrito al pastor preparado en Santiago tiene historia propia — los animales crecen en la sierra y la preparación conserva técnicas de décadas. Los tamales de rancho, el queso de cabra local y los dulces de leche son experiencias gastronómicas que vale la pena buscar.</p>

<h3>El ritmo de pueblo serrano</h3>
<p>Santiago mantiene el ritmo de los pueblos de montaña: las plazas se llenan en las tardes, hay tiempo para sentarse a tomar un café sin prisa. Es el antídoto perfecto para la velocidad de Monterrey.</p>

<h2>La combinación ideal para un fin de semana</h2>
<ul>
  <li><strong>Viernes por la noche:</strong> Llega a Santiago, instálate y cena en el centro histórico</li>
  <li><strong>Sábado:</strong> Cola de Caballo en la mañana, Presa La Boca en la tarde</li>
  <li><strong>Domingo:</strong> Matacanes (día completo) o El Cielito + Centro Histórico</li>
  <li><strong>Domingo por la noche:</strong> Regresa a Monterrey descansado</li>
</ul>

<h2>Tu base: Hotel El Encino</h2>
<p><strong>Hotel El Encino</strong> está en el corazón del centro histórico de Santiago, a pasos del Zócalo y a minutos de acceso a todas las atracciones. Las habitaciones están diseñadas para el descanso después de un día activo: camas cómodas, baños completos y el silencio de la noche serrana.</p>

<blockquote>Santiago es ese tipo de lugar al que llegas por un fin de semana y ya estás pensando en cuándo volver.</blockquote>

<p>Empieza a planear tu escapada reservando tu habitación en Hotel El Encino — el centro de Santiago como base para explorar todo lo que la sierra tiene para ofrecer.</p>
    `.trim(),
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find(p => p.slug === slug);
}

export function getFeaturedPosts(limit = 3): BlogPost[] {
  return blogPosts.filter(p => p.featured).slice(0, limit);
}

export function getRecentPosts(limit = 6): BlogPost[] {
  return [...blogPosts]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, limit);
}
