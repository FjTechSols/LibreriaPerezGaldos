#!/usr/bin/env node

/**
 * Script de Normalización de Libros
 * ----------------------------------
 * - Repara caracteres rotos (encoding ISO-8859-1/Latin1)
 * - Limpia campos inválidos
 * - Normaliza año, precio, páginas
 * - Asigna categoría automáticamente
 * - Genera archivo TXT limpio y normalizado
 *
 * Uso:
 *   node scripts/normalizar-libros.mjs ruta/al/archivo.txt
 *
 * Salida:
 *   - archivo-normalizado.txt (formato legible)
 *   - archivo-normalizado.json (formato JSON)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Repara encoding de caracteres especiales
 */
function fixEncoding(text = '') {
  if (!text) return '';

  // Mapa de caracteres comunes mal codificados
  const replacements = {
    'Ã¡': 'á', 'Ã©': 'é', 'Ã­': 'í', 'Ã³': 'ó', 'Ãº': 'ú',
    'Ã±': 'ñ', 'Ã': 'Ñ',
    'Ã': 'Á', 'Ã‰': 'É', 'Ã': 'Í', 'Ã"': 'Ó', 'Ãš': 'Ú',
    'Ã¼': 'ü', 'Ã¶': 'ö', 'Ã¤': 'ä',
    'Â°': '°', 'Âª': 'ª', 'Âº': 'º',
    'â€œ': '"', 'â€': '"', 'â€™': "'", 'â€˜': "'",
    'â€"': '—', 'â€"': '–',
    'Â¿': '¿', 'Â¡': '¡',
    'Ã§': 'ç', 'Ã€': 'À', 'Ã‡': 'Ç',
  };

  let fixed = text;
  for (const [bad, good] of Object.entries(replacements)) {
    fixed = fixed.replace(new RegExp(bad, 'g'), good);
  }

  // Eliminar caracteres de control no deseados
  fixed = fixed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return fixed.trim();
}

/**
 * Determina la categoría basándose en el título y descripción
 */
function determineCategory(title, description, code) {
  const text = `${title} ${description}`.toLowerCase();

  // Categoría por código interno
  if (code) {
    const prefix = code.charAt(0).toUpperCase();
    if (prefix === 'H') return 'Historia';
    if (prefix === 'N') return 'Novela';
    if (prefix === 'F') return 'Filosofía';
    if (prefix === 'G') return 'General';
  }

  // Categoría por contenido
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

  return 'General';
}

/**
 * Parsea y normaliza una línea del archivo TSV
 */
function parseAndNormalizeLine(line) {
  const fields = line.split('\t');

  // Extraer y limpiar campos
  const code = fixEncoding(fields[0] || '');
  const title = fixEncoding(fields[1] || 'Sin título');
  const description = fixEncoding(fields[2] || '');
  const editorial = fixEncoding(fields[4] || '');
  const yearStr = fields[5] || '';
  const author = fixEncoding(fields[6] || 'Desconocido');
  const priceStr = fields[9] || '0';
  const pagesStr = fields[10] || '0';
  const ubicacion = fixEncoding(fields[16] || 'almacen');

  // Normalizar año
  let year = '';
  if (yearStr && yearStr !== '0' && !yearStr.includes('00-00') && !yearStr.includes('-')) {
    const yearNum = parseInt(yearStr);
    if (!isNaN(yearNum) && yearNum >= 1000 && yearNum <= 2100) {
      year = yearNum.toString();
    }
  }

  // Normalizar precio
  let price = '0.00';
  const priceNum = parseFloat(priceStr.replace(',', '.'));
  if (!isNaN(priceNum) && priceNum > 0) {
    price = priceNum.toFixed(2);
  }

  // Normalizar páginas
  let pages = '0';
  const pagesNum = parseInt(pagesStr);
  if (!isNaN(pagesNum) && pagesNum > 0) {
    pages = pagesNum.toString();
  }

  // Determinar categoría
  const category = determineCategory(title, description, code);

  return {
    code: code.trim(),
    title: title.trim(),
    author: author.trim(),
    editorial: editorial.trim(),
    year,
    price,
    pages,
    description: description.trim(),
    category,
    ubicacion: ubicacion.trim(),
    stock: '1'
  };
}

/**
 * Genera archivo TXT normalizado legible
 */
