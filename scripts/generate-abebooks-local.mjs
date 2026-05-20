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
const SYNC_MODE = process.env.ABEBOOKS_SYNC_MODE || (process.env.PURGE_INVENTORY === 'true' ? 'empty' : 'upload');
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
  const price = Number(book.precio);
  const safePrice = Number.isFinite(price) && price > 0 ? price : 1;
  const stock = Number(book.stock);
  const safeStock = Number.isFinite(stock) ? stock : 0;

  return [
    csvEscape(book.legacy_id),
    csvEscape(book.titulo || 'Untitled'),
    csvEscape(book.autor || ''),
    csvEscape(publisher),
    csvEscape(book.anio || ''),
    csvEscape(safePrice.toFixed(2)),
    csvEscape(safeStock),
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

  let minPrice = Number(process.env.ABEBOOKS_MIN_PRICE || 12);
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'integrations')
      .single();

    if (data?.value?.abeBooks?.ftps?.minPrice) {
      minPrice = Number(data.value.abeBooks.ftps.minPrice);
    }
  } catch (error) {
    console.warn('No se pudo leer minPrice desde settings. Usando valor por defecto.', error.message);
  }

  const report = {
    startTime: new Date().toISOString(),
    minPrice,
    syncMode: SYNC_MODE,
    isEmptyInventory: SYNC_MODE === 'empty',
    format: 'csv-semicolon-with-header',
    samples: []
  };

  try {
    writeStream.write(HEADERS.join(';') + '\n');

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

        if (SYNC_MODE === 'empty') {
          if (!vendorBookId) {
            totalSkippedWithoutLegacyId++;
            continue;
          }

          writeStream.write(buildCsvRow({ ...book, legacy_id: vendorBookId, stock: 0 }) + '\n');
          totalExported++;
        } else if (Number(book.stock) >= 1 && Number(book.precio) >= minPrice) {
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
            reason: Number(book.stock) < 1 ? 'No Stock' : `Price < ${minPrice}`
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
