
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env file
const envPath = path.resolve(process.cwd(), '.env');
const envConfig = dotenv.config({ path: envPath }).parsed || {};

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || envConfig.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || envConfig.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not found in environment.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkZeroPriceBooks() {
    console.log('🔍 Checking for books with price 0...');

    let allBooks = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('libros')
            .select('id, titulo, precio, stock', { count: 'exact' })
            .eq('precio', 0)
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
            console.error('Error fetching books:', error);
            break;
        }

        if (data.length > 0) {
            allBooks = allBooks.concat(data);
            page++;
        } else {
            hasMore = false;
        }
    }

    console.log(`✅ Found ${allBooks.length} books with price 0.`);

    if (allBooks.length > 0) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `zero_price_books_${timestamp}.json`;
        fs.writeFileSync(filename, JSON.stringify(allBooks, null, 2));
        console.log(`📝 Details saved to ${filename}`);
        
        console.log('\n--- First 10 Check ---');
        allBooks.slice(0, 10).forEach(b => {
            console.log(`[${b.id}] ${b.titulo} (Stock: ${b.stock})`);
        });
    }
}

checkZeroPriceBooks();
