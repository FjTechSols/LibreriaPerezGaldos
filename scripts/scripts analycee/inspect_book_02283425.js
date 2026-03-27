
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../.env');

dotenv.config({ path: envPath });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectBook() {
    const sku = '02283425';
    console.log(`Inspecting SKU: ${sku}`);

    const { data, error } = await supabase
        .from('libros')
        .select('*')
        .or(`legacy_id.eq.${sku},id.eq.${sku}`)
        .maybeSingle();

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (!data) {
        console.log('Book not found.');
        return;
    }

    console.log('--- DB DATA ---');
    console.log(`Title: ${data.titulo}`);
    console.log(`Paginas (DB): ${data.paginas}`);
    console.log(`Stock: ${data.stock}`);
    console.log(`Price: ${data.precio}`);
    console.log(`Legacy ID: ${data.legacy_id}`);
    console.log(`ID: ${data.id}`);
}

inspectBook();
