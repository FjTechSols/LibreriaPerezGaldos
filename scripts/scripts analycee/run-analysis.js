import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runAnalysis() {
    console.log('Running analysis...');
    
    // We can't run raw SQL easily without an RPC or direct connection.
    // Let's us the 'rpc' approach if we can, but we don't have a 'exec_sql' rpc usually.
    // So let's use the JS client to count directly.
    
    console.log('--- ANALYSIS START ---');
    
    try {
        // 1. Total
        const { count: total, error: e1 } = await supabase.from('libros').select('*', { count: 'exact', head: true });
        if (e1) throw e1;
        console.log(`Total Books: ${total}`);

        // 2. ISBN Null
        const { count: isbnNull, error: e2 } = await supabase.from('libros').select('*', { count: 'exact', head: true }).is('isbn', null);
        if (e2) throw e2;
        console.log(`ISBN Null: ${isbnNull}`);

        // 3. ISBN Empty
        const { count: isbnEmpty, error: e3 } = await supabase.from('libros').select('*', { count: 'exact', head: true }).eq('isbn', '');
        if (e3) throw e3;
        console.log(`ISBN Empty: ${isbnEmpty}`);

        // 4. ISBN Populated
        const { count: isbnPopulated, error: e4 } = await supabase.from('libros')
            .select('*', { count: 'exact', head: true })
            .neq('isbn', '')
            .not('isbn', 'is', null);
        if (e4) throw e4;
        console.log(`ISBN Populated: ${isbnPopulated}`);

        // 5. Cod Barras
        const { count: cbPopulated, error: e5 } = await supabase.from('libros')
            .select('*', { count: 'exact', head: true })
            .neq('cod_barras', '')
            .not('cod_barras', 'is', null);
        if (e5) throw e5;
         console.log(`Cod Barras Populated: ${cbPopulated}`);

    } catch (e) {
        console.error('CRITICAL ERROR:', e);
    }

    // 3. Text Search (Slow)
    console.log(`\n--- TEXT SEARCH (Sample) ---`);
    // We can't easily regex search via JS client without a specific filter or rpc.
    // We'll skip complex regex for now and focus on column existence.
    // Checking 5 random records where isbn is null to see if they have it in description.
    
    const { data: sample } = await supabase.from('libros')
        .select('id, titulo, descripcion, observaciones')
        .is('isbn', null)
        .not('descripcion', 'is', null)
        .limit(5);
        
    console.log('Sample NULL ISBN records (checking descriptions):');
    sample.forEach(b => {
        const desc = b.descripcion || '';
        const obs = b.observaciones || '';
        const match = desc.match(/(978|979)[- ]?\d{9,10}/) || obs.match(/(978|979)[- ]?\d{9,10}/);
        if (match) {
            console.log(`[FOUND IN TEXT] ID: ${b.id} -> ${match[0]}`);
        } else {
             console.log(`[NO MATCH] ID: ${b.id}`);
        }
    });

}

runAnalysis();
