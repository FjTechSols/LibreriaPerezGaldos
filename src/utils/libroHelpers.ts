import { Libro } from '../types';

export const getLibroCodigo = (libro: Libro): string => {
  if (libro.legacy_id) {
    return libro.legacy_id;
  }

  if (libro.codigo) {
    return libro.codigo;
  }

  return `#${libro.id}`;
};

export const formatLibroCodigo = (libro: Libro): string => {
  const codigo = getLibroCodigo(libro);
  const isLegacy = !!libro.legacy_id;

  return isLegacy ? `Legacy: ${codigo}` : codigo;
};
