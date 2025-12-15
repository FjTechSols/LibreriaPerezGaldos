
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
// KEY CRITICA: Usar la ANON KEY para simular el cliente
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; 

if (!supabaseKey) {
    console.error("❌ No VITE_SUPABASE_ANON_KEY found.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAnon() {
    console.log("🕵️ Checking access with ANON KEY...");
    
    const { count, error } = await supabase
        .from('libros')
        .select('*', { count: 'exact', head: true })
        .eq('activo', true);

    if (error) {
        console.error("❌ Error (Anon):", error.message);
        console.error("   Details:", error);
    } else {
        console.log(`✅ Success (Anon). Count: ${count}`);
    }
}

checkAnon();
