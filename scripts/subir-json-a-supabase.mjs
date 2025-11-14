#!/usr/bin/env node

/**
 * Script para Subir JSON a Supabase
 * ----------------------------------
 * - Lee un archivo JSON normalizado
 * - Sube los libros a Supabase en lotes
 * - Maneja duplicados y errores
 *
 * Uso:
 *   node scripts/subir-json-a-supabase.mjs ruta/al/archivo.json
 *
 * Ejemplo:
 *   node scripts/subir-json-a-supabase.mjs scripts/libros-normalizado.json
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

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
 * Transforma el formato JSON normalizado al formato de la tabla libros
 */
function transformToDatabase(book) {
  return {
    code: book.code || '',
    title: book.title || book.titulo || 'Sin título',
    author: book.author || book.autor || 'Desconocido',
    editorial: book.editorial || '',
    year: book.year || book.año ? parseInt(book.year || book.año) : null,
    price: parseFloat(book.price || book.precio || '0'),
    pages: parseInt(book.pages || book.paginas || '0'),
    description: book.description || book.descripcion || '',
    category: book.category || book.categoria || 'General',
    ubicacion: book.ubicacion || 'almacen',
    stock: parseInt(book.stock || '1'),
    isbn: book.isbn || '',
    cover_image: book.cover_image || '',
    rating: parseFloat(book.rating || '0'),
    featured: book.featured || false,
    is_new: book.is_new || false,
    on_sale: book.on_sale || false
  };
}

/**
 * Sube libros a Supabase en lotes
 */
