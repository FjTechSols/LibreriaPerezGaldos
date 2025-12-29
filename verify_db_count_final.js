
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load production env for Service Role Key (just in case RLS applies to count too, 
// though typically read is allowed, but consistency is good)
dotenv.config({ path: path.join(__dirname, '.env.production') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkCount() {
    console.log('Checking "libros" table count...');
    
    // Total
    const { count: total, error } = await supabase
        .from('libros')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error fetching count:', error);
    } else {
        console.log(`Total records in DB: ${total}`);
    }
}

checkCount();
