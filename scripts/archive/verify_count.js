import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env.production' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; 

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verify() {
    const { count, error } = await supabase.from('libros').select('*', { count: 'exact', head: true });
    if (error) console.error('Error:', error);
    else console.log('Total books in DB:', count);
}

verify();
