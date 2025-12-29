
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env.production') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes('--dry-run');
const INPUT_FILE = path.join(__dirname, 'scripts/files/libros_compilado_final.jsonl');

async function main() {
    console.log(`--- Relational Sync V2 ---`);
    console.log(`Input: ${INPUT_FILE}`);
    console.log(`Mode: ${DRY_RUN ? 'DRY-RUN' : 'LIVE'}`);

    // Steps
    // 1. Extract Metadata (Categories, Editorials) from file
    // 2. Sync Metadata to DB -> Get ID Maps
    // 3. Sync Books using IDs

    // --- Step 1: Extraction ---
    console.log('\n[1/3] Extracting Metadata from file...');
    const categories = new Set();
    const editorials = new Set();

    const fileStream = fs.createReadStream(INPUT_FILE);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
        if (!line.trim()) continue;
        try {
            const b = JSON.parse(line);
            if (b.ubicacion) categories.add(b.ubicacion.trim());
            if (b.editorial) editorials.add(b.editorial.trim());
        } catch {}
    }
    console.log(`Found ${categories.size} unique categories.`);
    console.log(`Found ${editorials.size} unique editorials.`);

    // --- Step 2: Metadata Sync & Mapping ---
    console.log('\n[2/3] Syncing Metadata to DB...');
    
    // 2a. Categories
    const categoryMap = await syncMetadata('categorias', 'nombre', Array.from(categories));
    
    // 2b. Editorials (Batch insert due to size)
    const editorialMap = await syncMetadata('editoriales', 'nombre', Array.from(editorials), 1000);

    // --- Step 3: Books Sync ---
    console.log('\n[3/3] Syncing Books...');
    
    // Reset reader for second pass
    const fileStream2 = fs.createReadStream(INPUT_FILE);
    const rl2 = readline.createInterface({ input: fileStream2, crlfDelay: Infinity });

    let batch = [];
    const BATCH_SIZE = 100;
    let stats = { processed: 0, inserts: 0, updates: 0, errors: 0 };

    for await (const line of rl2) {
        if (!line.trim()) continue;
        const raw = JSON.parse(line);
        if (!raw.legacy_id) continue;

        // Map Relations
        // JSON has 'ubicacion' which is actually the category name
        const catId = categoryMap.get(raw.ubicacion?.trim());
        const edId = editorialMap.get(raw.editorial?.trim());

        const bookPayload = {
            legacy_id: raw.legacy_id,
            titulo: raw.titulo?.substring(0, 255) || 'Sin título',
            descripcion: raw.descripcion || '',
            autor: raw.autor?.substring(0, 100) || 'Desconocido', // String column exists
            editorial_id: edId || null, // Relational ID
            categoria_id: catId || null, // Relational ID
            anio: extractYear(raw.anio),
            precio: isNaN(parseFloat(raw.precio)) ? 0 : parseFloat(raw.precio),
            stock: raw.stock || 0,
            ubicacion: raw.ubicacion || 'General',
            isbn: raw.isbn,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        batch.push(bookPayload);

        if (batch.length >= BATCH_SIZE) {
            await processBookBatch(batch, stats);
            batch = [];
            process.stdout.write(`\rProcessed: ${stats.processed} | Ins: ${stats.inserts} | Upd: ${stats.updates} | Err: ${stats.errors}`);

        }
    }
    
    if (batch.length > 0) await processBookBatch(batch, stats);

    console.log('\nDone.');
}

