#!/usr/bin/env node

/**
 * Script de Limpieza de ISBN en Descripciones
 * --------------------------------------------
 * Extrae los ISBNs que están en las descripciones y los mueve
 * al campo correcto, limpiando la descripción en el proceso.
 *
 * Uso:
 *   node scripts/limpiar-isbn-descripcion.mjs
 *   node scripts/limpiar-isbn-descripcion.mjs --dry-run  (simular sin cambios)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '../.env.development') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno no configuradas');
  console.error('   Asegúrate de tener VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.development');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Repara encoding de caracteres especiales
 */
function fixEncoding(text = '') {
  if (!text) return '';

  // Mapa extendido de caracteres comunes mal codificados
  const replacements = {
    // Vocales minúsculas con tildes
    'Ã¡': 'á', 'Ã©': 'é', 'Ã­': 'í', 'Ã³': 'ó', 'Ãº': 'ú',
    'á': 'á', 'é': 'é', 'í': 'í', 'ó': 'ó', 'ú': 'ú',

    // Vocales mayúsculas con tildes
    'Ã': 'Á', 'Ã‰': 'É', 'Ã': 'Í', 'Ã"': 'Ó', 'Ãš': 'Ú',
    'Á': 'Á', 'É': 'É', 'Í': 'Í', 'Ó': 'Ó', 'Ú': 'Ú',

    // Ñ y ñ
    'Ã±': 'ñ', 'Ã'': 'Ñ', 'ñ': 'ñ', 'Ñ': 'Ñ',

    // Diéresis
    'Ã¼': 'ü', 'Ã¶': 'ö', 'Ã¤': 'ä',
    'Ãœ': 'Ü', 'Ã–': 'Ö', 'Ã„': 'Ä',
    'ü': 'ü', 'ö': 'ö', 'ä': 'ä',

    // Otros acentos
    'Ã ': 'à', 'Ã¨': 'è', 'Ã¬': 'ì', 'Ã²': 'ò', 'Ã¹': 'ù',
    'Ã€': 'À', 'Ãˆ': 'È', 'ÃŒ': 'Ì', 'Ã'': 'Ò', 'Ã™': 'Ù',
    'Ã¢': 'â', 'Ãª': 'ê', 'Ã®': 'î', 'Ã´': 'ô', 'Ã»': 'û',
    'Ã‚': 'Â', 'ÃŠ': 'Ê', 'ÃŽ': 'Î', 'Ã"': 'Ô', 'Ã›': 'Û',

    // Caracteres especiales
    'Ã§': 'ç', 'Ã‡': 'Ç', 'ç': 'ç',
    'Â°': '°', 'Âª': 'ª', 'Âº': 'º',
    'Â¿': '¿', 'Â¡': '¡',
    'Â«': '«', 'Â»': '»',
    'Â·': '·', 'Â¢': '¢', 'Â£': '£',

    // Comillas y apóstrofes
    'â€œ': '"', 'â€': '"', 'â€™': "'", 'â€˜': "'",
    'â€º': '›', 'â€¹': '‹',
    '"': '"', '"': '"', ''': "'", ''': "'",

    // Guiones y rayas
    'â€"': '—', 'â€"': '–', 'â€¢': '•',
    '—': '—', '–': '–', '•': '•',

    // Caracteres problemáticos específicos
    'Ã�': 'Ñ',
    'Â ': ' ',
    '\u00A0': ' ',
  };

  let fixed = text;

  for (const [bad, good] of Object.entries(replacements)) {
    fixed = fixed.replace(new RegExp(bad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), good);
  }

  fixed = fixed.replace(/\s+/g, ' ');
  fixed = fixed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return fixed.trim();
}

/**
 * Extrae el ISBN de un texto y devuelve el ISBN y el texto limpio
 */
function extractISBN(text) {
  if (!text) return { isbn: '', cleanText: text || '' };

  // Patrones comunes de ISBN
  const patterns = [
    /ISBN[\s:-]*(\d{10,13})/i,           // ISBN: 9788477743163
    /ISBN[\s:-]*(\d{1,5}[-\s]?\d{1,7}[-\s]?\d{1,7}[-\s]?\d{1,7}[-\s]?\d{1})/i, // ISBN con guiones
    /\bISBN\s*[:\-]?\s*([0-9X-]{10,17})\b/i, // ISBN general
    /,\s*ISBN\s*[:\-]?\s*(\d{10,13})/i,  // Después de coma
  ];

  let isbn = '';
  let cleanText = text;

  // Intentar cada patrón
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      isbn = match[1].replace(/[-\s]/g, ''); // Remover guiones y espacios

      // Validar longitud del ISBN
      if (isbn.length === 10 || isbn.length === 13) {
        // Remover el ISBN y texto relacionado de la descripción
        cleanText = text
          .replace(/,?\s*ISBN[\s:-]*\d{10,13}/gi, '')
          .replace(/,?\s*ISBN[\s:-]*[0-9X-]+/gi, '')
          .replace(/\s+/g, ' ')
          .trim();

        break;
      }
    }
  }

  // Limpiar múltiples espacios, comas duplicadas y puntuación al inicio/fin
  cleanText = cleanText
    .replace(/\s*,\s*,\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .replace(/^[,\s.;:-]+|[,\s.;:-]+$/g, '')
    .trim();

  return { isbn, cleanText };
}

/**
 * Función principal
 */
