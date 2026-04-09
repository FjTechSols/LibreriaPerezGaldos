import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function generateLocalExport() {
  console.log('🚀 Iniciando generación local de AbeBooks (ESM)...');
  
  const EXPORT_PATH = path.join(__dirname, 'files', 'abebooks_local_export.txt');
  const LOG_PATH = path.join(__dirname, 'files', 'export_log.json');
  
  if (!fs.existsSync(path.join(__dirname, 'files'))) {
    fs.mkdirSync(path.join(__dirname, 'files'), { recursive: true });
  }

  const BATCH_SIZE = 1000;
  let from = 0;
  let hasMore = true;
  let totalProcessed = 0;
  let totalExported = 0;
  let totalSkippedWithoutLegacyId = 0;
  
  const separator = '\t';
  const q = (val) => `"${String(val || '').replace(/"/g, '""')}"`;
  const u = (val) => String(val || '');

  // Write stream - Using 'latin1' for AbeBooks compatibility
  const writeStream = fs.createWriteStream(EXPORT_PATH, { encoding: 'latin1' });
  
  const report = {
    startTime: new Date().toISOString(),
    minPrice: 12,
    samples: []
  };

  try {
    // If Purge mode is requested, we produce an empty file (except for potential header)
    if (process.env.PURGE_INVENTORY === 'true') {
        console.log('🧨 MODO DE PURGA DETECTADO: Generando archivo vacío.');
        writeStream.end();
        report.isPurge = true;
        fs.writeFileSync(LOG_PATH, JSON.stringify(report, null, 2));
        return;
    }

    while (hasMore) {
      const { data: books, error } = await supabase
        .from('libros')
        .select('id, legacy_id, titulo, autor, isbn, precio, stock, editoriales(nombre), descripcion, anio, paginas')
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
        
        // Conditions: Stock > 0 AND Price >= 12
        if (book.stock > 0 && Number(book.precio) >= 12) {
          if (!vendorBookId) {
            totalSkippedWithoutLegacyId++;
            continue;
          }
          const description = (book.descripcion || '').replace(/\s+/g, ' ').trim();
          const editorialName = book.editoriales?.nombre || '';

          const row = [
            q(vendorBookId),                   // 0: VendorBookID = legacy_id
            q(book.titulo || 'Untitled'),      // 1: Titulo
            q(description),                    // 2: Descripcion
            q("NO"),                           // 3: Columna fija historial
            q(editorialName),                  // 4: Editorial
            q(book.anio || ''),                // 5: Ano
            q(book.autor || 'Unknown'),        // 6: Autor
            q("Madrid"),                       // 7: Lugar
            q("España"),                       // 8: Pais
            u(Number(book.precio).toFixed(2)), // 9: Precio
            q(book.paginas || ""),             // 10: Paginas
            q(book.isbn || "")                 // 11: ISBN
          ];

          writeStream.write(row.join(separator) + '\r\n');
          totalExported++;

          // Targeted samples for user verification
          if (['02293682', '02293606', '00001377H'].includes(vendorBookId)) {
            report.samples.push({
                sku: vendorBookId,
                titulo: book.titulo,
                stock: book.stock,
                precio: book.precio,
                inExport: true
            });
          }
        } else {
            // Log rejection reason for samples if they exist in DB but failed conditions
            if (vendorBookId && ['02293682', '02293606', '00001377H'].includes(vendorBookId)) {
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
      }

      console.log(`... procesados ${totalProcessed} libros. Exportados: ${totalExported}`);
      
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

    console.log('\n✅ Generación completada.');
    console.log(`📊 Total libros en DB procesados: ${totalProcessed}`);
    console.log(`📦 Total libros exportados (Stock > 0 & Precio >= 12): ${totalExported}`);
    console.log(`⚠️ Omitidos por no tener legacy_id: ${totalSkippedWithoutLegacyId}`);
    console.log(`📁 Archivo: ${EXPORT_PATH}`);
    console.log(`📝 Log de muestras: ${LOG_PATH}`);

  } catch (err) {
    console.error('❌ Error fatal:', err);
    process.exit(1);
  }
}

generateLocalExport();
