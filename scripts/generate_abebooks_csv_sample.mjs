import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function generateCSVSample() {
  console.log('🚀 Generando archivo CSV de muestra para AbeBooks...');
  
  const EXPORT_DIR = path.join(__dirname, 'files');
  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }
  
  const EXPORT_PATH = path.join(EXPORT_DIR, 'abebooks_sample_format.csv');
  const writeStream = fs.createWriteStream(EXPORT_PATH, { encoding: 'utf-8' });

  // Escape function for CSV
  const csvEscape = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""'); // Double quotes for escaping
    return `"${str}"`;
  };

  // Standard CSV Headers for AbeBooks
  const headers = [
    'VendorBookID',
    'Title',
    'Author',
    'Publisher',
    'PublicationYear',
    'Price',
    'Quantity',
    'Description',
    'ISBN',
    'Pages',
    'Binding',
    'Condition',
    'Language'
  ];
  
  writeStream.write(headers.join(';') + '\n');

  try {
    // Fetch 10 random active books
    const { data: books, error } = await supabase
      .from('libros')
      .select('id, legacy_id, titulo, autor, isbn, precio, stock, editoriales(nombre), descripcion, anio, paginas, estado, idioma')
      .gt('stock', 0)
      .gte('precio', 12)
      .limit(10);

    if (error) throw error;

    for (const book of books) {
      const sku = book.legacy_id || book.id;
      const description = (book.descripcion || '').replace(/\s+/g, ' ').trim();
      const editorialName = book.editoriales?.nombre || '';

      const row = [
        csvEscape(sku),
        csvEscape(book.titulo),
        csvEscape(book.autor),
        csvEscape(editorialName),
        csvEscape(book.anio),
        csvEscape(Number(book.precio).toFixed(2)),
        csvEscape(book.stock),
        csvEscape(description),
        csvEscape(book.isbn),
        csvEscape(book.paginas),
        csvEscape('Softcover'), // Default AbeBooks binding
        csvEscape(book.estado || 'Good'),
        csvEscape(book.idioma || 'Spanish')
      ];

      writeStream.write(row.join(';') + '\n');
    }

    writeStream.end();
    console.log('\n✅ Generación completada.');
    console.log(`📦 Se han exportado ${books.length} libros de muestra.`);
    console.log(`📁 El archivo está disponible en: ${EXPORT_PATH}`);

  } catch (err) {
    console.error('❌ Error fatal:', err);
    process.exit(1);
  }
}

generateCSVSample();
