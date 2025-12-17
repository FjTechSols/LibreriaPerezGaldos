
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.development');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function run() {
    console.log("Counting '0230%'...");
    const { count, error } = await supabase
        .from('libros')
        .select('*', { count: 'exact', head: true })
        .like('legacy_id', '0230%');

    if (error) console.error(error);
    else console.log(`Total '0230%' books: ${count}`);
}

run();
