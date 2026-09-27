import { BookCondition } from '../types';

// Fuente única de valores y etiquetas del estado físico. El vacío ("Sin especificar") es `null`.
export const BOOK_CONDITIONS: { value: BookCondition; label: string }[] = [
  { value: 'nuevo', label: 'Nuevo' },
  { value: 'buen_estado', label: 'Buen estado' },
  { value: 'leido', label: 'Leído' },
];

export const CONDITION_UNSPECIFIED_LABEL = 'Sin especificar';

export const getConditionLabel = (condition?: BookCondition | null): string =>
  BOOK_CONDITIONS.find(c => c.value === condition)?.label ?? CONDITION_UNSPECIFIED_LABEL;

// Normaliza lo que llega de la BD. Valores desconocidos siguen tratándose como 'leido' (comportamiento previo).
export const normalizeCondition = (raw?: string | null): BookCondition | null => {
  const value = raw?.trim().toLowerCase();
  if (!value) return null;
  return BOOK_CONDITIONS.some(c => c.value === value) ? (value as BookCondition) : 'leido';
};
