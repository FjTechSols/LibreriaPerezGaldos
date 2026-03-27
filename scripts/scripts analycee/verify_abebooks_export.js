import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_ROL_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Env vars not set.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const MIN_PRICE = 12;

async function countWhere(filters) {
    let q = supabase.from('libros').select('*', { count: 'exact', head: true });
    for (const [op, col, val] of filters) {
        if (op === 'eq') q = q.eq(col, val);
        else if (op === 'gt') q = q.gt(col, val);
        else if (op === 'gte') q = q.gte(col, val);
        else if (op === 'lt') q = q.lt(col, val);
    }
    const { count, error } = await q;
    if (error) throw error;
    return count;
}

async function run() {
    const stats = {
        total: await countWhere([]),
        exported_to_abebooks: await countWhere([['gt','stock',0],['gte','precio',MIN_PRICE]]),
        stock_zero: await countWhere([['eq','stock',0]]),
        stock_negative: await countWhere([['lt','stock',0]]),
        price_zero: await countWhere([['eq','precio',0]]),
        stock_ok_price_zero: await countWhere([['gt','stock',0],['eq','precio',0]]),
        stock_ok_low_price: await countWhere([['gt','stock',0],['lt','precio',MIN_PRICE]]),
        min_price_used: MIN_PRICE,
        note_stock_filter: "Edge function uses .gt('stock', 0) - correct, excludes 0 and negatives",
        note_price_filter: `Edge function uses .gte('precio', ${MIN_PRICE})`
    };

    // Save as JSON
    const outPath = path.join(__dirname, '../abebooks_export_stats.json');
    fs.writeFileSync(outPath, JSON.stringify(stats, null, 2));
    console.log('Done. Results saved to abebooks_export_stats.json');
    console.log(JSON.stringify(stats, null, 2));
}

run().catch(console.error);
