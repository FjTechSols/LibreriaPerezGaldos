
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

// Log file setup
const logFile = path.join(rootDir, 'scripts', 'analysis', 'cleanup_editorials_log.txt');
function log(msg) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${msg}`;
    console.log(line);
    fs.appendFileSync(logFile, line + '\n');
}

// Env setup
let envConfig = dotenv.config({ path: path.join(rootDir, '.env') });
if (envConfig.error) {
  envConfig = dotenv.config({ path: path.join(rootDir, '.env.development') });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
   log("❌ Missing Supabase URL or Service Role Key");
   process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchAllEditorials() {
    let allEditorials = [];
    let from = 0;
    const batchSize = 1000;
    let fetching = true;

    log("📥 Fetching all editorials...");

    while (fetching) {
        const { data, error } = await supabase
            .from('editoriales')
            .select('id, nombre')
            .range(from, from + batchSize - 1)
            .order('id');

        if (error) {
            log(`❌ Error fetching editorials: ${error.message}`);
            return [];
        }

        if (data.length === 0) {
            fetching = false;
        } else {
            allEditorials = allEditorials.concat(data);
            from += batchSize;
            if (from % 10000 === 0) log(`...fetched ${from} records`);
        }
    }
    log(`✅ Total editorials fetched: ${allEditorials.length}`);
    return allEditorials;
}

async function cleanup() {
    log("🚀 Starting Editorial Cleanup Process");

    const editorials = await fetchAllEditorials();
    
    // Grouping
    const groups = new Map();
    editorials.forEach(ed => {
        const norm = ed.nombre.trim().toLowerCase();
        if (!groups.has(norm)) {
            groups.set(norm, []);
        }
        groups.get(norm).push(ed);
    });

    const duplicateGroups = Array.from(groups.values()).filter(g => g.length > 1);
    log(`📊 Found ${duplicateGroups.length} groups of duplicates.`);

    let processedGroups = 0;
    let updatedBooks = 0;
    let deletedEditorials = 0;
    let errorCount = 0;

    for (const group of duplicateGroups) {
        // Sort by ID, keep the first one (oldest/canonical)
        group.sort((a, b) => a.id - b.id);
        const keep = group[0];
        const remove = group.slice(1);
        const removeIds = remove.map(r => r.id);

        if (removeIds.length === 0) continue;

        try {
            log(`Processing '${keep.nombre}' (Keep ID: ${keep.id}). Merging ${removeIds.length} duplicates: ${removeIds.join(', ')}`);

            // 1. Update libros
            // We can't do "WHERE editorial_id IN (...)" easily with JS client update for multiple rows to ONE value?
            // Actually, simply: UPDATE libros SET editorial_id = keep.id WHERE editorial_id IN (removeIds)
            // Supabase JS doesn't support 'IN' in update filter directly in one generic call easily unless using RPC,
            // but we can assume we iterate or try to filter.
            // Using .in() filter in update:
            const { error: updateError, count } = await supabase
                .from('libros')
                .update({ editorial_id: keep.id })
                .in('editorial_id', removeIds); // This works! "Update where editorial_id is in removeIds"

            if (updateError) {
                log(`  ❌ Error updating libros for group '${keep.nombre}': ${updateError.message}`);
                errorCount++;
                continue; 
            }
            
            // NOTE: count might be null depending on header preference, but usually returns if allowed.
            // Assuming strict count might not be returned by default depending on setup.
            // log(`  - Books updated: ${count}`); 

            // 2. Delete old editorials
            const { error: deleteError } = await supabase
                .from('editoriales')
                .delete()
                .in('id', removeIds);

            if (deleteError) {
                 // Check if FK violation (e.g. other tables?)
                 log(`  ❌ Error deleting editorials ${removeIds.join(',')}: ${deleteError.message}`);
                 errorCount++;
            } else {
                 log(`  ✅ Successfully merged. Deleted ${removeIds.length} editorials.`);
                 processedGroups++;
                 deletedEditorials += removeIds.length;
            }

        } catch (e) {
            log(`  ❌ Exception processing group '${keep.nombre}': ${e.message}`);
            errorCount++;
        }
        
        // Small delay to prevent rate limits
        if (processedGroups % 50 === 0) await new Promise(r => setTimeout(r, 500));
    }

    log(`🏁 Cleanup Finished.`);
    log(`   - Groups Processed: ${processedGroups}`);
    log(`   - Editorials Deleted: ${deletedEditorials}`);
    log(`   - Errors encountered: ${errorCount}`);
}

cleanup();
