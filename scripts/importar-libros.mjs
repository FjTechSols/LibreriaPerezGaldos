#!/usr/bin/env node

/**
 * Script de Importación de Libros
 *
 * Lee un archivo TSV (separado por tabuladores) y lo importa a Supabase
 *
 * Uso:
 *   node scripts/importar-libros.mjs ruta/al/archivo.txt
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

// Mapeo de campos del archivo TSV a campos de la base de datos
// Basado en el formato: N0001026\tEN BUSCA DEL GRAN KAN\tDescripción\tISBN\t...\t12.00\t336\t...
const FIELD_MAPPING = {
  0: 'code',           // Código interno (N0001026)
  1: 'title',          // Título del libro
  2: 'description',    // Descripción
  3: 'isbn',           // ISBN del libro
  4: 'editorial',      // Editorial
  5: 'year',           // Año de publicación
  6: 'author',         // Autor
  9: 'price',          // Precio
  10: 'pages',         // Número de páginas
  16: 'ubicacion'      // Ubicación en almacén
};

/**
 * Parsea una línea del archivo TSV
 */
function parseBookLine(line) {
  const fields = line.split('\t');

  // Extraer campos según el mapeo
  const code = fields[0] || '';
  const title = fields[1] || 'Sin título';
  const description = fields[2] || '';
  const isbn = fields[3] || '';
  const editorial = fields[4] || '';
  const yearStr = fields[5] || '';
  const author = fields[6] || 'Desconocido';
  const priceStr = fields[9] || '0';
  const pagesStr = fields[10] || '0';
  const ubicacion = fields[16] || 'almacen';

  // Convertir año (puede venir como 1978 o 00-00-0000)
  let year = null;
  if (yearStr && yearStr !== '0' && !yearStr.includes('00-00')) {
    const yearNum = parseInt(yearStr);
    if (!isNaN(yearNum) && yearNum > 1000 && yearNum <= new Date().getFullYear()) {
      year = yearNum;
    }
  }

  // Convertir precio
  const price = parseFloat(priceStr.replace(',', '.')) || 0;

  // Convertir páginas
  const pages = parseInt(pagesStr) || 0;

  // Determinar categoría basada en título/descripción
  const category = determineCategory(title, description);

  return {
    code: code.trim(),
    title: title.trim(),
    author: author.trim(),
    isbn: isbn.trim(),
    editorial: editorial.trim(),
    year,
    price,
    pages,
    description: description.trim(),
    category,
    ubicacion: ubicacion.trim(),
    stock: 1, // Por defecto 1 en stock
    cover_image: '', // Se puede agregar después manualmente
    rating: 0,
    featured: false,
    is_new: false,
    on_sale: false
  };
}

/**
 * Determina la categoría basándose en el título y descripción
 */
function determineCategory(title, description) {
  const text = `${title} ${description}`.toLowerCase();

  if (text.includes('infantil') || text.includes('niños')) return 'Infantil';
  if (text.includes('novela') || text.includes('narrativa')) return 'Novela';
  if (text.includes('historia') || text.includes('histórico')) return 'Historia';
  if (text.includes('poesía') || text.includes('poema')) return 'Poesía';
  if (text.includes('ensayo')) return 'Ensayo';
  if (text.includes('biografía') || text.includes('memoria')) return 'Biografía';
  if (text.includes('arte')) return 'Arte';
  if (text.includes('ciencia')) return 'Ciencia';
  if (text.includes('filosofía')) return 'Filosofía';
  if (text.includes('teatro') || text.includes('drama')) return 'Teatro';
  if (text.includes('religión') || text.includes('religioso')) return 'Religión';
  if (text.includes('diccionario') || text.includes('enciclopedia')) return 'Referencia';

  return 'General'; // Categoría por defecto
}

/**
 * Importa libros en lotes
 */
