/**
 * Utilidad para generar códigos de libros según la ubicación
 *
 * Reglas:
 * - almacen: Solo números (ej: 001234)
 * - Galeon: Números + G (ej: 001234G)
 * - Hortaleza: Números + H (ej: 001234H)
 * - Reina: Números + R (ej: 001234R)
 * - Abebooks: Números + Ab (ej: 001234Ab)
 */

export type UbicacionTipo = 'almacen' | 'Galeon' | 'Hortaleza' | 'Reina' | 'Abebooks' | string;

/**
 * Obtiene el sufijo correspondiente a una ubicación
 */
export function obtenerSufijoUbicacion(ubicacion: string): string {
  const ubicacionNormalizada = ubicacion.toLowerCase().trim();

  switch (ubicacionNormalizada) {
    case 'almacen':
    case 'almacén':
      return '';
    case 'galeon':
    case 'galeón':
      return 'G';
    case 'hortaleza':
      return 'H';
    case 'reina':
      return 'R';
    case 'abebooks':
      return 'Ab';
    case 'uniliber':
      return 'UL';
    case 'general':
      return 'AG';
    default:
      return '';
  }
}

/**
 * Extrae el número base de un código (sin sufijo de ubicación)
 */
export function extraerNumeroBase(codigo: string): string {
  if (!codigo) return '';

  // Remover todos los sufijos posibles
  const codigoSinSufijo = codigo
    .replace(/Ab$/i, '')
    .replace(/[GHRN]$/i, '');

  // Extraer solo los dígitos
  const numeros = codigoSinSufijo.match(/\d+/);
  return numeros ? numeros[0] : '';
}

/**
 * Genera un código de libro basado en la ubicación
 *
 * @param numeroBase - El número base del código (puede ser un ID o código existente)
 * @param ubicacion - La ubicación del libro
 * @param paddingLength - Longitud del número con padding (default: 6)
 * @returns El código formateado con el sufijo de ubicación
 */
export function generarCodigoLibro(
  numeroBase: string | number,
  ubicacion: string,
  paddingLength: number = 6
): string {
  // Convertir a string y extraer solo los números
  const numeroStr = numeroBase.toString();
  const numeros = numeroStr.match(/\d+/);
  const numero = numeros ? numeros[0] : numeroStr;

  // Aplicar padding con ceros a la izquierda
  const numeroPadded = numero.padStart(paddingLength, '0');

  // Obtener el sufijo según la ubicación
  const sufijo = obtenerSufijoUbicacion(ubicacion);

  // Retornar el código completo
  return `${numeroPadded}${sufijo}`;
}

/**
 * Actualiza un código existente con una nueva ubicación
 *
 * @param codigoActual - El código actual del libro
 * @param nuevaUbicacion - La nueva ubicación
 * @returns El código actualizado con el nuevo sufijo
 */
export function actualizarCodigoPorUbicacion(
  codigoActual: string,
  nuevaUbicacion: string
): string {
  const numeroBase = extraerNumeroBase(codigoActual);
  return generarCodigoLibro(numeroBase, nuevaUbicacion);
}

/**
 * Valida si un código tiene el formato correcto para su ubicación
 */
export function validarCodigoUbicacion(codigo: string, ubicacion: string): boolean {
  const sufijoEsperado = obtenerSufijoUbicacion(ubicacion);

  if (sufijoEsperado === '') {
    // Para almacen, el código debe ser solo números
    return /^\d+$/.test(codigo);
  }

  // Para otras ubicaciones, debe terminar con el sufijo correcto
  const regex = new RegExp(`\\d+${sufijoEsperado}$`);
  return regex.test(codigo);
}

/**
 * Normaliza un código existente según la ubicación
 * Si el código ya tiene un formato válido, lo mantiene
 * Si no, lo actualiza según la ubicación
 */
// ...
export function normalizarCodigo(codigo: string, ubicacion: string): string {
  if (!codigo) return '';

  // Si el código ya es válido para la ubicación, mantenerlo
  if (validarCodigoUbicacion(codigo, ubicacion)) {
    return codigo;
  }

  // Si no es válido, actualizarlo
  return actualizarCodigoPorUbicacion(codigo, ubicacion);
}

/**
 * Deduce la ubicación basada en el sufijo del código
 */
export function obtenerUbicacionPorCodigo(codigo: string): string | null {
  if (!codigo) return null;
  const c = codigo.trim();

  // Check suffixes in specific order (longest first to avoid partial matches if any)
  if (c.endsWith('Ab')) return 'Abebooks';
  if (c.endsWith('G')) return 'Galeon';
  if (c.endsWith('H')) return 'Hortaleza';
  if (c.endsWith('R')) return 'Reina';
  if (c.endsWith('UL')) return 'UniLiber'; // Assuming this exists based on previous file analysis
  
  // If no suffix and contains only digits, assume Almacén
  if (/^\d+$/.test(c)) return 'Almacén';

  return null; // Unknown format
}
