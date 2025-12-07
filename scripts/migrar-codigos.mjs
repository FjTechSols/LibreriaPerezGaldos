#!/usr/bin/env node

/**
 * Script de Migración de Códigos de Libros
 * ----------------------------------------
 * Actualiza los códigos (legacy_id) de todos los libros existentes
 * según su ubicación usando el nuevo sistema de códigos automáticos.
 *
 * Uso:
 *   node scripts/migrar-codigos.mjs
 *   node scripts/migrar-codigos.mjs --dry-run  (para simular sin cambios)
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
 * Obtiene el sufijo correspondiente a una ubicación
 */
function obtenerSufijoUbicacion(ubicacion) {
  if (!ubicacion) return '';

  const ubicacionNormalizada = ubicacion.toLowerCase().trim();

  switch (ubicacionNormalizada) {
    case 'almacen':
      return '';
    case 'galeon':
      return 'G';
    case 'hortaleza':
      return 'H';
    case 'reina':
      return 'R';
    case 'abebooks':
      return 'Ab';
    default:
      return '';
  }
}

/**
 * Genera un código de libro basado en el ID y la ubicación
 */
function generarCodigoLibro(idLibro, ubicacion, paddingLength = 6) {
  const numero = idLibro.toString().padStart(paddingLength, '0');
  const sufijo = obtenerSufijoUbicacion(ubicacion);
  return `${numero}${sufijo}`;
}

/**
 * Función principal
 */
async function main() {
  console.log('📚 Script de Migración de Códigos de Libros\n');
  console.log('═'.repeat(60));

  const isDryRun = process.argv.includes('--dry-run');

  if (isDryRun) {
    console.log('⚠️  MODO DRY-RUN: No se realizarán cambios reales');
  } else {
    console.log('🔄 MODO EJECUCIÓN: Se actualizarán los códigos');
  }

  console.log('═'.repeat(60));

  try {
    // Obtener todos los libros activos
    console.log('\n🔍 Obteniendo libros de la base de datos...');

    const { data: libros, error } = await supabase
      .from('libros')
      .select('id, legacy_id, ubicacion, titulo')
      .eq('activo', true)
      .order('id', { ascending: true });

    if (error) {
      console.error('❌ Error al obtener libros:', error);
      process.exit(1);
    }

    console.log(`✅ Se encontraron ${libros.length} libros\n`);

    // Estadísticas
    const stats = {
      total: libros.length,
      actualizados: 0,
      sinCambios: 0,
      errores: 0,
      porUbicacion: {}
    };

    // Agrupar por ubicación
    libros.forEach(libro => {
      const ubicacion = libro.ubicacion || 'almacen';
      if (!stats.porUbicacion[ubicacion]) {
        stats.porUbicacion[ubicacion] = 0;
      }
      stats.porUbicacion[ubicacion]++;
    });

    console.log('📊 Libros por ubicación:');
    Object.entries(stats.porUbicacion).forEach(([ubicacion, count]) => {
      const sufijo = obtenerSufijoUbicacion(ubicacion);
      const ejemplo = generarCodigoLibro(1234, ubicacion);
      console.log(`   ${ubicacion.padEnd(15)} ${count.toString().padStart(4)} libros  →  Formato: ${ejemplo}`);
    });

    console.log('\n' + '─'.repeat(60));
    console.log('🔄 Procesando libros...\n');

    // Procesar cada libro
    for (const libro of libros) {
      const ubicacion = libro.ubicacion || 'almacen';
      const codigoActual = libro.legacy_id;
      const codigoNuevo = generarCodigoLibro(libro.id, ubicacion);

      // Verificar si necesita actualización
      if (codigoActual === codigoNuevo) {
        stats.sinCambios++;
        continue;
      }

      // Mostrar cambio
      const nombreCorto = libro.titulo.length > 40
        ? libro.titulo.substring(0, 40) + '...'
        : libro.titulo;

      console.log(`ID ${libro.id.toString().padStart(6)}: ${codigoActual || 'NULL'} → ${codigoNuevo}  (${nombreCorto})`);

      // Actualizar si no es dry-run
      if (!isDryRun) {
        const { error: updateError } = await supabase
          .from('libros')
          .update({ legacy_id: codigoNuevo })
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

      // Pequeña pausa para no saturar
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Mostrar resumen
    console.log('\n' + '═'.repeat(60));
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('═'.repeat(60));
    console.log(`📚 Total de libros:      ${stats.total}`);
    console.log(`✅ Actualizados:         ${stats.actualizados}`);
    console.log(`⏭️  Sin cambios:          ${stats.sinCambios}`);
    console.log(`❌ Errores:              ${stats.errores}`);

    if (isDryRun) {
      console.log('\n⚠️  Esto fue una simulación. Ejecuta sin --dry-run para aplicar cambios.');
    } else {
      console.log('\n✅ Migración completada exitosamente');
    }

    // Verificación post-migración
    if (!isDryRun && stats.actualizados > 0) {
      console.log('\n🔍 Verificando resultados...');

      for (const ubicacion of Object.keys(stats.porUbicacion)) {
        const sufijo = obtenerSufijoUbicacion(ubicacion);
        const { count, error } = await supabase
          .from('libros')
          .select('*', { count: 'exact', head: true })
          .eq('activo', true)
          .eq('ubicacion', ubicacion)
          .like('legacy_id', sufijo ? `%${sufijo}` : '%');

        if (!error) {
          console.log(`   ✅ ${ubicacion}: ${count} códigos verificados`);
        }
      }
    }

    console.log('\n💡 Próximos pasos:');
    console.log('   1. Verifica los códigos en el panel de administración');
    console.log('   2. Ejecuta una búsqueda de prueba para verificar');
    console.log('   3. Revisa que los códigos sean consistentes');

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