function generateReadableTXT(books) {
  let output = '';
  output += '═'.repeat(80) + '\n';
  output += '  CATÁLOGO DE LIBROS NORMALIZADO\n';
  output += '  Total de libros: ' + books.length + '\n';
  output += '═'.repeat(80) + '\n\n';

  books.forEach((book, index) => {
    output += `───────────────────────────────────────────────────────────────────────────────\n`;
    output += `LIBRO #${index + 1}\n`;
    output += `───────────────────────────────────────────────────────────────────────────────\n`;
    output += `Código:      ${book.code}\n`;
    output += `Título:      ${book.title}\n`;
    output += `Autor:       ${book.author}\n`;
    output += `Editorial:   ${book.editorial}\n`;
    output += `Año:         ${book.year || 'N/A'}\n`;
    output += `Precio:      €${book.price}\n`;
    output += `Páginas:     ${book.pages}\n`;
    output += `Categoría:   ${book.category}\n`;
    output += `Ubicación:   ${book.ubicacion}\n`;
    output += `Stock:       ${book.stock}\n`;
    output += `Descripción: ${book.description}\n`;
    output += '\n';
  });

  return output;
}

/**
 * Genera archivo TSV normalizado (formato importable)
 */
function generateTSV(books) {
  const header = [
    'codigo',
    'titulo',
    'autor',
    'editorial',
    'año',
    'precio',
    'paginas',
    'descripcion',
    'categoria',
    'ubicacion',
    'stock'
  ].join('\t');

  const rows = books.map(book => {
    return [
      book.code,
      book.title,
      book.author,
      book.editorial,
      book.year,
      book.price,
      book.pages,
      book.description,
      book.category,
      book.ubicacion,
      book.stock
    ].join('\t');
  });

  return header + '\n' + rows.join('\n');
}

/**
 * Genera estadísticas del catálogo
 */
function generateStats(books) {
  const stats = {
    total: books.length,
    porCategoria: {},
    porPrefijoCodigo: {},
    conAño: books.filter(b => b.year).length,
    conPrecio: books.filter(b => parseFloat(b.price) > 0).length,
    conPaginas: books.filter(b => parseInt(b.pages) > 0).length,
  };

  // Contar por categoría
  books.forEach(book => {
    stats.porCategoria[book.category] = (stats.porCategoria[book.category] || 0) + 1;
  });

  // Contar por prefijo de código
  books.forEach(book => {
    if (book.code) {
      const prefix = book.code.charAt(0).toUpperCase();
      stats.porPrefijoCodigo[prefix] = (stats.porPrefijoCodigo[prefix] || 0) + 1;
    }
  });

  let output = '';
  output += '═'.repeat(60) + '\n';
  output += '  ESTADÍSTICAS DEL CATÁLOGO\n';
  output += '═'.repeat(60) + '\n\n';
  output += `📚 Total de libros: ${stats.total}\n\n`;

  output += '📊 Por categoría:\n';
  Object.entries(stats.porCategoria)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      output += `   ${cat.padEnd(20)} ${count.toString().padStart(4)} libros\n`;
    });

  output += '\n🔤 Por prefijo de código:\n';
  Object.entries(stats.porPrefijoCodigo)
    .sort((a, b) => b[1] - a[1])
    .forEach(([prefix, count]) => {
      output += `   ${prefix.padEnd(20)} ${count.toString().padStart(4)} libros\n`;
    });

  output += '\n📈 Completitud de datos:\n';
  output += `   Con año:         ${stats.conAño} (${((stats.conAño / stats.total) * 100).toFixed(1)}%)\n`;
  output += `   Con precio:      ${stats.conPrecio} (${((stats.conPrecio / stats.total) * 100).toFixed(1)}%)\n`;
  output += `   Con páginas:     ${stats.conPaginas} (${((stats.conPaginas / stats.total) * 100).toFixed(1)}%)\n`;

  return output;
}

/**
 * Función principal
 */
