
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
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicates() {
    console.log("Checking for duplicates...");
    // Since we can't do complex GROUP BY queries easily with client unless we use rpc,
    // we will fetch a sample of legacy_ids and count them.
    // Actually, asking for total vs distinct legacy_id is best but requires RPC.
    
    // Alternative: Fetch 1000 items and see if any have same legacy_id multiple times? 
    // Unlikely to find if random.
    
    // Best way: Use the previous deduplication script logic?
    // Let's use `rpc` if "get_duplicates" exists? No.
    
    // Let's try to verify if legacy_id is unique via schema inspection?
    // We can't inspecting schema.
    
    // Let's try to insert a DUPLICATE of a known ID and see if it fails.
    // If it succeeds, we know we have no constraint.
    
    const testId = "TEST_DUP_CHECK_99999";
    
    // 1. Insert first
    await supabase.from('libros').delete().eq('legacy_id', testId);
    await supabase.from('libros').insert({ legacy_id: testId, titulo: "Temp" });
    
    // 2. Insert second
    const { error } = await supabase.from('libros').insert({ legacy_id: testId, titulo: "Temp 2" });
    
    if (error) {
        console.log("Constraint CHECK: Success (Error detected on duplicate):", error.message);
    } else {
        console.log("Constraint CHECK: FAILED. Duplicates allowed.");
        // Clean up
        await supabase.from('libros').delete().eq('legacy_id', testId);
    }
}

checkDuplicates();