async function importBooks(books, batchSize = 100) {
  console.log(`\n📦 Importando ${books.length} libros en lotes de ${batchSize}...`);

  let imported = 0;
  let errors = 0;
  const errorDetails = [];

  for (let i = 0; i < books.length; i += batchSize) {
    const batch = books.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(books.length / batchSize);

    console.log(`\n📤 Procesando lote ${batchNum}/${totalBatches} (${batch.length} libros)...`);

    try {
      const { data, error } = await supabase
        .from('libros')
        .insert(batch)
        .select();

      if (error) {
        console.error(`❌ Error en lote ${batchNum}:`, error.message);
        errors += batch.length;
        errorDetails.push({
          batch: batchNum,
          error: error.message,
          books: batch.map(b => b.code)
        });
      } else {
        imported += batch.length;
        console.log(`✅ Lote ${batchNum} importado exitosamente`);
      }
    } catch (err) {
      console.error(`❌ Error inesperado en lote ${batchNum}:`, err.message);
      errors += batch.length;
      errorDetails.push({
        batch: batchNum,
        error: err.message,
        books: batch.map(b => b.code)
      });
    }

    // Pequeña pausa entre lotes para no saturar la API
    if (i + batchSize < books.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return { imported, errors, errorDetails };
}

/**
 * Función principal
 */
async function main() {
  console.log('📚 Script de Importación de Libros\n');
  console.log('='.repeat(50));

  // Obtener ruta del archivo desde argumentos
  const filePath = process.argv[2];

  if (!filePath) {
    console.error('\n❌ Error: No se especificó archivo');
    console.log('\n📖 Uso:');
    console.log('   node scripts/importar-libros.mjs ruta/al/archivo.txt');
    console.log('\n📝 Ejemplo:');
    console.log('   node scripts/importar-libros.mjs ./libros.txt');
    process.exit(1);
  }

  // Verificar que el archivo existe
  if (!fs.existsSync(filePath)) {
    console.error(`\n❌ Error: Archivo no encontrado: ${filePath}`);
    process.exit(1);
  }

  // Obtener información del archivo
  const stats = fs.statSync(filePath);
  const fileSizeKB = (stats.size / 1024).toFixed(2);

  console.log(`\n📄 Archivo: ${path.basename(filePath)}`);
  console.log(`📊 Tamaño: ${fileSizeKB} KB`);

  // Leer y parsear archivo
  console.log('\n🔍 Leyendo archivo...');

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    console.log(`✅ ${lines.length} líneas encontradas`);

    // Parsear libros
    console.log('\n🔄 Parseando datos...');
    const books = [];
    const parseErrors = [];

    for (let i = 0; i < lines.length; i++) {
      try {
        const book = parseBookLine(lines[i]);

        // Validar que al menos tenga título
        if (book.title && book.title !== 'Sin título') {
          books.push(book);
        } else {
          parseErrors.push({ line: i + 1, reason: 'Sin título válido' });
        }
      } catch (err) {
        parseErrors.push({ line: i + 1, reason: err.message });
      }
    }

    console.log(`✅ ${books.length} libros parseados correctamente`);

    if (parseErrors.length > 0) {
      console.log(`⚠️  ${parseErrors.length} líneas omitidas por errores`);
    }

    // Mostrar muestra de datos
    console.log('\n📋 Muestra de los primeros 3 libros:');
    console.log('='.repeat(50));
    books.slice(0, 3).forEach((book, i) => {
      console.log(`\n${i + 1}. ${book.title}`);
      console.log(`   Autor: ${book.author}`);
      console.log(`   Precio: €${book.price}`);
      console.log(`   Categoría: ${book.category}`);
    });
    console.log('\n' + '='.repeat(50));

    // Confirmar importación
    console.log(`\n⚠️  Se van a importar ${books.length} libros a la base de datos`);
    console.log(`\n¿Continuar? (escribe 'si' para confirmar)`);

    // En un entorno real, esperarías input del usuario
    // Por ahora, continúa automáticamente si se pasa el argumento --confirm
    const autoConfirm = process.argv.includes('--confirm');

    if (!autoConfirm) {
      console.log('\n💡 Tip: Usa --confirm para saltar esta confirmación');
      console.log('   Ejemplo: node scripts/importar-libros.mjs libros.txt --confirm');
      process.exit(0);
    }

    // Importar libros
    const result = await importBooks(books);

    // Mostrar resultados
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMEN DE IMPORTACIÓN');
    console.log('='.repeat(50));
    console.log(`✅ Importados: ${result.imported}`);
    console.log(`❌ Errores: ${result.errors}`);
    console.log(`📈 Total procesados: ${books.length}`);

    if (result.errorDetails.length > 0) {
      console.log('\n⚠️  Detalles de errores:');
      result.errorDetails.forEach(err => {
        console.log(`\n  Lote ${err.batch}:`);
        console.log(`  Error: ${err.error}`);
        console.log(`  Códigos: ${err.books.slice(0, 5).join(', ')}${err.books.length > 5 ? '...' : ''}`);
      });
    }

    if (result.imported > 0) {
      console.log('\n✅ Importación completada exitosamente');
      console.log('\n💡 Próximos pasos:');
      console.log('   1. Verifica los libros en el panel de administración');
      console.log('   2. Agrega imágenes de portada manualmente');
      console.log('   3. Ajusta stock y precios si es necesario');
      console.log('   4. Marca libros destacados o en oferta');
    }

  } catch (error) {
    console.error('\n❌ Error al procesar archivo:', error.message);
    process.exit(1);
  }
}

// Ejecutar script
main().catch(error => {
  console.error('\n❌ Error fatal:', error);
  process.exit(1);
});
