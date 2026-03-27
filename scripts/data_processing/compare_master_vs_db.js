/**
 * compare_master_vs_db.js
 * 
 * Compara el catálogo maestro unificado con la base de datos Supabase.
 * Identifica libros en la DB que tienen datos dañados (precio=0, título genérico, etc.)
 * y que tienen información recuperable en el catálogo maestro.
 * 
 * Genera:
 *   - compare_report.json: Reporte completo de recuperables y mejorables
 *   - updates_to_apply.json: Lista de updates listos para aplicar
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ROL_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Variables de entorno Supabase no configuradas.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const GENERIC_TITLES = new Set(['n/a', 'sin título', 'sin titulo', 'no', '', 'sin titulo.', 'n/a.', 'untitled', 'test ubicacion']);

function isGenericTitle(t) {
    return GENERIC_TITLES.has((t || '').toLowerCase().trim());
}

function hasIssue(book) {
    return book.precio === 0 || isGenericTitle(book.titulo) || !book.autor;
}

// Fetch ALL books from Supabase that have at least one issue
async function fetchBooksWithIssues() {
    console.log('Consultando Supabase — libros con precio = 0...');
    let allBooks = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    // Query 1: precio = 0
    while (hasMore) {
        const { data, error } = await supabase
            .from('libros')
            .select('id, titulo, autor, precio, stock, legacy_id, isbn, descripcion, anio_publicacion, paginas')
            .eq('precio', 0)
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) { console.error('Error:', error); break; }
        if (!data || data.length === 0) { hasMore = false; break; }

        allBooks = allBooks.concat(data);
        page++;
        if (data.length < pageSize) hasMore = false;
    }

    console.log(`  → ${allBooks.length} libros con precio=0 encontrados en DB`);

    // Query 2: sin autor
    console.log('Consultando Supabase — libros sin autor...');
    let noAutorBooks = [];
    page = 0; hasMore = true;
    while (hasMore) {
        const { data, error } = await supabase
            .from('libros')
            .select('id, titulo, autor, precio, stock, legacy_id, isbn, descripcion, anio_publicacion, paginas')
            .is('autor', null)
            .gt('precio', 0)  // Solo los que tienen precio (los de precio=0 ya están arriba)
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) { console.error('Error:', error); break; }
        if (!data || data.length === 0) { hasMore = false; break; }

        noAutorBooks = noAutorBooks.concat(data);
        page++;
        if (data.length < pageSize) hasMore = false;
    }
    console.log(`  → ${noAutorBooks.length} libros sin autor (con precio) encontrados en DB`);

    const combined = [...allBooks, ...noAutorBooks];
    // Dedup by id
    const seen = new Set();
    const unique = combined.filter(b => { if (seen.has(b.id)) return false; seen.add(b.id); return true; });
    console.log(`  → Total únicos con problemas: ${unique.length}`);
    return unique;
}

async function main() {
    console.log('=== COMPARACIÓN CATÁLOGO MAESTRO vs BASE DE DATOS ===\n');

    // 1. Cargar catálogo maestro en memoria como Map por legacy_id
    const masterPath = path.join(__dirname, 'files', 'master_catalog.json');
    console.log('Cargando catálogo maestro...');
    const masterRecords = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
    const masterMap = new Map(masterRecords.map(r => [r.legacy_id, r]));
    console.log(`  → ${masterMap.size} registros en catálogo maestro\n`);

    // 2. Obtener libros con problemas de Supabase
    const dbBooks = await fetchBooksWithIssues();

    // 3. Cruzar
    const results = {
        recoverable_price: [],       // precio=0 en DB, tiene precio en catálogo
        recoverable_title: [],       // título genérico en DB, tiene título real en catálogo
        recoverable_author: [],      // sin autor en DB, tiene autor en catálogo
        no_legacy_id: [],            // libros sin legacy_id en DB (no se pueden cruzar)
        not_in_master: [],           // legacy_id no encontrado en catálogo maestro
        no_recovery_possible: [],    // está en catálogo pero tampoco tiene mejor dato
    };

    for (const book of dbBooks) {
        if (!book.legacy_id) {
            results.no_legacy_id.push({ id: book.id, titulo: book.titulo });
            continue;
        }

        const master = masterMap.get(book.legacy_id);
        if (!master) {
            results.not_in_master.push({
                id: book.id,
                titulo: book.titulo,
                legacy_id: book.legacy_id,
                precio_db: book.precio
            });
            continue;
        }

        // Calcular qué se puede recuperar
        const recovery = {
            db_id: book.id,
            legacy_id: book.legacy_id,
            titulo_db: book.titulo,
            autor_db: book.autor,
            precio_db: book.precio,
            stock_db: book.stock,
            master_source: master._source,
        };
        let hasRecovery = false;

        if (book.precio === 0 && master.precio > 0) {
            recovery.new_precio = master.precio;
            results.recoverable_price.push(recovery);
            hasRecovery = true;
        }

        if (isGenericTitle(book.titulo) && !isGenericTitle(master.titulo)) {
            recovery.titulo_master = master.titulo;
            recovery.autor_master = master.autor;
            if (!results.recoverable_price.find(r => r.db_id === book.id)) {
                results.recoverable_title.push(recovery);
            } else {
                // Ya está en recoverable_price, añadir info de título
                const existing = results.recoverable_price.find(r => r.db_id === book.id);
                if (existing) {
                    existing.titulo_master = master.titulo;
                    existing.autor_master = master.autor;
                }
            }
            hasRecovery = true;
        }

        if (!book.autor && master.autor) {
            recovery.autor_master = master.autor;
            if (!results.recoverable_price.find(r => r.db_id === book.id) &&
                !results.recoverable_title.find(r => r.db_id === book.id)) {
                results.recoverable_author.push(recovery);
            }
            hasRecovery = true;
        }

        if (!hasRecovery) {
            results.no_recovery_possible.push({
                id: book.id,
                titulo: book.titulo,
                legacy_id: book.legacy_id,
                precio_db: book.precio,
                precio_master: master.precio
            });
        }
    }

    // 4. Construir lista de updates a aplicar
    const updatesToApply = [];

    for (const r of results.recoverable_price) {
        const update = { id: r.db_id, legacy_id: r.legacy_id, changes: {} };
        if (r.new_precio !== undefined) update.changes.precio = r.new_precio;
        if (r.titulo_master && isGenericTitle(r.titulo_db)) update.changes.titulo = r.titulo_master;
        if (r.autor_master && !r.autor_db) update.changes.autor = r.autor_master;
        updatesToApply.push(update);
    }

    for (const r of results.recoverable_title) {
        const update = { id: r.db_id, legacy_id: r.legacy_id, changes: {} };
        if (r.titulo_master) update.changes.titulo = r.titulo_master;
        if (r.autor_master && !r.autor_db) update.changes.autor = r.autor_master;
        updatesToApply.push(update);
    }

    for (const r of results.recoverable_author) {
        const update = { id: r.db_id, legacy_id: r.legacy_id, changes: { autor: r.autor_master } };
        updatesToApply.push(update);
    }

    // 5. Resumen
    const summary = {
        generated_at: new Date().toISOString(),
        total_db_books_with_issues: dbBooks.length,
        recoverable_price: results.recoverable_price.length,
        recoverable_title: results.recoverable_title.length,
        recoverable_author: results.recoverable_author.length,
        not_in_master: results.not_in_master.length,
        no_legacy_id: results.no_legacy_id.length,
        no_recovery_possible: results.no_recovery_possible.length,
        total_updates_to_apply: updatesToApply.length,
    };

    console.log('\n=== RESUMEN DE COMPARACIÓN ===');
    console.log(JSON.stringify(summary, null, 2));

    // 6. Guardar reportes
    const reportPath = path.join(__dirname, '../compare_report.json');
    const updatesPath = path.join(__dirname, '../updates_to_apply.json');

    fs.writeFileSync(reportPath, JSON.stringify({ summary, ...results }, null, 2));
    fs.writeFileSync(updatesPath, JSON.stringify(updatesToApply, null, 2));

    console.log(`\n✅ Reporte completo: compare_report.json`);
    console.log(`✅ Updates listos para aplicar: updates_to_apply.json (${updatesToApply.length} cambios)`);
}

main().catch(console.error);