async function uploadBooks(books, batchSize = 100) {
  console.log(`\n📦 Subiendo ${books.length} libros en lotes de ${batchSize}...\n`);

  let imported = 0;
  let errors = 0;
  let duplicates = 0;
  const errorDetails = [];

  for (let i = 0; i < books.length; i += batchSize) {
    const batch = books.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(books.length / batchSize);

    console.log(`📤 Procesando lote ${batchNum}/${totalBatches} (${batch.length} libros)...`);

    try {
      const { data, error } = await supabase
        .from('libros')
        .insert(batch)
        .select();

      if (error) {
        // Verificar si es error de duplicados
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          console.log(`⚠️  Lote ${batchNum}: Algunos libros ya existen (duplicados)`);
          duplicates += batch.length;

          // Intentar subir uno por uno para identificar cuáles son duplicados
          console.log(`   🔄 Reintentando libro por libro...`);
          let batchImported = 0;
          let batchDuplicates = 0;

          for (const book of batch) {
            try {
              const { error: singleError } = await supabase
                .from('libros')
                .insert([book])
                .select();

              if (singleError) {
                if (singleError.message.includes('duplicate') || singleError.message.includes('unique')) {
                  batchDuplicates++;
                } else {
                  errors++;
                  errorDetails.push({
                    book: book.code || book.title,
                    error: singleError.message
                  });
                }
              } else {
                batchImported++;
              }
            } catch (err) {
              errors++;
              errorDetails.push({
                book: book.code || book.title,
                error: err.message
              });
            }
          }

          imported += batchImported;
          duplicates = batchDuplicates;
          console.log(`   ✅ ${batchImported} nuevos, ⚠️  ${batchDuplicates} duplicados`);

        } else {
          console.error(`❌ Error en lote ${batchNum}: ${error.message}`);
          errors += batch.length;
          errorDetails.push({
            batch: batchNum,
            error: error.message,
            books: batch.slice(0, 3).map(b => b.code)
          });
        }
      } else {
        imported += batch.length;
        console.log(`✅ Lote ${batchNum} importado exitosamente`);
      }
    } catch (err) {
      console.error(`❌ Error inesperado en lote ${batchNum}: ${err.message}`);
      errors += batch.length;
      errorDetails.push({
        batch: batchNum,
        error: err.message
      });
    }

    // Pausa entre lotes
    if (i + batchSize < books.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return { imported, errors, duplicates, errorDetails };
}

/**
 * Función principal
 */
async function main() {
  console.log('📚 Script para Subir JSON a Supabase\n');
  console.log('═'.repeat(50));

  // Obtener ruta del archivo desde argumentos
  const filePath = process.argv[2];

  if (!filePath) {
    console.error('\n❌ Error: No se especificó archivo JSON');
    console.log('\n📖 Uso:');
    console.log('   node scripts/subir-json-a-supabase.mjs ruta/al/archivo.json');
    console.log('\n📝 Ejemplo:');
    console.log('   node scripts/subir-json-a-supabase.mjs scripts/libros-normalizado.json');
    process.exit(1);
  }

  // Verificar que el archivo existe
  if (!fs.existsSync(filePath)) {
    console.error(`\n❌ Error: Archivo no encontrado: ${filePath}`);
    process.exit(1);
  }

  // Verificar que sea un archivo JSON
  if (!filePath.endsWith('.json')) {
    console.error(`\n❌ Error: El archivo debe ser .json`);
    process.exit(1);
  }

  // Obtener información del archivo
  const stats = fs.statSync(filePath);
  const fileSizeKB = (stats.size / 1024).toFixed(2);

  console.log(`\n📄 Archivo: ${path.basename(filePath)}`);
  console.log(`📊 Tamaño: ${fileSizeKB} KB`);

  try {
    // Leer y parsear JSON
    console.log('\n🔍 Leyendo archivo JSON...');
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    // Verificar que sea un array
    if (!Array.isArray(data)) {
      console.error('\n❌ Error: El JSON debe contener un array de libros');
      process.exit(1);
    }

    console.log(`✅ ${data.length} libros encontrados en el JSON`);

    // Transformar datos al formato de la base de datos
    console.log('\n🔄 Transformando datos...');
    const books = data.map(transformToDatabase);
    console.log(`✅ ${books.length} libros listos para subir`);

    // Mostrar muestra
    console.log('\n📋 Muestra de los primeros 3 libros:');
    console.log('═'.repeat(50));
    books.slice(0, 3).forEach((book, i) => {
      console.log(`\n${i + 1}. ${book.title}`);
      console.log(`   Código: ${book.code}`);
      console.log(`   Autor: ${book.author}`);
      console.log(`   Precio: €${book.price}`);
      console.log(`   Categoría: ${book.category}`);
    });
    console.log('\n' + '═'.repeat(50));

    // Confirmar subida
    console.log(`\n⚠️  Se van a subir ${books.length} libros a Supabase`);

    const autoConfirm = process.argv.includes('--confirm');

    if (!autoConfirm) {
      console.log('\n💡 Usa --confirm para confirmar la subida');
      console.log('   Ejemplo: node scripts/subir-json-a-supabase.mjs archivo.json --confirm');
      process.exit(0);
    }

    // Subir libros
    console.log('\n🚀 Iniciando subida...');
    const result = await uploadBooks(books);

    // Mostrar resultados
    console.log('\n' + '═'.repeat(50));
    console.log('📊 RESUMEN DE SUBIDA');
    console.log('═'.repeat(50));
    console.log(`✅ Importados:   ${result.imported}`);
    console.log(`⚠️  Duplicados:   ${result.duplicates}`);
    console.log(`❌ Errores:      ${result.errors}`);
    console.log(`📈 Total:        ${books.length}`);

    if (result.errorDetails.length > 0 && result.errorDetails.length <= 10) {
      console.log('\n⚠️  Detalles de errores:');
      result.errorDetails.forEach(err => {
        if (err.book) {
          console.log(`   • ${err.book}: ${err.error}`);
        } else {
          console.log(`   • Lote ${err.batch}: ${err.error}`);
        }
      });
    } else if (result.errorDetails.length > 10) {
      console.log(`\n⚠️  ${result.errorDetails.length} errores detectados (demasiados para mostrar)`);
    }

    if (result.imported > 0) {
      console.log('\n✅ Subida completada exitosamente');
      console.log('\n💡 Próximos pasos:');
      console.log('   1. Verifica los libros en el panel de administración');
      console.log('   2. Agrega imágenes de portada si es necesario');
      console.log('   3. Ajusta stock y precios según corresponda');
    }

  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error('\n❌ Error: El archivo JSON no es válido');
      console.error(`   ${error.message}`);
    } else {
      console.error('\n❌ Error al procesar archivo:', error.message);
    }
    process.exit(1);
  }
}

// Ejecutar script
main().catch(error => {
  console.error('\n❌ Error fatal:', error);
  process.exit(1);
});
