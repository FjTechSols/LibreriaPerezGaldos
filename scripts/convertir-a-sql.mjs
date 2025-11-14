#!/usr/bin/env node

/**
 * Convierte el archivo libros.txt a SQL INSERT statements
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function escapeSQL(str) {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "''")
    .replace(/\n/g, ' ')
    .replace(/\r/g, '')
    .replace(/\t/g, ' ');
}

function determineCategory(title, description) {
  const text = `${title} ${description}`.toLowerCase();

  if (text.includes('infantil') || text.includes('niño') || text.includes('niña')) return 'Infantil';
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

function parseBookLine(line) {
  const fields = line.split('\t');

  const code = fields[0] || '';
  const title = fields[1] || 'Sin título';
  const description = fields[2] || '';
  const editorial = fields[4] || '';
  const yearStr = fields[5] || '';
  const author = fields[6] || 'Desconocido';
  const priceStr = fields[9] || '0';
  const pagesStr = fields[10] || '0';
  const ubicacion = fields[16] || 'almacen';

  let year = null;
  if (yearStr && yearStr !== '0' && !yearStr.includes('00-00')) {
    const yearNum = parseInt(yearStr);
    if (!isNaN(yearNum) && yearNum > 1000 && yearNum <= new Date().getFullYear()) {
      year = yearNum;
    }
  }

  const price = parseFloat(priceStr.replace(',', '.')) || 0;
  const pages = parseInt(pagesStr) || 0;
  const category = determineCategory(title, description);

  return {
    code: escapeSQL(code.trim()),
    title: escapeSQL(title.trim()),
    author: escapeSQL(author.trim()),
    editorial: escapeSQL(editorial.trim()),
    year,
    price,
    pages,
    description: escapeSQL(description.trim()),
    category: escapeSQL(category),
    ubicacion: escapeSQL(ubicacion.trim())
  };
}

function generateSQL(books, batchSize = 100) {
  let sql = `-- Importación de ${books.length} libros\n`;
  sql += `-- Generado: ${new Date().toISOString()}\n\n`;

  for (let i = 0; i < books.length; i += batchSize) {
    const batch = books.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;

    sql += `-- Lote ${batchNum} (${batch.length} libros)\n`;
    sql += `INSERT INTO libros (code, title, author, editorial, year, price, pages, description, category, ubicacion, stock, isbn, cover_image, rating, featured, is_new, on_sale)\nVALUES\n`;

    const values = batch.map(book => {
      const yearValue = book.year ? book.year : 'NULL';
      return `  ('${book.code}', '${book.title}', '${book.author}', '${book.editorial}', ${yearValue}, ${book.price}, ${book.pages}, '${book.description}', '${book.category}', '${book.ubicacion}', 1, '', '', 0, false, false, false)`;
    });

    sql += values.join(',\n');
    sql += '\nON CONFLICT (code) DO NOTHING;\n\n';
  }

  return sql;
}

async function main() {
  const filePath = process.argv[2] || path.join(__dirname, 'libros.txt');

  console.log('📚 Convirtiendo archivo a SQL...\n');
  console.log(`📄 Archivo: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Archivo no encontrado: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'latin1');
  const lines = content.split('\n').filter(line => line.trim());

  console.log(`📊 Total de líneas: ${lines.length}`);
  console.log('🔄 Parseando...\n');

  const books = [];
  let errors = 0;

  for (let i = 0; i < lines.length; i++) {
    try {
      const book = parseBookLine(lines[i]);
      if (book.title && book.title !== 'Sin título') {
        books.push(book);
      } else {
        errors++;
      }
    } catch (err) {
      errors++;
      console.error(`⚠️  Error en línea ${i + 1}: ${err.message}`);
    }
  }

  console.log(`✅ Parseados: ${books.length} libros`);
  console.log(`⚠️  Omitidos: ${errors} líneas\n`);

  const sql = generateSQL(books, 100);

  const outputPath = path.join(__dirname, 'importar-libros.sql');
  fs.writeFileSync(outputPath, sql, 'utf8');

  console.log(`✅ Archivo SQL generado: ${outputPath}`);
  console.log(`📊 Tamaño: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
  console.log(`\n📋 Próximos pasos:`);
  console.log(`1. Abre Supabase Dashboard`);
  console.log(`2. Ve a SQL Editor`);
  console.log(`3. Copia y pega el contenido de: importar-libros.sql`);
  console.log(`4. Click en "Run"`);
  console.log(`5. ¡Listo! 🎉`);
}

main().catch(console.error);
