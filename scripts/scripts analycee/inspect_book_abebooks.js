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

async function inspectBook(legacyId) {
    console.log(`Inspecting book with legacy_id: ${legacyId}`);
    
    // Also try matching ID just in case
    const { data, error } = await supabase
        .from('libros')
        .select('*')
        .or(`legacy_id.eq.${legacyId},id.eq.${legacyId}`)
        .single();

    if (error) {
        console.error('Error fetching book:', error);
        return;
    }

    if (!data) {
        console.log('Book not found.');
        return;
    }
    
    console.log(JSON.stringify({ 
        id: data.id, 
        legacy_id: data.legacy_id, 
        paginas: data.paginas, 
        isbn: data.isbn 
    }));
}

// Check IDs provided by user
inspectBook('02285207');
inspectBook('02080807');
inspectBook('02279231');

