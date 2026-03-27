import { createClient } from '@supabase/supabase-js';
import 'dotenv/config'; // Needed for process.env or just rely on file reading
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
const envPath = path.join(__dirname, '../.env');
const envConfig = fs.readFileSync(envPath, 'utf8');
const env = {};
envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim().replace(/"/g, '');
});

const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBook() {
    // Search for the book from screenshot "Técnica de los vendajes" 
    // We'll search effectively 'vendajes' to be safe against encoding in DB
    const { data, error } = await supabase
        .from('libros')
        .select('*')
        .ilike('titulo', '%vendajes%')
        .limit(5);

    if (error) {
        console.error('Error fetching book:', error);
    } else {
        console.log('--- Database Records ---');
        data.forEach(book => {
            console.log(`Title: ${book.titulo}`);
            console.log(`SKU: ${book.legacy_id || book.codigo}`);
            console.log(`Image URL: ${book.imagen_url}`);
            console.log('---');
        });
    }
}

checkBook();
