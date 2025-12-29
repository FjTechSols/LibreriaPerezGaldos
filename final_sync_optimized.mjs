
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
// IMPORTANT: Use Service Role Key if available for writes, otherwise Anon (might fail if RLS blocks)
// User environment usually has VITE_ vars.

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
});

const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes('--dry-run');
const FILE_ARG_IDX = ARGS.indexOf('--file');
const INPUT_FILE = FILE_ARG_IDX !== -1 ? ARGS[FILE_ARG_IDX + 1] : path.join(__dirname, 'scripts/files/libros_compilado_final.jsonl');

const BATCH_SIZE = 500; // Conservative batch size

async function main() {
    console.log(`--- Legacy Book Sync (Optimized) ---`);
    console.log(`Target: ${SUPABASE_URL}`);
    console.log(`Input: ${INPUT_FILE}`);
    console.log(`Mode: ${DRY_RUN ? 'DRY-RUN (No IO)' : 'LIVE WRITES'}`);

    if (!fs.existsSync(INPUT_FILE)) {
        console.error(`Input file not found.`);
        process.exit(1);
    }

    const fileStream = fs.createReadStream(INPUT_FILE);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let headerStats = {
        processed: 0,
        toInsert: 0,
        toUpdateStock: 0,
        unchanged: 0,
        errors: 0
    };

    let batch = [];

    console.time('Sync Duration');

    for await (const line of rl) {
        if (!line.trim()) continue;
        try {
            const book = JSON.parse(line);
            if (book.legacy_id) {
                batch.push(book);
            }
        } catch (e) {
            console.error('JSON Parse error:', e.message);
            headerStats.errors++;
        }

        if (batch.length >= BATCH_SIZE) {
            await processBatch(batch, headerStats);
            batch = [];
            
            // Console progress
            process.stdout.write(`\rProcessed: ${headerStats.processed} | Inserts: ${headerStats.toInsert} | Updates: ${headerStats.toUpdateStock}`);
        }
    }

    // Final batch
    if (batch.length > 0) {
        await processBatch(batch, headerStats);
    }

    console.log('\n\n--- Final Report ---');
    console.log(`Total Processed: ${headerStats.processed}`);
    console.log(`New Records (Inserted): ${headerStats.toInsert}`);
    console.log(`Existing (Stock Updated): ${headerStats.toUpdateStock}`);
    console.log(`Existing (Stock Matches - Skipped): ${headerStats.unchanged}`);
    console.timeEnd('Sync Duration');
}

async function processBatch(batch, stats) {
    // 1. Extract IDs
    const legacyIds = batch.map(b => b.legacy_id);

    // 2. Fetch existing from DB
    // We only need id, legacy_id, and stock to make decisions
    const { data: existingRecords, error } = await supabase
        .from('libros')
        .select('id, legacy_id, stock')
        .in('legacy_id', legacyIds);

    if (error) {
        console.error('\nError fetching existing records:', error);
        stats.errors += batch.length;
        return;
    }

    // Map for fast lookup: legacy_id -> record
    const existingMap = new Map();
    existingRecords?.forEach(r => existingMap.set(r.legacy_id, r));

    const inserts = [];
    const updates = [];

    for (const book of batch) {
        stats.processed++;
        const existing = existingMap.get(book.legacy_id);

        if (existing) {
            // EXISTS: Check stock
            // Only update if stock is different
            if (existing.stock !== book.stock) {
                 updates.push({
                     id: existing.id, // Update by Primary Key
                     stock: book.stock,
                     updated_at: new Date().toISOString()
                 });
                 stats.toUpdateStock++;
            } else {
                 stats.unchanged++;
            }
        } else {
            // NEW: Insert full record
            inserts.push({
                legacy_id: book.legacy_id,
                titulo: book.titulo?.substring(0, 255) || 'Sin título',
                descripcion: book.descripcion || '',
                editorial: book.editorial?.substring(0, 100),
                f_publicacion: book.anio, 
                autor: book.autor?.substring(0, 100) || 'Desconocido',
                precio: book.precio || 0,
                stock: book.stock || 0,
                ubicacion: book.ubicacion || 'General',
                isbn: book.isbn,
                // Add any other required default fields
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
            stats.toInsert++;
        }
    }

    if (!DRY_RUN) {
        // Execute Inserts
        if (inserts.length > 0) {
            const { error: insertError } = await supabase.from('libros').insert(inserts);
            if (insertError) console.error('\nInsert Error:', insertError);
        }

        // Execute Updates (using upsert by id works fine for updates)
        if (updates.length > 0) {
            // Note: Upsert needs to know it's an update. Providing 'id' usually sufficient.
            const { error: updateError } = await supabase.from('libros').upsert(updates);
            if (updateError) console.error('\nUpdate Error:', updateError);
        }
    }
}

main().catch(console.error);
