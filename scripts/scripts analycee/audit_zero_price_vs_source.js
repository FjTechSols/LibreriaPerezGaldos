
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno desde la raíz
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_ROL_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Variables de entorno Supabase no configuradas.');
    console.error('Intentado cargar desde:', path.join(__dirname, '../.env'));
    console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Definido' : 'No definido');
    console.error('VITE_SUPABASE_ROL_KEY:', supabaseServiceKey ? 'Definido' : 'No definido');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBooks() {
    console.log('Iniciando verificación cruzada de libros con precio 0...');
    
    // 1. Obtener libros con precio 0 de Supabase (incluyendo legacy_id)
    let allDbBooks = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('libros')
            .select('id, titulo, precio, legacy_id, stock')
            .eq('precio', 0)
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
            console.error('Error obteniendo libros de Supabase:', error);
            return;
        }

        if (data.length > 0) {
            allDbBooks = allDbBooks.concat(data);
            page++;
        } else {
            hasMore = false;
        }
    }

    console.log(`Encontrados ${allDbBooks.length} libros con precio 0 en la base de datos.`);

    // 2. Leer archivo fuente
    const sourceFilePath = path.join(__dirname, 'files', 'libros_todos_clean.txt');
    if (!fs.existsSync(sourceFilePath)) {
        console.error(`Error: No se encuentra el archivo fuente en ${sourceFilePath}`);
        return;
    }

    console.log('Leyendo archivo fuente (esto puede tardar unos segundos)...');
    
    // Mapa para búsqueda rápida: legacy_id -> { precio, titulo }
    const sourceMap = new Map();
    const fileStream = fs.createReadStream(sourceFilePath);
    
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let lineCount = 0;
    for await (const line of rl) {
        lineCount++;
        const parts = line.split('\t');
        if (parts.length >= 10) { // Asegurar que hay suficientes columnas
            const legacyId = parts[0].trim();
            // Columna 9 es el precio (índice 9 si empezamos en 0)
            const priceStr = parts[9].trim();
            const title = parts[1].trim();
            
            // Guardamos todo lo que parezca un legacy_id válido
            if (legacyId) {
                sourceMap.set(legacyId, { 
                    price: parseFloat(priceStr.replace(',', '.')), // Asegurar decimales con punto
                    title: title,
                    originalPriceStr: priceStr
                });
            }
        }
    }
    console.log(`Procesadas ${lineCount} líneas del archivo fuente.`);

    // 3. Comparar
    const report = {
        total_zero_price_books: allDbBooks.length,
        missing_legacy_id: [],
        not_found_in_source: [],
        price_mismatch: [], // Libros que tienen precio 0 en DB pero precio > 0 en fuente
        price_match_zero: [], // Libros que tienen precio 0 en DB y TAMBIÉN 0 en fuente (correcto pero extraño)
        other_errors: []
    };

    for (const book of allDbBooks) {
        if (!book.legacy_id) {
            report.missing_legacy_id.push(book);
            continue;
        }

        const sourceData = sourceMap.get(book.legacy_id);

        if (!sourceData) {
            report.not_found_in_source.push({
                ...book,
                note: 'Legacy ID no encontrado en archivo fuente'
            });
            continue;
        }

        // Comparar precios
        // Nota: book.precio es 0 (por la query). Comparamos con sourceData.price
        if (sourceData.price > 0) {
            report.price_mismatch.push({
                db_data: book,
                source_data: sourceData,
                note: `Precio en DB es 0, en archivo fuente es ${sourceData.price}`
            });
        } else {
            report.price_match_zero.push({
                db_data: book,
                source_data: sourceData,
                note: 'Precio es 0 en ambos origenes'
            });
        }
    }

    // 4. Guardar reporte
    const timestamp = new Date().toISOString().replace(/[:.T]/g, '-').slice(0, -1);
    const reportPath = path.join(__dirname, `../audit_zero_price_cross_reference_${timestamp}.json`);
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n=== RESUMEN DE LA AUDITORÍA ===');
    console.log(`Total libros con precio 0 en DB: ${report.total_zero_price_books}`);
    console.log(`- Sin Legacy ID: ${report.missing_legacy_id.length}`);
    console.log(`- No encontrados en fuente: ${report.not_found_in_source.length}`);
    console.log(`- Con precio > 0 en fuente (RECUPERABLES): ${report.price_mismatch.length}`);
    console.log(`- Con precio 0 en fuente (CORRECTOS/IRRECUPERABLES): ${report.price_match_zero.length}`);
    console.log(`\nReporte detallado guardado en: ${reportPath}`);
}

checkBooks();
