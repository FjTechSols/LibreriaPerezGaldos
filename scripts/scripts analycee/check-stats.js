import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Credentials not found in environment');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStats() {
    const { count: total } = await supabase.from('libros').select('*', { count: 'exact', head: true });
    
    const { count: withImage } = await supabase.from('libros')
        .select('*', { count: 'exact', head: true })
        .not('imagen_url', 'is', null)
        .neq('imagen_url', '')
        .not('imagen_url', 'ilike', '%default%');

    const { count: withIsbn } = await supabase.from('libros')
        .select('*', { count: 'exact', head: true })
        .not('isbn', 'is', null)
        .neq('isbn', '');

    console.log(`Total Books: ${total}`);
    console.log(`With Valid Images: ${withImage}`);
    console.log(`With Valid ISBN: ${withIsbn}`);
}

checkStats();
