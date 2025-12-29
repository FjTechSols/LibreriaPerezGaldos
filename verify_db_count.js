
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkCount() {
    console.log('Checking "libros" table count...');
    
    const { count, error } = await supabase
        .from('libros')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error fetching count:', error);
    } else {
        console.log(`Total records in DB: ${count}`);
    }
}

checkCount();