// Helpers
async function syncMetadata(table, nameField, items, batchSize = 1000) {
    if (items.length === 0) return new Map();
    
    // 1. Fetch existing
    // For massive tables like Editorials, fetching ALL might be heavy but 60k is okay (~5MB).
    // Better: Fetch all ID, Name to build map.
    
    console.log(`Fetching existing ${table}...`);
    let existingMap = new Map();
    
    // Recursive fetch or all at once? Supabase allows large limits? 
    // Standard limit is 1000. Need paging.
    
    let page = 0;
    const PAGE_SIZE = 1000;
    while (true) {
        const { data, error } = await supabase.from(table).select(`id, ${nameField}`).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        if (error) { console.error(error); break; }
        if (!data || data.length === 0) break;
        
        data.forEach(r => existingMap.set(r[nameField].toLowerCase(), r.id)); // Normalize key
        page++;
    }
    console.log(`Loaded ${existingMap.size} existing records from ${table}.`);

    if (DRY_RUN) return existingMap;

    // 2. Identify new
    const newItems = items.filter(i => !existingMap.has(i.toLowerCase()));
    console.log(`New ${table} to insert: ${newItems.length}`);

    // 3. Batch Insert
    for (let i = 0; i < newItems.length; i += batchSize) {
        const chunk = newItems.slice(i, i + batchSize).map(name => ({ [nameField]: name }));
        const { data, error } = await supabase.from(table).insert(chunk).select();
        if (error) {
            console.error(`Error inserting ${table}:`, error);
        } else if (data) {
             data.forEach(r => existingMap.set(r[nameField].toLowerCase(), r.id));
        }
    }
    
    return existingMap;
}

async function processBookBatch(batch, stats) {
    if (batch.length === 0) return;
    stats.processed += batch.length;

    if (DRY_RUN) return;

    const legacyIds = batch.map(b => b.legacy_id);
    
    // Update logic: Check existence
    // We must fetch ALL required columns to satisfy UPSERT (Insert) constraints
    const { data: existing, error } = await supabase
        .from('libros')
        .select('id, legacy_id, stock, titulo, precio, ubicacion, anio, editorial_id, categoria_id, autor, isbn') // Fetch everything needed to satisfy Not Null
        .in('legacy_id', legacyIds);
    if (error) { console.error(error); return; }

    const existingMap = new Map();
    existing?.forEach(r => existingMap.set(r.legacy_id, r));

    const toInsert = [];
    const toUpdate = [];

    for (const book of batch) {
        const exist = existingMap.get(book.legacy_id);
        if (exist) {
            // Check if stock changed
            if (exist.stock !== book.stock) {
                // To pass UPSERT validation, we must provide all NOT NULL fields.
                // We use the EXISTING values to verify we don't change them (No-op),
                // while updating stock to the NEW value.
                toUpdate.push({
                    id: exist.id,
                    legacy_id: exist.legacy_id, // Required for conflict if not using id?
                    titulo: exist.titulo,
                    precio: exist.precio,
                    ubicacion: exist.ubicacion,
                    anio: exist.anio,
                    editorial_id: exist.editorial_id,
                    categoria_id: exist.categoria_id,
                    autor: exist.autor,
                    isbn: exist.isbn,
                    stock: book.stock, // NEW STOCK
                    updated_at: new Date().toISOString()
                });
                stats.updates++;
            }
        } else {
            toInsert.push(book);
            stats.inserts++; // Optimistic count
        }
    }

    if (toInsert.length > 0) {
        const { error: insertError } = await supabase.from('libros').insert(toInsert);
        if (insertError) {
             console.error('\nBatch Insert Failed:', insertError.message);
             stats.inserts -= toInsert.length;
             stats.errors += toInsert.length; 
        }
    }

    if (toUpdate.length > 0) {
        const { error: updateError } = await supabase.from('libros').upsert(toUpdate);
        if (updateError) {
             console.error('\nBatch Update Failed:', updateError.message);
             stats.updates -= toUpdate.length;
             stats.errors += toUpdate.length;
        }
    }
}

function extractYear(raw) {
    if (!raw) return null;
    const str = String(raw).trim();
    if (!str) return null;
    
    // Check if it's a pure number
    if (/^\d{4}$/.test(str)) return parseInt(str);
    
    // Maybe "1985." -> 1985
    const match = str.match(/^(\d{4})/);
    if (match) return parseInt(match[1]);
    
    return null;
}

main().catch(console.error);
