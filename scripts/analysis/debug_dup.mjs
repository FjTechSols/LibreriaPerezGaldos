
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

async function debugDup() {
    const targetId = "02160686";
    console.log(`🔍 Inspecting legacy_id: '${targetId}'`);
    
    const { data, error } = await supabase
        .from('libros')
        .select('*')
        .eq('legacy_id', targetId);
        
    if (error) {
        console.error(error);
        return;
    }
    
    console.log(`Found ${data.length} records.`);
    if (data.length === 0) console.log("No records found.");
    
    data.forEach(d => {
        console.log(`[${d.id}] LegacyID: '${d.legacy_id}'`);
        // Print character codes
        const codes = [];
        for (let i=0; i < d.legacy_id.length; i++) {
            codes.push(d.legacy_id.charCodeAt(i));
        }
        console.log(`       Codes: ${codes.join(', ')}`);
        console.log(`       Created: ${d.created_at}`);
    });
}

debugDup();
