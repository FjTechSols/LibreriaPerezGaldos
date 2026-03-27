import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function count() {
    console.log('Counting ISBNs...');
    
    // Count NOT NULL
    const { count: notNull, error: e1 } = await supabase
        .from('libros')
        .select('*', { count: 'exact', head: true })
        .not('isbn', 'is', null);
        
    if (e1) console.error(e1);
    console.log(`ISBN Not Null: ${notNull}`);

    // Count Empty
    const { count: empty, error: e2 } = await supabase
        .from('libros')
        .select('*', { count: 'exact', head: true })
        .eq('isbn', '');
        
    if (e2) console.error(e2);
    console.log(`ISBN Empty String: ${empty}`);
    
    // Count Images
    console.log('Counting Images...');
    
    const { count: imgNotNull, error: e3 } = await supabase
        .from('libros')
        .select('*', { count: 'exact', head: true })
        .not('imagen_url', 'is', null);
        
    const { count: imgEmpty, error: e4 } = await supabase
        .from('libros')
        .select('*', { count: 'exact', head: true })
        .eq('imagen_url', '');

    const { count: imgDefault, error: e5 } = await supabase
        .from('libros')
        .select('*', { count: 'exact', head: true })
        .ilike('imagen_url', '%default-book-cover%');

    console.log(`Image Not Null: ${imgNotNull}`);
    console.log(`Image Empty: ${imgEmpty}`);
    console.log(`Image Default: ${imgDefault}`);
    console.log(`High Quality Images (approx): ${imgNotNull - imgEmpty - imgDefault}`);
}

count();
