#!/usr/bin/env node

/**
 * Script para Actualizar Editoriales
 *
 * Lee un archivo JSON con libros (incluyendo editorial) y actualiza
 * las editoriales en la base de datos de Supabase.
 *
 * Uso:
 *   node scripts/actualizar-editoriales.mjs ruta/al/archivo.json
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.development') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Cache de editoriales para evitar búsquedas repetidas
const editorialesCache = new Map();

/**
 * Obtiene o crea una editorial en la base de datos
 */
async function obtenerOCrearEditorial(nombreEditorial) {
  if (!nombreEditorial || nombreEditorial.trim() === '') {
    return null;
  }

  const nombre = nombreEditorial.trim();

  // Verificar cache
  if (editorialesCache.has(nombre)) {
    return editorialesCache.get(nombre);
  }

  // Buscar editorial existente
  const { data: existente, error: searchError } = await supabase
    .from('editoriales')
    .select('id, nombre')
    .ilike('nombre', nombre)
    .maybeSingle();

  if (searchError) {
    console.error(`⚠️  Error al buscar editorial "${nombre}":`, searchError.message);
    return null;
  }

  if (existente) {
    editorialesCache.set(nombre, existente.id);
    return existente.id;
  }

  // Crear nueva editorial
  const { data: nueva, error: insertError } = await supabase
    .from('editoriales')
    .insert({ nombre })
    .select('id')
    .single();

  if (insertError) {
    console.error(`❌ Error al crear editorial "${nombre}":`, insertError.message);
    return null;
  }

  console.log(`✨ Nueva editorial creada: ${nombre}`);
  editorialesCache.set(nombre, nueva.id);
  return nueva.id;
}

/**
 * Actualiza la editorial de un libro
 */
async function actualizarEditorialLibro(libro) {
  try {
    // Obtener o crear la editorial
    const editorialId = await obtenerOCrearEditorial(libro.editorial);

    if (!editorialId) {
      return { success: false, reason: 'No se pudo obtener editorial' };
    }

    // Buscar el libro por código o ISBN
    let query = supabase.from('libros').select('id, titulo, editorial_id');

    if (libro.code && libro.code.trim() !== '') {
      query = query.eq('legacy_id', libro.code.trim());
    } else if (libro.isbn && libro.isbn.trim() !== '') {
      query = query.eq('isbn', libro.isbn.trim());
    } else {
      return { success: false, reason: 'Sin código ni ISBN' };
    }

    const { data: libroEncontrado, error: searchError } = await query.maybeSingle();

    if (searchError) {
      return { success: false, reason: searchError.message };
    }

    if (!libroEncontrado) {
      return { success: false, reason: 'Libro no encontrado' };
    }

    // Actualizar solo si es diferente
    if (libroEncontrado.editorial_id === editorialId) {
      return { success: true, reason: 'Ya tenía la editorial correcta' };
    }

    // Actualizar la editorial del libro
    const { error: updateError } = await supabase
      .from('libros')
      .update({ editorial_id: editorialId })
      .eq('id', libroEncontrado.id);

    if (updateError) {
      return { success: false, reason: updateError.message };
    }

    return { success: true, reason: 'Actualizado' };

  } catch (error) {
    return { success: false, reason: error.message };
  }
}

/**
 * Procesa todos los libros del JSON
 */
