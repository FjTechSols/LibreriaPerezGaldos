export type ShippingZone = 'national' | 'europe' | 'america' | 'asia' | 'other';

export const SUPPORTED_COUNTRIES = {
  europe: ['Alemania', 'Austria', 'Bélgica', 'Dinamarca', 'Francia', 'Grecia', 'Holanda', 'Hungría', 'Irlanda', 'Italia', 'Noruega', 'Polonia', 'Portugal', 'Reino Unido', 'República Checa', 'Rumania', 'Suecia', 'Suiza'],
  america: ['Argentina', 'Bolivia', 'Brasil', 'Canadá', 'Chile', 'Colombia', 'Costa Rica', 'Ecuador', 'Estados Unidos', 'México', 'Panamá', 'Paraguay', 'Perú', 'Uruguay', 'Venezuela'],
  asia: ['China', 'Corea del Sur', 'Filipinas', 'Hong Kong', 'India', 'Indonesia', 'Japón', 'Malasia', 'Singapur', 'Tailandia', 'Taiwán', 'Vietnam']
};

// Variantes escritas a mano (legacy) además de la lista del desplegable
const EUROPE_BROAD = ['francia', 'france', 'portugal', 'italia', 'italy', 'alemania', 'germany', 'reino unido', 'uk', 'united kingdom', 'bélgica', 'belgium', 'holanda', 'netherlands', 'países bajos', 'austria', 'dinamarca', 'denmark', 'suecia', 'sweden', 'noruega', 'norway', 'suiza', 'switzerland', 'irlanda', 'ireland', 'grecia', 'greece', 'polonia', 'poland', 'república checa', 'czech republic', 'hungría', 'hungary', 'rumania', 'romania'];

export const getShippingZone = (country: string): ShippingZone => {
  const lowerCountry = country.toLowerCase().trim();

  if (['españa', 'spain', 'es'].includes(lowerCountry)) return 'national';
  if (SUPPORTED_COUNTRIES.europe.some(c => c.toLowerCase() === lowerCountry)) return 'europe';
  if (SUPPORTED_COUNTRIES.america.some(c => c.toLowerCase() === lowerCountry)) return 'america';
  if (SUPPORTED_COUNTRIES.asia.some(c => c.toLowerCase() === lowerCountry)) return 'asia';
  if (EUROPE_BROAD.includes(lowerCountry)) return 'europe';

  return 'other';
};

export const isInternationalCountry = (country: string): boolean => getShippingZone(country) !== 'national';
