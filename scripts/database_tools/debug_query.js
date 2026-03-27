import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ROL_KEY);

const { data, error, count } = await supabase
    .from('libros')
    .select('id, titulo, precio, legacy_id', { count: 'exact' })
    .eq('precio', 0)
    .limit(5);

const result = { error: error?.message, count, sample: data };
fs.writeFileSync('debug_query.json', JSON.stringify(result, null, 2));
console.log('saved to debug_query.json');