async function main() {
  console.log('🧹 Script de Limpieza de ISBNs en Descripciones\n');
  console.log('═'.repeat(70));

  const isDryRun = process.argv.includes('--dry-run');

  if (isDryRun) {
    console.log('⚠️  MODO DRY-RUN: No se realizarán cambios reales');
  } else {
    console.log('🔄 MODO EJECUCIÓN: Se actualizarán los libros');
  }

  console.log('═'.repeat(70));

  try {
    // Obtener todos los libros activos con descripción
    console.log('\n🔍 Buscando libros con ISBNs en la descripción...');

    const { data: libros, error } = await supabase
      .from('libros')
      .select('id, titulo, isbn, descripcion')
      .eq('activo', true)
      .not('descripcion', 'is', null)
      .ilike('descripcion', '%ISBN%')
      .order('id', { ascending: true });

    if (error) {
      console.error('❌ Error al obtener libros:', error);
      process.exit(1);
    }

    console.log(`✅ Se encontraron ${libros.length} libros con "ISBN" en la descripción\n`);

    if (libros.length === 0) {
      console.log('✅ No hay libros que necesiten limpieza');
      return;
    }

    // Estadísticas
    const stats = {
      total: libros.length,
      conISBNExtraido: 0,
      actualizados: 0,
      yaTeníanISBN: 0,
      sinISBNEnDescripcion: 0,
      errores: 0
    };

    console.log('📊 Procesando libros...\n');
    console.log('─'.repeat(70));

    // Procesar cada libro
    for (const libro of libros) {
      const tituloCorto = libro.titulo.length > 50
        ? libro.titulo.substring(0, 50) + '...'
        : libro.titulo;

      // Normalizar y extraer ISBN de la descripción
      const descripcionNormalizada = fixEncoding(libro.descripcion);
      const { isbn: isbnExtraido, cleanText: descripcionLimpia } = extractISBN(descripcionNormalizada);

      // Si no se encontró ISBN en la descripción, saltar
      if (!isbnExtraido) {
        stats.sinISBNEnDescripcion++;
        console.log(`⏭️  ID ${libro.id}: Sin ISBN extraíble - ${tituloCorto}`);
        continue;
      }

      stats.conISBNExtraido++;

      // Verificar si ya tiene ISBN
      const isbnFinal = libro.isbn || isbnExtraido;
      const descripcionFinal = descripcionLimpia;

      // Mostrar cambios
      console.log(`\n📖 ID ${libro.id}: ${tituloCorto}`);

      if (libro.isbn) {
        stats.yaTeníanISBN++;
        console.log(`   📌 ISBN actual: ${libro.isbn}`);
        console.log(`   🔍 ISBN extraído: ${isbnExtraido}`);

        if (libro.isbn !== isbnExtraido) {
          console.log(`   ⚠️  DIFERENTE - Manteniendo ISBN actual`);
        }
      } else {
        console.log(`   ✨ ISBN extraído: ${isbnExtraido}`);
      }

      const descAnteriorMuestra = libro.descripcion.substring(0, 80);
      const descLimpiaMuestra = descripcionFinal.substring(0, 80);
      console.log(`   📝 Anterior: ${descAnteriorMuestra}${libro.descripcion.length > 80 ? '...' : ''}`);
      console.log(`   ✅ Limpia:   ${descLimpiaMuestra}${descripcionFinal.length > 80 ? '...' : ''}`);

      // Actualizar si no es dry-run
      if (!isDryRun) {
        const updateData = {
          descripcion: descripcionFinal
        };

        // Solo actualizar ISBN si no tiene uno
        if (!libro.isbn) {
          updateData.isbn = isbnFinal;
        }

        const { error: updateError } = await supabase
          .from('libros')
          .update(updateData)
          .eq('id', libro.id);

        if (updateError) {
          console.error(`   ❌ Error al actualizar: ${updateError.message}`);
          stats.errores++;
        } else {
          stats.actualizados++;
        }
      } else {
        stats.actualizados++;
      }

      // Pequeña pausa
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Mostrar resumen
    console.log('\n' + '═'.repeat(70));
    console.log('📊 RESUMEN DE LIMPIEZA');
    console.log('═'.repeat(70));
    console.log(`📚 Total analizado:              ${stats.total}`);
    console.log(`🔍 Con ISBN extraído:            ${stats.conISBNExtraido}`);
    console.log(`✅ Libros actualizados:          ${stats.actualizados}`);
    console.log(`📌 Ya tenían ISBN (solo limpieza): ${stats.yaTeníanISBN}`);
    console.log(`⏭️  Sin ISBN en descripción:     ${stats.sinISBNEnDescripcion}`);
    console.log(`❌ Errores:                      ${stats.errores}`);

    if (isDryRun) {
      console.log('\n⚠️  Esto fue una simulación. Ejecuta sin --dry-run para aplicar cambios.');
    } else {
      console.log('\n✅ Limpieza completada exitosamente');
    }

    // Verificación post-limpieza
    if (!isDryRun && stats.actualizados > 0) {
      console.log('\n🔍 Verificando resultados...');

      const { count: librosConISBNEnDesc } = await supabase
        .from('libros')
        .select('*', { count: 'exact', head: true })
        .eq('activo', true)
        .ilike('descripcion', '%ISBN%');

      console.log(`   📝 Libros que aún tienen "ISBN" en descripción: ${librosConISBNEnDesc || 0}`);

      if (librosConISBNEnDesc > 0) {
        console.log('   💡 Algunos libros pueden tener ISBNs en formatos no reconocidos');
      }
    }

    console.log('\n💡 Próximos pasos:');
    console.log('   1. Verifica las descripciones en el panel de administración');
    console.log('   2. Revisa que los ISBNs se hayan extraído correctamente');
    console.log('   3. Ejecuta de nuevo si quedan libros por limpiar');

  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  }
}

// Ejecutar script
main().catch(error => {
  console.error('\n❌ Error inesperado:', error);
  process.exit(1);
});
