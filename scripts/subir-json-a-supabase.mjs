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
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ Error: VITE_SUPABASE_URL no está configurada');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY no está configurada');
  console.error('\n⚠️  Este script requiere la SERVICE_ROLE_KEY para evitar restricciones de RLS');
  console.error('\n📖 Para obtener la SERVICE_ROLE_KEY:');
  console.error('   1. Ve a https://supabase.com/dashboard/project/weaihscsaqxadxjgsfbt/settings/api');
  console.error('   2. Busca "service_role" en la sección "Project API keys"');
  console.error('   3. Copia la key y agrégala al archivo .env.development:');
  console.error('      SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui');
  console.error('\n⚠️  IMPORTANTE: La SERVICE_ROLE_KEY es secreta, NUNCA la subas a git');
  process.exit(1);
}

// Usar SERVICE_ROLE_KEY para evitar restricciones de RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Transforma el formato JSON normalizado al formato de la tabla libros
 *
 * Estructura de la tabla libros en Supabase:
 * - id (SERIAL PRIMARY KEY)
 * - isbn (VARCHAR)
 * - titulo (VARCHAR) - NOT NULL
 * - autor (TEXT) - Campo temporal
 * - anio (SMALLINT)
 * - paginas (INT)
 * - descripcion (TEXT)
 * - notas (TEXT)
 * - categoria_id (INT) - Foreign key a categorias
 * - editorial_id (INT) - Foreign key a editoriales
 * - legacy_id (VARCHAR) - Código interno del libro
 * - precio (DECIMAL)
 * - ubicacion (VARCHAR)
 * - fecha_ingreso (DATE)
 * - activo (BOOLEAN)
 * - imagen_url (TEXT)
 * - stock (INT)
 */
function transformToDatabase(book) {
  // Generar un ISBN único si está vacío para evitar conflictos
  // Si el ISBN ya existe, lo dejamos vacío para que no haya conflicto con UNIQUE constraint
  const isbn = book.isbn && book.isbn.trim() !== '' ? book.isbn : null;

  return {
    // Campos principales
    isbn: isbn, // Puede ser null si está vacío
    titulo: book.title || book.titulo || 'Sin título',
    autor: book.author || book.autor || 'Desconocido',
    anio: book.year || book.año ? parseInt(book.year || book.año) : null,
    paginas: parseInt(book.pages || book.paginas || '0') || null,
    descripcion: book.description || book.descripcion || '',

    // Legacy ID es el código interno del libro
    legacy_id: book.code || '',

    // Precio y stock
    precio: parseFloat(book.price || book.precio || '0'),
    stock: parseInt(book.stock || '1'),

    // Ubicación
    ubicacion: book.ubicacion || 'almacen',

    // Imagen
    imagen_url: book.cover_image || book.imagen_url || '',

    // Estado
    activo: true,
    fecha_ingreso: new Date().toISOString().split('T')[0],

    // Campos que usaremos null por ahora (requieren búsqueda en otras tablas)
    categoria_id: null,
    editorial_id: null,
    notas: book.notas || ''
  };
}

/**
 * Sube libros a Supabase en lotes
 * NOTA: Sube TODOS los libros sin verificar duplicados
 */
async function uploadBooks(books, batchSize = 100) {
  console.log(`\n📦 Subiendo ${books.length} libros en lotes de ${batchSize}...\n`);
  console.log('⚠️  MODO: Subiendo TODOS los libros (se permiten duplicados)\n');

  let imported = 0;
  let errors = 0;
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
        console.error(`❌ Error en lote ${batchNum}: ${error.message}`);
        errors += batch.length;
        errorDetails.push({
          batch: batchNum,
          error: error.message,
          books: batch.slice(0, 3).map(b => b.legacy_id || b.titulo)
        });
      } else {
        imported += batch.length;
        console.log(`✅ Lote ${batchNum} importado exitosamente (${batch.length} libros)`);
      }
    } catch (err) {
      console.error(`❌ Error inesperado en lote ${batchNum}: ${err.message}`);
      errors += batch.length;
      errorDetails.push({
        batch: batchNum,
        error: err.message
      });
    }

    // Pausa entre lotes para no saturar Supabase
    if (i + batchSize < books.length) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  return { imported, errors, errorDetails };
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
      console.log(`\n${i + 1}. ${book.titulo}`);
      console.log(`   Código: ${book.legacy_id}`);
      console.log(`   Autor: ${book.autor}`);
      console.log(`   Precio: €${book.precio}`);
      console.log(`   Ubicación: ${book.ubicacion}`);
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
    console.log(`❌ Errores:      ${result.errors}`);
    console.log(`📈 Total:        ${books.length}`);

    const successRate = ((result.imported / books.length) * 100).toFixed(1);
    console.log(`📈 Tasa éxito:   ${successRate}%`);

    if (result.errorDetails.length > 0 && result.errorDetails.length <= 10) {
      console.log('\n⚠️  Detalles de errores:');
      result.errorDetails.forEach(err => {
        if (err.batch) {
          console.log(`   • Lote ${err.batch}: ${err.error}`);
          if (err.books && err.books.length > 0) {
            console.log(`     Primeros libros: ${err.books.join(', ')}`);
          }
        }
      });
    } else if (result.errorDetails.length > 10) {
      console.log(`\n⚠️  ${result.errorDetails.length} lotes con errores (demasiados para mostrar todos)`);
      console.log(`   Mostrando los primeros 5:`);
      result.errorDetails.slice(0, 5).forEach(err => {
        if (err.batch) {
          console.log(`   • Lote ${err.batch}: ${err.error.substring(0, 80)}...`);
        }
      });
    }

    if (result.imported > 0) {
      console.log('\n✅ Subida completada exitosamente');
      console.log(`\n📚 ${result.imported} libros importados a Supabase`);
      console.log('\n💡 Próximos pasos:');
      console.log('   1. Verifica los libros en el panel de administración');
      console.log('   2. Asigna categorías y editoriales correctas');
      console.log('   3. Agrega imágenes de portada si es necesario');
      console.log('   4. Revisa y ajusta precios/stock según corresponda');
    } else {
      console.log('\n❌ No se importó ningún libro');
      console.log('   Revisa los errores arriba para más detalles');
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
