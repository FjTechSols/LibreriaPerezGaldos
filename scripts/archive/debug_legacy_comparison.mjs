
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.development');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

const target = process.argv[2] || '02%';
console.log(`Querying for legacy_id LIKE '${target}'...`);

async function run() {
    const { data: highData } = await supabase
        .from('libros')
        .select('legacy_id, title, created_at')
        .like('legacy_id', '0238%')
        .order('legacy_id', { ascending: false })
        .limit(3);

    const { data: correctData } = await supabase
        .from('libros')
        .select('legacy_id, title, created_at')
        .like('legacy_id', '0229%')
        .order('legacy_id', { ascending: false })
        .limit(3);

    console.log('--- HIGH (Anomaly?) ---');
    console.table(highData);
    
    console.log('--- EXPECTED (0229...) ---');
    console.table(correctData);
}

run();