async function procesarLibros(libros) {
  console.log(`\n📚 Procesando ${libros.length} libros...\n`);

  let actualizados = 0;
  let yaCorrectos = 0;
  let errores = 0;
  const detallesErrores = [];

  for (let i = 0; i < libros.length; i++) {
    const libro = libros[i];
    const resultado = await actualizarEditorialLibro(libro);

    if (resultado.success) {
      if (resultado.reason === 'Ya tenía la editorial correcta') {
        yaCorrectos++;
      } else {
        actualizados++;
      }
    } else {
      errores++;
      detallesErrores.push({
        titulo: libro.title || 'Sin título',
        codigo: libro.code || libro.isbn || 'N/A',
        error: resultado.reason
      });
    }

    // Mostrar progreso cada 50 libros
    if ((i + 1) % 50 === 0 || i === libros.length - 1) {
      console.log(`📊 Progreso: ${i + 1}/${libros.length} - Actualizados: ${actualizados}, Correctos: ${yaCorrectos}, Errores: ${errores}`);
    }

    // Pausa para no saturar la API
    if (i < libros.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  return { actualizados, yaCorrectos, errores, detallesErrores };
}

/**
 * Función principal
 */
async function main() {
  console.log('📝 Script de Actualización de Editoriales\n');
  console.log('='.repeat(60));

  const filePath = process.argv[2];

  if (!filePath) {
    console.error('\n❌ Error: No se especificó archivo JSON');
    console.log('\n📖 Uso:');
    console.log('   node scripts/actualizar-editoriales.mjs ruta/al/archivo.json');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`\n❌ Error: Archivo no encontrado: ${filePath}`);
    process.exit(1);
  }

  console.log(`\n📄 Archivo: ${path.basename(filePath)}`);

  try {
    const contenido = fs.readFileSync(filePath, 'utf-8');
    const libros = JSON.parse(contenido);

    if (!Array.isArray(libros)) {
      console.error('❌ Error: El JSON debe contener un array de libros');
      process.exit(1);
    }

    console.log(`✅ ${libros.length} libros encontrados en el JSON`);

    // Mostrar muestra
    console.log('\n📋 Muestra de los primeros 3 libros:');
    console.log('='.repeat(60));
    libros.slice(0, 3).forEach((libro, i) => {
      console.log(`\n${i + 1}. ${libro.title}`);
      console.log(`   Código: ${libro.code || 'N/A'}`);
      console.log(`   Editorial: ${libro.editorial || 'Sin editorial'}`);
      console.log(`   ISBN: ${libro.isbn || 'N/A'}`);
    });
    console.log('\n' + '='.repeat(60));

    // Confirmar
    const autoConfirm = process.argv.includes('--confirm');

    if (!autoConfirm) {
      console.log('\n⚠️  ¿Continuar con la actualización?');
      console.log('💡 Usa --confirm para saltar esta confirmación');
      console.log('   Ejemplo: node scripts/actualizar-editoriales.mjs archivo.json --confirm');
      process.exit(0);
    }

    // Procesar libros
    const resultado = await procesarLibros(libros);

    // Mostrar resultados
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE ACTUALIZACIÓN');
    console.log('='.repeat(60));
    console.log(`✅ Actualizados: ${resultado.actualizados}`);
    console.log(`✓  Ya correctos: ${resultado.yaCorrectos}`);
    console.log(`❌ Errores: ${resultado.errores}`);
    console.log(`📈 Total procesados: ${libros.length}`);
    console.log(`✨ Editoriales creadas: ${editorialesCache.size}`);

    if (resultado.detallesErrores.length > 0) {
      console.log('\n⚠️  Detalles de errores (primeros 10):');
      resultado.detallesErrores.slice(0, 10).forEach(err => {
        console.log(`\n  Libro: ${err.titulo}`);
        console.log(`  Código: ${err.codigo}`);
        console.log(`  Error: ${err.error}`);
      });
      if (resultado.detallesErrores.length > 10) {
        console.log(`\n  ... y ${resultado.detallesErrores.length - 10} errores más`);
      }
    }

    if (resultado.actualizados > 0) {
      console.log('\n✅ Actualización completada exitosamente');
    }

  } catch (error) {
    console.error('\n❌ Error al procesar archivo:', error.message);
    if (error.message.includes('JSON')) {
      console.error('💡 Verifica que el archivo sea un JSON válido');
    }
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n❌ Error fatal:', error);
  process.exit(1);
});
