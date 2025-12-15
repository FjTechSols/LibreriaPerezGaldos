
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

let envConfig = dotenv.config({ path: path.join(rootDir, '.env') });
if (envConfig.error) {
  envConfig = dotenv.config({ path: path.join(rootDir, '.env.development') });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findSampleDup() {
    console.log("🔍 Searching for ANY duplicate...");
    
    // Fetch all legacy_ids (pagination needed but let's try 10k sample)
    const { data: list, error } = await supabase
        .from('libros')
        .select('legacy_id')
        .range(0, 19999);
        
    if (error) { console.error(error); return; }
    
    const counts = {};
    for (const item of list) {
        if (!item.legacy_id) continue;
        const key = item.legacy_id.trim();
        counts[key] = (counts[key] || 0) + 1;
    }
    
    const dups = Object.entries(counts).filter(([id, count]) => count > 1);
    
    console.log(`Analyzed 20,000 records. Found ${dups.length} duplicate IDs.`);
    
    if (dups.length > 0) {
        console.log("Samples:");
        dups.slice(0, 5).forEach(([id, count]) => console.log(` - '${id}' has ${count} copies`));
    }
}

findSampleDup();
