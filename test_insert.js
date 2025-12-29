
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env.production') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testInsert() {
    console.log('Testing single book insertion...');
    console.log('Key used:', SUPABASE_KEY ? SUPABASE_KEY.substring(0, 10) + '...' : 'None');

    const testBook = {
        titulo: 'TEST_BOOK_INSERTION_DEBUG',
        legacy_id: 'TEST_99999',
        stock: 1,
        precio: 10
    };

    const { data, error } = await supabase.from('libros').insert(testBook).select();

    if (error) {
        console.error('INSERT FAILED:', error);
    } else {
        console.log('INSERT SUCCESS:', data);
        // Clean up
        await supabase.from('libros').delete().eq('legacy_id', 'TEST_99999');
    }
}

testInsert();
