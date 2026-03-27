import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../.env');

// Load .env
dotenv.config({ path: envPath });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function auditCounts() {
    console.log('--- AUDIT START ---');

    try {
        // 1. Total Books
        const { count: total, error: err1 } = await supabase
            .from('libros')
            .select('*', { count: 'exact', head: true });
        
        if (err1) throw err1;
        console.log(`Total Books in DB: ${total}`);

        // 2. Active Stock (>0)
        const { count: stockActive, error: err2 } = await supabase
            .from('libros')
            .select('*', { count: 'exact', head: true })
            .gt('stock', 0);

        if (err2) throw err2;
        console.log(`Books with Stock > 0: ${stockActive}`);
        console.log(`Drop due to Stock=0: ${total - stockActive}`);

        // 3. Price Filter (>= 12)
        const minPrice = 12;
        const { count: priceFilter, error: err3 } = await supabase
            .from('libros')
            .select('*', { count: 'exact', head: true })
            .gt('stock', 0)
            .gte('precio', minPrice);

        if (err3) throw err3;
        console.log(`Books with Stock > 0 AND Price >= ${minPrice}: ${priceFilter}`);
        console.log(`Drop due to Price < ${minPrice}: ${stockActive - priceFilter}`);

        // 4. Legacy ID check
        const { count: legacyIdCount, error: err4 } = await supabase
            .from('libros')
            .select('*', { count: 'exact', head: true })
            .not('legacy_id', 'is', null);
            
        if (err4) throw err4;
        console.log(`Books with Legacy ID: ${legacyIdCount}`);

    } catch (err) {
        console.error('Audit failed:', err.message);
    }

    console.log('--- AUDIT END ---');
}

auditCounts();
