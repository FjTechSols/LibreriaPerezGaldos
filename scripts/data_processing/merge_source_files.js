/**
 * merge_source_files.js
 * 
 * Unifica los 4 archivos TXT de la base de datos antigua en un catálogo maestro JSON.
 * Deduplicación por legacy_id con prioridad:
 *   1. Conjunta.txt
 *   2. ConjuntaConectia.txt
 *   3. ConjuntaAbebooks.txt
 *   4. GaleonConectia.txt
 * 
 * Si el registro prioritario tiene precio=0 o título vacío/genérico,
 * se busca en archivos de menor prioridad si tienen mejor dato.
 */

import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filesDir = path.join(__dirname, 'files');

// --- Configuración de archivos ---
const FILE_CONFIGS = [
    {
        name: 'Conjunta.txt',
        priority: 1,
        delimiter: '\t',
        map: { legacy_id: 0, titulo: 1, descripcion: 2, editorial: 4, anio: 5, autor: 6, ciudad: 7, pais: 8, precio: 9, paginas: 10, isbn: 11, stock: 12 }
    },
    {
        name: 'ConjuntaConectia.txt',
        priority: 2,
        delimiter: '#',
        map: { legacy_id: 0, titulo: 1, descripcion: 2, editorial: 4, anio: 5, autor: 6, ciudad: 7, pais: 8, precio: 9, paginas: 10, isbn: 11 }
    },
    {
        name: 'ConjuntaAbebooks.txt',
        priority: 3,
        delimiter: '\t',
        map: { legacy_id: 0, titulo: 1, descripcion: 2, editorial: 4, anio: 5, autor: 6, ciudad: 7, pais: 8, precio: 9, paginas: 10, isbn: 11 }
    },
    {
        name: 'GaleonConectia.txt',
        priority: 4,
        delimiter: '#',
        // FORMATO DISTINTO: legacy_id en col 12, precio en col 10, autor en col 0
        map: { autor: 0, titulo: 1, descripcion: 2, editorial: 4, ciudad: 6, pais: 7, precio: 10, paginas: 11, legacy_id: 12 }
    }
];

const GENERIC_TITLES = new Set(['n/a', 'sin título', 'sin titulo', 'no', '', 'sin titulo.', 'n/a.', 'untitled']);

function isGenericTitle(title) {
    return GENERIC_TITLES.has((title || '').toLowerCase().trim());
}

function parsePrice(str) {
    const n = parseFloat((str || '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
}

function clean(str) {
    return (str || '').replace(/^["']|["']$/g, '').trim();
}

function parseLine(line, config) {
    const parts = line.split(config.delimiter).map(p => clean(p));
    const m = config.map;
    const get = (colIdx) => colIdx !== undefined ? (parts[colIdx] || '') : '';

    const legacy_id = get(m.legacy_id);
    if (!legacy_id) return null;

    return {
        legacy_id,
        titulo: get(m.titulo),
        autor: get(m.autor),
        descripcion: get(m.descripcion),
        editorial: get(m.editorial),
        anio: get(m.anio),
        ciudad: get(m.ciudad),
        pais: get(m.pais),
        precio: parsePrice(get(m.precio)),
        paginas: get(m.paginas),
        isbn: get(m.isbn),
        stock: m.stock !== undefined ? parseInt(get(m.stock)) || 0 : null,
        _source: config.name,
        _priority: config.priority
    };
}

function isBetter(existing, candidate) {
    // Un candidato es mejor si tiene precio > 0 cuando el existente no lo tiene
    if (existing.precio === 0 && candidate.precio > 0) return true;
    // O si el título existente es genérico y el candidato no lo es
    if (isGenericTitle(existing.titulo) && !isGenericTitle(candidate.titulo)) return true;
    // O si el existente tiene prioridad menor (número más alto)
    if (candidate._priority < existing._priority) return true;
    return false;
}

async function processFile(config, catalog, stats) {
    const filePath = path.join(filesDir, config.name);
    if (!fs.existsSync(filePath)) {
        console.warn(`  [SKIP] Archivo no encontrado: ${config.name}`);
        return;
    }

    const rl = readline.createInterface({
        input: fs.createReadStream(filePath, { encoding: 'latin1' }),
        crlfDelay: Infinity
    });

    let lineCount = 0;
    let added = 0;
    let updated = 0;
    let skipped = 0;

    for await (const line of rl) {
        if (!line.trim()) continue;
        lineCount++;

        const record = parseLine(line, config);
        if (!record) { skipped++; continue; }

        const existing = catalog.get(record.legacy_id);
        if (!existing) {
            catalog.set(record.legacy_id, record);
            added++;
        } else if (isBetter(existing, record)) {
            // Merge: conservar el mejor dato campo a campo
            const merged = { ...existing };
            if (existing.precio === 0 && record.precio > 0) merged.precio = record.precio;
            if (isGenericTitle(existing.titulo) && !isGenericTitle(record.titulo)) merged.titulo = record.titulo;
            if (!existing.autor && record.autor) merged.autor = record.autor;
            if (!existing.isbn && record.isbn) merged.isbn = record.isbn;
            if (!existing.descripcion && record.descripcion) merged.descripcion = record.descripcion;
            if (!existing.editorial && record.editorial) merged.editorial = record.editorial;
            merged._sources = [...(existing._sources || [existing._source]), config.name];
            catalog.set(record.legacy_id, merged);
            updated++;
        } else {
            skipped++;
        }
    }

    console.log(`  [${config.name}] Líneas: ${lineCount} | Nuevos: ${added} | Actualizados: ${updated} | Omitidos: ${skipped}`);
    stats.push({ file: config.name, lines: lineCount, added, updated, skipped });
}

async function main() {
    console.log('=== UNIFICACIÓN DE CATÁLOGO MAESTRO ===\n');
    console.log(`Procesando ${FILE_CONFIGS.length} archivos en orden de prioridad...\n`);

    const catalog = new Map();
    const stats = [];

    for (const config of FILE_CONFIGS) {
        console.log(`Procesando: ${config.name} (prioridad ${config.priority})`);
        await processFile(config, catalog, stats);
    }

    // Convertir Map a array para serializar
    const records = Array.from(catalog.values());

    // Estadísticas finales
    const withPrice = records.filter(r => r.precio > 0).length;
    const noPrice = records.filter(r => r.precio === 0).length;
    const withGenericTitle = records.filter(r => isGenericTitle(r.titulo)).length;

    const summary = {
        generated_at: new Date().toISOString(),
        total_unique_records: records.length,
        with_valid_price: withPrice,
        with_price_zero: noPrice,
        with_generic_title: withGenericTitle,
        by_file: stats
    };

    console.log('\n=== RESUMEN FINAL ===');
    console.log(JSON.stringify(summary, null, 2));

    // Guardar catálogo maestro
    const outPath = path.join(filesDir, 'master_catalog.json');
    const summaryPath = path.join(filesDir, 'master_catalog_summary.json');

    console.log(`\nGuardando catálogo maestro (${records.length} registros)...`);
    fs.writeFileSync(outPath, JSON.stringify(records, null, 2));
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    console.log(`\n✅ Catálogo maestro guardado en: ${outPath}`);
    console.log(`✅ Resumen guardado en: ${summaryPath}`);
}

main().catch(console.error);