async function main() {
  console.log('📚 Script de Normalización de Libros\n');
  console.log('═'.repeat(50));

  // Obtener ruta del archivo desde argumentos
  const filePath = process.argv[2];

  if (!filePath) {
    console.error('\n❌ Error: No se especificó archivo');
    console.log('\n📖 Uso:');
    console.log('   node scripts/normalizar-libros.mjs ruta/al/archivo.txt');
    console.log('\n📝 Ejemplo:');
    console.log('   node scripts/normalizar-libros.mjs ./libros.txt');
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
  const inputFileName = path.basename(filePath, path.extname(filePath));
  const outputDir = path.dirname(filePath);

  console.log(`\n📄 Archivo entrada: ${path.basename(filePath)}`);
  console.log(`📊 Tamaño: ${fileSizeKB} KB`);

  try {
    // Leer archivo
    console.log('\n🔍 Leyendo archivo...');
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    console.log(`✅ ${lines.length} líneas encontradas`);

    // Parsear y normalizar
    console.log('\n🔄 Normalizando datos...');
    const books = [];
    const errors = [];

    lines.forEach((line, i) => {
      try {
        const book = parseAndNormalizeLine(line);
        if (book.title && book.title !== 'Sin título') {
          books.push(book);
        } else {
          errors.push({ line: i + 1, reason: 'Sin título válido' });
        }
      } catch (err) {
        errors.push({ line: i + 1, reason: err.message });
      }
    });

    console.log(`✅ ${books.length} libros normalizados correctamente`);
    if (errors.length > 0) {
      console.log(`⚠️  ${errors.length} líneas omitidas por errores`);
    }

    // Generar archivos de salida
    console.log('\n📝 Generando archivos...');

    // 1. Archivo legible
    const readableOutput = generateReadableTXT(books);
    const readableFile = path.join(outputDir, `${inputFileName}-normalizado.txt`);
    fs.writeFileSync(readableFile, readableOutput, 'utf-8');
    console.log(`✅ Generado: ${path.basename(readableFile)}`);

    // 2. Archivo TSV (importable)
    const tsvOutput = generateTSV(books);
    const tsvFile = path.join(outputDir, `${inputFileName}-normalizado.tsv`);
    fs.writeFileSync(tsvFile, tsvOutput, 'utf-8');
    console.log(`✅ Generado: ${path.basename(tsvFile)}`);

    // 3. Archivo JSON
    const jsonFile = path.join(outputDir, `${inputFileName}-normalizado.json`);
    fs.writeFileSync(jsonFile, JSON.stringify(books, null, 2), 'utf-8');
    console.log(`✅ Generado: ${path.basename(jsonFile)}`);

    // 4. Estadísticas
    const statsOutput = generateStats(books);
    const statsFile = path.join(outputDir, `${inputFileName}-estadisticas.txt`);
    fs.writeFileSync(statsFile, statsOutput, 'utf-8');
    console.log(`✅ Generado: ${path.basename(statsFile)}`);

    // Mostrar estadísticas en consola
    console.log('\n' + statsOutput);

    // Mostrar muestra
    console.log('═'.repeat(60));
    console.log('📋 MUESTRA DE LOS PRIMEROS 3 LIBROS');
    console.log('═'.repeat(60));
    books.slice(0, 3).forEach((book, i) => {
      console.log(`\n${i + 1}. ${book.title}`);
      console.log(`   Código: ${book.code}`);
      console.log(`   Autor: ${book.author}`);
      console.log(`   Año: ${book.year || 'N/A'}`);
      console.log(`   Precio: €${book.price}`);
      console.log(`   Categoría: ${book.category}`);
    });

    console.log('\n' + '═'.repeat(60));
    console.log('✅ NORMALIZACIÓN COMPLETADA');
    console.log('═'.repeat(60));
    console.log(`\n📂 Archivos generados en: ${outputDir}`);
    console.log(`   • ${path.basename(readableFile)} - Formato legible`);
    console.log(`   • ${path.basename(tsvFile)} - Formato TSV importable`);
    console.log(`   • ${path.basename(jsonFile)} - Formato JSON`);
    console.log(`   • ${path.basename(statsFile)} - Estadísticas`);

    if (errors.length > 0) {
      console.log(`\n⚠️  Se omitieron ${errors.length} líneas con errores`);
    }

    console.log('\n💡 Próximos pasos:');
    console.log('   1. Revisa el archivo -normalizado.txt para verificar');
    console.log('   2. Usa el archivo -normalizado.tsv para importar');
    console.log('   3. Consulta -estadisticas.txt para análisis');

  } catch (error) {
    console.error('\n❌ Error al procesar archivo:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Ejecutar script
main().catch(error => {
  console.error('\n❌ Error fatal:', error);
  process.exit(1);
});
