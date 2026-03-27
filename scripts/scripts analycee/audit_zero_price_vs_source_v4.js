
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
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBooks() {
    console.log('Iniciando verificación cruzada de libros con precio 0 (V4 - PerezGaldosConectia.txt)...');
    
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

    // 2. Leer archivo fuente
    const sourceFilePath = path.join(__dirname, 'files', 'PerezGaldosConectia.txt');
    if (!fs.existsSync(sourceFilePath)) {
        console.error(`Error: No se encuentra el archivo fuente en ${sourceFilePath}`);
        return;
    }

    console.log(`Leyendo archivo fuente: ${sourceFilePath}`);
    console.log('Esto puede tardar unos segundos...');
    
    // Mapa para búsqueda rápida: legacy_id -> { precio, titulo }
    const sourceMap = new Map();
    const fileStream = fs.createReadStream(sourceFilePath, { encoding: 'latin1' }); // Use latin1 for this file
    
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let lineCount = 0;
    for await (const line of rl) {
        lineCount++;
        // Separador es #
        const parts = line.split('#');
        if (parts.length >= 10) { 
            // Index 0: Legacy ID (Quoted)
            // Index 9: Price (Seems unquoted in sample, but let's be safe)
            
            let legacyId = parts[0].trim().replace(/^"|"$/g, '');
            let priceStr = parts[9].trim().replace(/^"|"$/g, '');
            
            // Titulo es index 1
            let title = parts[1].trim().replace(/^"|"$/g, '');
            
            if (legacyId) {
                const price = parseFloat(priceStr.replace(',', '.'));
                sourceMap.set(legacyId, { 
                    price: price, // Podria ser NaN si vacio
                    title: title,
                    originalPriceStr: priceStr
                });
            }
        }
    }
    console.log(`Procesadas ${lineCount} líneas del archivo fuente.`);

    // 3. Comparar
    const report = {
        source_file: 'PerezGaldosConectia.txt',
        total_zero_price_books: allDbBooks.length,
        missing_legacy_id: [],
        not_found_in_source: [],
        price_mismatch: [], // Libros que tienen precio 0 en DB pero precio > 0 en fuente
        price_match_zero: [], // Libros que tienen precio 0 en DB y TAMBIÉN 0 en fuente
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
        const sourcePrice = isNaN(sourceData.price) ? 0 : sourceData.price;
        
        if (sourcePrice > 0) {
            report.price_mismatch.push({
                db_data: book,
                source_data: sourceData,
                note: `RECUPERABLE: Precio en DB es 0, en archivo fuente es ${sourcePrice}`
            });
        } else {
            report.price_match_zero.push({
                db_data: book,
                source_data: sourceData,
                note: 'Precio es 0 o inválido en ambos origenes'
            });
        }
    }

    // 4. Guardar reporte
    const timestamp = new Date().toISOString().replace(/[:.T]/g, '-').slice(0, -1);
    const reportPath = path.join(__dirname, `../audit_zero_price_cross_reference_v4_${timestamp}.json`);
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n=== RESUMEN DE LA AUDITORÍA V4 ===');
    console.log(`Archivo fuente: PerezGaldosConectia.txt`);
    console.log(`Total libros con precio 0 en DB: ${report.total_zero_price_books}`);
    console.log(`- Sin Legacy ID: ${report.missing_legacy_id.length}`);
    console.log(`- No encontrados en fuente: ${report.not_found_in_source.length}`);
    console.log(`- Con precio > 0 en fuente (RECUPERABLES): ${report.price_mismatch.length}`);
    console.log(`- Con precio 0 en fuente (CORRECTOS/IRRECUPERABLES): ${report.price_match_zero.length}`);
    console.log(`\nReporte detallado guardado en: ${reportPath}`);
}

checkBooks();
