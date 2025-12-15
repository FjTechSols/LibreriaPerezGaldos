
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
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use admin to see truth
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkActiveStatus() {
    console.log("🔍 Checking 'activo' status...");
    
    // Count Total
    const { count: total } = await supabase.from('libros').select('*', { count: 'exact', head: true });
    
    // Count Active
    const { count: active } = await supabase.from('libros').select('*', { count: 'exact', head: true }).eq('activo', true);
    
    // Count Inactive
    const { count: inactive } = await supabase.from('libros').select('*', { count: 'exact', head: true }).eq('activo', false);

    // Count Null
    const { count: nullStatus } = await supabase.from('libros').select('*', { count: 'exact', head: true }).is('activo', null);

    console.log(`Total: ${total}`);
    console.log(`Active (true): ${active}`);
    console.log(`Inactive (false): ${inactive}`);
    console.log(`Null: ${nullStatus}`);
    
    // Sample
    const { data } = await supabase.from('libros').select('id, titulo, activo').limit(5);
    console.log("Sample:", data);
}

checkActiveStatus();
