
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

async function processFile(filePath, sourceMap) {
    if (!fs.existsSync(filePath)) {
        console.error(`Error: No se encuentra el archivo fuente en ${filePath}`);
        return false;
    }

    console.log(`Leyendo archivo fuente: ${path.basename(filePath)}...`);
    const fileStream = fs.createReadStream(filePath);
    
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let lineCount = 0;
    for await (const line of rl) {
        lineCount++;
        const parts = line.split('\t');
        if (parts.length >= 10) { 
            const legacyId = parts[0].trim();
            const priceStr = parts[9].trim();
            const title = parts[1].trim();
            
            // Si ya existe, NO sobrescribimos (prioridad al primer archivo procesado o mantener el primero encontrado)
            // O podemos sobrescribir si el precio es > 0 y el anterior era 0.
            // Para simplicidad, guardamos todos y si hay duplicados, el ultimo gana (o manejamos logica especifica).
            // Vamos a dejar que el ultimo gane por ahora, o verificar si el legacyId ya esta.
            
            if (legacyId) {
                // Chequeo simple de precio valido
                const price = parseFloat(priceStr.replace(',', '.'));
                
                if (!sourceMap.has(legacyId) || (sourceMap.get(legacyId).price === 0 && price > 0)) {
                     sourceMap.set(legacyId, { 
                        price: price,
                        title: title,
                        originalPriceStr: priceStr,
                        sourceFile: path.basename(filePath)
                    });
                }
            }
        }
    }
    console.log(`Procesadas ${lineCount} líneas de ${path.basename(filePath)}.`);
    return true;
}

async function checkBooks() {
    console.log('Iniciando verificación cruzada de libros con precio 0 (V3 - Multiples archivos)...');
    
    // 1. Obtener libros con precio 0 de Supabase
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

    // 2. Leer archivos fuente
    const sourceMap = new Map();
    const filesToCheck = [
        path.join(__dirname, 'files', 'libros.txt'),
        path.join(__dirname, 'files', 'libros1.txt')
    ];

    for (const file of filesToCheck) {
        await processFile(file, sourceMap);
    }

    // 3. Comparar
    const report = {
        scan_type: 'V3 - libros.txt + libros1.txt',
        total_zero_price_books: allDbBooks.length,
        missing_legacy_id: [],
        not_found_in_source: [],
        price_mismatch: [], // Recuperables
        price_match_zero: [], // Irrecuperables
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
                note: 'Legacy ID no encontrado en ninguno de los archivos fuente'
            });
            continue;
        }

        if (sourceData.price > 0) {
            report.price_mismatch.push({
                db_data: book,
                source_data: sourceData,
                note: `RECUPERABLE: Precio encontrado en ${sourceData.sourceFile}`
            });
        } else {
            report.price_match_zero.push({
                db_data: book,
                source_data: sourceData,
                note: `Precio es 0 en ${sourceData.sourceFile}`
            });
        }
    }

    // 4. Guardar reporte
    const timestamp = new Date().toISOString().replace(/[:.T]/g, '-').slice(0, -1);
    const reportPath = path.join(__dirname, `../audit_zero_price_cross_reference_v3_${timestamp}.json`);
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n=== RESUMEN DE LA AUDITORÍA V3 ===');
    console.log(`Archivos escaneados: libros.txt, libros1.txt`);
    console.log(`Total libros con precio 0 en DB: ${report.total_zero_price_books}`);
    console.log(`- Sin Legacy ID: ${report.missing_legacy_id.length}`);
    console.log(`- No encontrados: ${report.not_found_in_source.length}`);
    console.log(`- RECUPERABLES (Precio > 0): ${report.price_mismatch.length}`);
    console.log(`- Irrecuperables (Precio 0): ${report.price_match_zero.length}`);
    console.log(`\nReporte detallado guardado en: ${reportPath}`);
}

checkBooks();
