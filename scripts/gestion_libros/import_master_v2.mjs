
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

// Load env
let envConfig = dotenv.config({ path: path.join(rootDir, '.env') });
if (envConfig.error) {
  envConfig = dotenv.config({ path: path.join(rootDir, '.env.development') });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Error: Missing credentials.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

// Files
const booksFile = path.resolve(__dirname, 'resultados/libros_convertidos_schema.json');
const catMapFile = path.resolve(__dirname, 'mapeos/mapeo_categorias.json');
const edMapFile = path.resolve(__dirname, 'mapeos/mapeo_editoriales.json');

async function importMaster() {
    console.log("🚀 INICIANDO IMPORTACIÓN MAESTRA V2...");

    // 1. Load Mappings
    console.log("📂 Cargando mapas de unificación...");
    const rawCatMap = JSON.parse(fs.readFileSync(catMapFile, 'utf8'));
    const rawEdMap = JSON.parse(fs.readFileSync(edMapFile, 'utf8'));

    // Get unique target names
    const uniqueCats = [...new Set(Object.values(rawCatMap))].filter(Boolean).sort();
    const uniqueEds = [...new Set(Object.values(rawEdMap))].filter(Boolean).sort();

    console.log(`   - Categorías unificadas a crear: ${uniqueCats.length}`);
    console.log(`   - Editoriales unificadas a crear: ${uniqueEds.length}`);

    // 2. Sync Categorias (Manual Upsert)
    console.log("🔄 Sincronizando Categorías con BD (Select+Insert)...");
    const dbCatMap = {}; 
    
    // Fetch all existing
    let allCats = [];
    let cPage = 0;
    while(true) {
        const { data } = await supabase.from('categorias').select('id, nombre').range(cPage*1000, (cPage+1)*1000-1);
        if (!data || data.length === 0) break;
        allCats = allCats.concat(data);
        cPage++;
    }
    allCats.forEach(c => dbCatMap[c.nombre] = c.id);

    // Filter new to insert
    const newCats = uniqueCats.filter(name => !dbCatMap[name]);
    if (newCats.length > 0) {
        console.log(`   Insertando ${newCats.length} categorías nuevas...`);
        for (let i = 0; i < newCats.length; i += 1000) {
            const batch = newCats.slice(i, i + 1000).map(name => ({ nombre: name }));
            const { data, error } = await supabase.from('categorias').insert(batch).select('id, nombre');
            if (error) { console.error("Error inserting categories:", error); }
            if (data) data.forEach(c => dbCatMap[c.nombre] = c.id);
        }
    }

    // 3. Sync Editoriales (Manual Upsert)
    console.log("🔄 Sincronizando Editoriales con BD (Select+Insert)...");
    const dbEdMap = {}; 
    
    // Fetch all existing
    let allEds = [];
    let ePage = 0;
    while(true) {
        const { data } = await supabase.from('editoriales').select('id, nombre').range(ePage*1000, (ePage+1)*1000-1);
        if (!data || data.length === 0) break;
        allEds = allEds.concat(data);
        ePage++;
    }
    allEds.forEach(e => dbEdMap[e.nombre] = e.id);

    // Filter new to insert
    const newEds = uniqueEds.filter(name => !dbEdMap[name]);
    if (newEds.length > 0) {
        console.log(`   Insertando ${newEds.length} editoriales nuevas...`);
        for (let i = 0; i < newEds.length; i += 1000) {
            const batch = newEds.slice(i, i + 1000).map(name => ({ nombre: name }));
            const { data, error } = await supabase.from('editoriales').insert(batch).select('id, nombre');
            if (error) { console.error("Error inserting editorials:", error); }
            if (data) data.forEach(e => dbEdMap[e.nombre] = e.id);
        }
    }
    
    // 4. Load Books
    console.log("📚 Cargando libros...");
    const libros = JSON.parse(fs.readFileSync(booksFile, 'utf8'));
    
    // 5. Fetch Existing Legacy IDs (Deduplication)
    console.log("🔍 Obteniendo IDs existentes para deduplicación...");
    const existingIds = new Set();
    let page = 0;
    while(true) {
        const { data, error } = await supabase.from('libros').select('legacy_id').range(page*10000, (page+1)*10000-1);
        if (error || !data || data.length === 0) break;
        data.forEach(r => { if(r.legacy_id) existingIds.add(r.legacy_id); });
        process.stdout.write(`\r   Leídos ${existingIds.size} existentes...`);
        page++;
    }
    console.log(`\n   Total existente: ${existingIds.size}`);

    // 6. Transform and Filter
    console.log("⚡ Transformando y filtrando libros...");
    const toInsert = [];
    
    // Helper
    const truncate = (str, len) => {
        if (!str) return str;
        return str.length > len ? str.substring(0, len) : str;
    };

    const cleanYear = (y) => {
        if (!y) return null;
        const year = parseInt(y);
        if (isNaN(year)) return null;
        if (year < 1000 || year > 2100) return null; 
        return year;
    };

    for (const libro of libros) {
        if (existingIds.has(libro.legacy_id)) continue;

        // Map Category
        const rawCat = libro.categoria_id; 
        const unifiedCat = rawCatMap[rawCat] || rawCat; 
        const catId = dbCatMap[unifiedCat] || null;

        // Map Editorial
        const rawEd = libro.editorial_id; 
        const unifiedEd = rawEdMap[rawEd] || rawEd;
        const edId = dbEdMap[unifiedEd] || null;

        toInsert.push({
            legacy_id: libro.legacy_id,
            isbn: truncate(libro.isbn, 20), // Standard ISBN is short
            titulo: truncate(libro.titulo, 200),
            anio: cleanYear(libro.anio),
            paginas: libro.paginas,
            descripcion: libro.descripcion, // Assume Description is TEXT (long)
            notas: libro.notas,
            categoria_id: catId,
            editorial_id: edId,
            precio: libro.precio,
            ubicacion: truncate(libro.ubicacion, 100),
            stock: libro.stock,
            activo: libro.activo,
            autor: truncate(libro.autor, 200),
            fecha_ingreso: libro.fecha_ingreso,
            imagen_url: libro.imagen_url
        });
    }

    console.log(`✨ Libros listos para insertar: ${toInsert.length} (Skipped ${libros.length - toInsert.length})`);

    // 7. Insert
    if (toInsert.length > 0) {
        console.log("🚀 Insertando en lotes de 50...");
        for (let i = 0; i < toInsert.length; i += 50) {
            const batch = toInsert.slice(i, i + 50);
            const { error } = await supabase.from('libros').insert(batch);
            if (error) {
                console.error(`Error batch ${i}:`, error.message);
                // Try to continue?
            } else {
                process.stdout.write(`\r   Progreso: ${Math.min(i + 50, toInsert.length)} / ${toInsert.length}`);
            }
        }
        console.log("\n✅ Importación Finalizada.");
    } else {
        console.log("🎉 Nada nuevo que insertar.");
    }
}

importMaster();
