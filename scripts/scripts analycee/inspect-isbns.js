import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log('Inspecting ISBNs...');
    
    // Fetch 50 records where isbn is NOT NULL and length > 0
    const { data, error } = await supabase
        .from('libros')
        .select('id, isbn')
        .not('isbn', 'is', null)
        .neq('isbn', '')
        .limit(50);
        
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    console.log(`Found ${data.length} records.`);
    data.forEach((row, i) => {
        console.log(`[${i}] ID: ${row.id} | ISBN: '${row.isbn}' | Length: ${row.isbn.length}`);
    });
}

inspect();
