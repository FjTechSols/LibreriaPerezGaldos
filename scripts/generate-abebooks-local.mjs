import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const EXPORT_PATH = path.join(__dirname, 'files', 'abebooks_local_export.csv');
const LOG_PATH = path.join(__dirname, 'files', 'export_log.json');
const SAMPLE_VENDOR_IDS = ['02293682', '02293606', '00001377H'];
const HEADERS = [
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

function csvEscape(value) {
  if (value === null || value === undefined) return '""';
  return `"${String(value).replace(/"/g, '""')}"`;
}

function buildCsvRow(book) {
  const description = (book.descripcion || '').replace(/\s+/g, ' ').trim();
  const publisher = book.editoriales?.nombre || '';

  return [
    csvEscape(book.legacy_id),
    csvEscape(book.titulo || 'Untitled'),
    csvEscape(book.autor || ''),
    csvEscape(publisher),
    csvEscape(book.anio || ''),
    csvEscape(Number(book.precio).toFixed(2)),
    csvEscape(book.stock || 0),
    csvEscape(description),
    csvEscape(book.isbn || ''),
    csvEscape(book.paginas || ''),
    csvEscape('Softcover'),
    csvEscape(book.estado || 'leido'),
    csvEscape(book.idioma || 'Español')
  ].join(';');
}

async function generateLocalExport() {
  console.log('Iniciando generacion local de AbeBooks CSV...');

  if (!fs.existsSync(path.join(__dirname, 'files'))) {
    fs.mkdirSync(path.join(__dirname, 'files'), { recursive: true });
  }

  const BATCH_SIZE = 1000;
  let from = 0;
  let hasMore = true;
  let totalProcessed = 0;
  let totalExported = 0;
  let totalSkippedWithoutLegacyId = 0;

  const writeStream = fs.createWriteStream(EXPORT_PATH, { encoding: 'utf8' });

  const report = {
    startTime: new Date().toISOString(),
    minPrice: 12,
    format: 'csv-semicolon-with-header',
    samples: []
  };

  try {
    writeStream.write(HEADERS.join(';') + '\n');

    if (process.env.PURGE_INVENTORY === 'true') {
      console.log('Modo purge detectado: generando CSV solo con cabecera.');
      writeStream.end();
      report.isPurge = true;
      fs.writeFileSync(LOG_PATH, JSON.stringify(report, null, 2));
      return;
    }

    while (hasMore) {
      const { data: books, error } = await supabase
        .from('libros')
        .select('id, legacy_id, titulo, autor, isbn, precio, stock, editoriales(nombre), descripcion, anio, paginas, estado, idioma')
        .order('id', { ascending: true })
        .range(from, from + BATCH_SIZE - 1);

      if (error) throw error;
      if (!books || books.length === 0) {
        hasMore = false;
        break;
      }

      for (const book of books) {
        totalProcessed++;
        const vendorBookId = String(book.legacy_id || '').trim();

        if (book.stock > 0 && Number(book.precio) >= 12) {
          if (!vendorBookId) {
            totalSkippedWithoutLegacyId++;
            continue;
          }

          writeStream.write(buildCsvRow({ ...book, legacy_id: vendorBookId }) + '\n');
          totalExported++;

          if (SAMPLE_VENDOR_IDS.includes(vendorBookId)) {
            report.samples.push({
              sku: vendorBookId,
              titulo: book.titulo,
              stock: book.stock,
              precio: book.precio,
              inExport: true
            });
          }
        } else if (vendorBookId && SAMPLE_VENDOR_IDS.includes(vendorBookId)) {
          report.samples.push({
            sku: vendorBookId,
            titulo: book.titulo,
            stock: book.stock,
            precio: book.precio,
            inExport: false,
            reason: book.stock <= 0 ? 'No Stock' : 'Price < 12'
          });
        }
      }

      console.log(`Procesados ${totalProcessed} libros. Exportados: ${totalExported}`);

      if (books.length < BATCH_SIZE) {
        hasMore = false;
      } else {
        from += BATCH_SIZE;
      }
    }

    writeStream.end();

    report.endTime = new Date().toISOString();
    report.totalProcessed = totalProcessed;
    report.totalExported = totalExported;
    report.totalSkippedWithoutLegacyId = totalSkippedWithoutLegacyId;
    fs.writeFileSync(LOG_PATH, JSON.stringify(report, null, 2));

    console.log('Generacion completada.');
    console.log(`Total libros procesados: ${totalProcessed}`);
    console.log(`Total libros exportados: ${totalExported}`);
    console.log(`Omitidos por no tener legacy_id: ${totalSkippedWithoutLegacyId}`);
    console.log(`Archivo: ${EXPORT_PATH}`);
    console.log(`Log: ${LOG_PATH}`);
  } catch (err) {
    console.error('Error fatal:', err);
    process.exit(1);
  }
}

generateLocalExport();
