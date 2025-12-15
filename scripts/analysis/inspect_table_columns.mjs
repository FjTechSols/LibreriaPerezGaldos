
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

async function check() {
    const tableName = process.argv[2] || 'invoices';
    console.log(`🔍 Inspecting '${tableName}' table...`);
    
    // We can't see schema directly easily, but we can select one row and see keys
    const { data, error } = await supabase.from(tableName).select('*').limit(1);
    
    if (error) {
        console.error("Error selecting from invoices:", error.message);
        return;
    }
    
    if (data && data.length > 0) {
        console.log("Columns found via data sample:", Object.keys(data[0]));
        if ('language' in data[0]) {
            console.log("✅ 'language' column EXISTS.");
        } else {
            console.log("❌ 'language' column MISSING in sample.");
        }
    } else {
        console.log("Table empty, trying insert test for 'language' column...");
        // If empty, we can't see keys. We try to insert a dummy with 'language'.
        // This is risky if strict validation. Use a transaction or immediate delete? 
        // Supabase JS doesn't do transactions easily.
        // Let's assume missing if empty?
        console.log("Table is empty. Cannot verify columns via select.");
    }
}

check();
