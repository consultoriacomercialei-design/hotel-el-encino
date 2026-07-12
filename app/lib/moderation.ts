/**
 * Server-side content moderation — bad words filter (Spanish + English)
 * Compact list targeting common profanity in user-submitted event content.
 */

const BAD_WORDS = [
  // Spanish
  'puta','puto','putos','putas','verga','vergas','chingar','chingada','chingado',
  'pendejo','pendeja','culero','culera','cabron','cabrona','cabrón','cabrona',
  'mierda','joder','coño','polla','culo','marica','maricon','maricón',
  'chupa','mamada','mamadas','piche','pinche','pinches','wey','buey',
  'chingon','chingona','chingones','chingo','chingas','folla','follando',
  'cogiendo','cojiendo','coger','putita','prostituta','pito','tetas','nalgas',
  'caliente','encuera','encuerada','desnuda','desnudo','sexo','porno',
  // English
  'fuck','fucking','fucker','shit','ass','asshole','bitch','cunt','dick',
  'cock','pussy','nigger','faggot','porn','sex','naked','nude',
];

const REGEX = new RegExp(
  `\\b(${BAD_WORDS.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
  'gi'
);

/**
 * Returns the first bad word found, or null if clean.
 */
export function findBadWord(text: string): string | null {
  const match = text.match(REGEX);
  return match ? match[0].toLowerCase() : null;
}

/**
 * Checks all provided strings. Returns error message or null if clean.
 */
export function moderateText(fields: Record<string, string>): string | null {
  for (const [_key, value] of Object.entries(fields)) {
    const word = findBadWord(value);
    if (word) return `El contenido no cumple con nuestras políticas de uso.`;
  }
  return null;
}
