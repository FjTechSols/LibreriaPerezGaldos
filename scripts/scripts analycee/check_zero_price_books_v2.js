import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ROL_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Variables de entorno no configuradas.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Buscando libros con precio = 0...');

    let allBooks = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('libros')
            .select('id, titulo, autor, precio, stock, legacy_id')
            .eq('precio', 0)
            .order('stock', { ascending: false }) // Primero los que tienen stock (más urgentes)
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) { console.error('Error:', error); break; }
        if (data.length > 0) { allBooks = allBooks.concat(data); page++; }
        else { hasMore = false; }
    }

    // Breakdown stats
    const withStock = allBooks.filter(b => b.stock > 0);
    const stockZero = allBooks.filter(b => b.stock === 0);
    const stockNeg = allBooks.filter(b => b.stock < 0);
    const noTitle = allBooks.filter(b => !b.titulo || ['n/a', 'sin título', 'sin titulo', 'no', ''].includes((b.titulo || '').toLowerCase().trim()));
    const hasLegacyId = allBooks.filter(b => b.legacy_id);
    const noLegacyId = allBooks.filter(b => !b.legacy_id);

    const report = {
        generated_at: new Date().toISOString(),
        summary: {
            total_zero_price: allBooks.length,
            with_stock_available: withStock.length,
            stock_zero: stockZero.length,
            stock_negative: stockNeg.length,
            with_generic_title: noTitle.length,
            with_legacy_id: hasLegacyId.length,
            without_legacy_id: noLegacyId.length,
        },
        urgent: withStock, // Libros con stock disponible pero sin precio (los más urgentes)
        all_books: allBooks
    };

    const timestamp = new Date().toISOString().replace(/[:.T]/g, '-').slice(0, -1);
    const outPath = path.join(__dirname, `../zero_price_audit_${timestamp}.json`);
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

    // Print summary to stdout too
    const summaryPath = path.join(__dirname, '../zero_price_audit_summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(report.summary, null, 2));

    console.log('SUMMARY:');
    console.log(JSON.stringify(report.summary, null, 2));
    console.log(`\nReporte completo guardado en: ${outPath}`);
}

run().catch(console.error);
