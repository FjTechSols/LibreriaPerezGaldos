
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

// Log file
const logFile = path.join(rootDir, 'scripts', 'analysis', 'normalize_categories_log.txt');
function log(msg) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${msg}`;
    console.log(line);
    // Ensure dir exists
    const dir = path.dirname(logFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(logFile, line + '\n');
}

// Env setup
let envConfig = dotenv.config({ path: path.join(rootDir, '.env') });
if (envConfig.error) {
  envConfig = dotenv.config({ path: path.join(rootDir, '.env.development') });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
   log("❌ Missing Supabase URL or Service Role Key");
   process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const STANDARD_CATEGORIES = [
  'Arqueología', 'Arte', 'Autoayuda y Desarrollo Personal', 'Biografías y Memorias', 'Ciencia Ficción',
  'Ciencias Naturales (Física, Química, Biología)', 'Ciencias Sociales', 'Cine', 'Cocina y Gastronomía',
  'Cómics y Novela Gráfica', 'Crianza y Embarazo', 'Deportes', 'Derecho', 'Diccionarios y Enciclopedias',
  'Economía', 'Educación y Pedagogía', 'Empresa y Negocios', 'Erótica', 'Espiritualidad', 'Fantasía',
  'Filosofía', 'Finanzas e Inversión', 'Fotografía', 'Historia', 'Hogar y Jardín', 'Idiomas', 'Infantil',
  'Informática', 'Ingeniería', 'Juvenil (Young Adult)', 'Libros de Texto', 'Literatura Contemporánea',
  'Manga', 'Manualidades', 'Música', 'Naturaleza y Medio Ambiente', 'Novela Histórica',
  'Novela Negra y Policial', 'Ocio y Juegos', 'Oposiciones', 'Poesía', 'Política', 'Psicología', 'Religión',
  'Romántica', 'Salud y Bienestar', 'Teatro', 'Tecnología', 'Terror', 'Thriller y Misterio', 'Viajes'
];

async function main() {
    log("🚀 Starting Category Normalization...");

    // 1. Ensure Standard Categories Exist and Get IDs
    log("📥 Verifying Standard Categories...");
    const stdMap = new Map(); // Name (lower) -> ID

    for (const name of STANDARD_CATEGORIES) {
        // Check if exists (handle duplicates by taking first)
        const { data: existing, error: fetchErr } = await supabase
            .from('categorias')
            .select('id, nombre')
            .ilike('nombre', name)
            .limit(1);

        if (fetchErr) {
            log(`❌ Error checking category '${name}': ${fetchErr.message}`);
            continue;
        }

        let catId;
        if (existing && existing.length > 0) {
            catId = existing[0].id;
            // Update name to match case exactly if needed? Optional.
        } else {
            // Create
            const { data: created, error: createErr } = await supabase
                .from('categorias')
                .insert({ nombre: name, descripcion: 'Categoría Estándar' })
                .select()
                .single();
            
            if (createErr) {
                log(`❌ Error creating category '${name}': ${createErr.message}`);
                continue;
            }
            catId = created.id;
            log(`   Created new standard category: ${name}`);
        }
        stdMap.set(name.toLowerCase(), { id: catId, name: name });
    }
    log(`✅ Verified ${stdMap.size} standard categories.`);

    // 2. Fetch All Other Categories
    log("📥 Fetching all categories to analyze...");
    
    let allCategories = [];
    let from = 0;
    const batchSize = 1000;
    let fetching = true;

    while (fetching) {
        const { data, error } = await supabase
            .from('categorias')
            .select('*')
            .range(from, from + batchSize - 1)
            .order('id');
        
        if (error) {
            log(`❌ Error fetching: ${error.message}`);
            process.exit(1);
        }

        if (data.length === 0) {
            fetching = false;
        } else {
            allCategories = allCategories.concat(data);
            from += batchSize;
            log(`   Fetched ${allCategories.length}...`);
        }
    }

    // 3. Map Categories
    log(`✅ Analyzing ${allCategories.length} categories...`);
    const plan = [];

    for (const cat of allCategories) {
        const catNameLower = cat.nombre.toLowerCase().trim();
        
        // Skip if it IS a standard category (by ID)
        const stdMatch = stdMap.get(catNameLower);
        if (stdMatch && stdMatch.id === cat.id) continue;

        // SKIP if current name IS strictly one of the standard names but ID is different?
        // If we have "Historia" (ID 1) and "Historia" (ID 2), and Standard is ID 1.
        // We want to merge ID 2 -> ID 1.
        // So we proceed.

        let target = null;

        // Exact Match
        if (stdMatch) {
            target = stdMatch;
        } else {
            // Keyword Heuristics
            for (const stdName of STANDARD_CATEGORIES) {
                const stdNameLower = stdName.toLowerCase();
                
                // Specific Overrides
                if (catNameLower.includes('policiaca') || catNameLower.includes('crimen') || catNameLower.includes('negra')) {
                     target = stdMap.get('novela negra y policial'.toLowerCase());
                }
                else if (catNameLower.includes('poemas') || catNameLower.includes('poesía')) target = stdMap.get('poesía');
                else if (catNameLower.includes('biografia')) target = stdMap.get('biografías y memorias'.toLowerCase());
                else if (catNameLower.includes('cocina') || catNameLower.includes('recetas') || catNameLower.includes('gastronomía')) target = stdMap.get('cocina y gastronomía'.toLowerCase());
                else if (catNameLower.includes('autoayuda') || catNameLower.includes('superación')) target = stdMap.get('autoayuda y desarrollo personal'.toLowerCase());
                else if (catNameLower.includes('ficcion') || catNameLower.includes('sci-fi')) target = stdMap.get('ciencia ficción'.toLowerCase());
                else if (catNameLower.includes('infantil') || catNameLower.includes('niños')) target = stdMap.get('infantil');
                else if (catNameLower.includes('juvenil')) target = stdMap.get('juvenil (young adult)'.toLowerCase());
                else if (catNameLower.includes('teatro')) target = stdMap.get('teatro');
                else if (catNameLower.includes('arte')) target = stdMap.get('arte'); // Careful
                else if (catNameLower.includes('historia')) target = stdMap.get('historia');
                // General Fallback: Word match
                else {
                    const words = catNameLower.split(/[\s,.-]+/);
                    if (words.includes(stdNameLower)) { 
                        target = stdMap.get(stdNameLower);
                    }
                }
                
                if (target) break;
            }
        }

        if (target && target.id !== cat.id) {
            plan.push({
                from: cat,
                to: target
            });
        }
    }

    log(`📊 Analysis Complete. Found ${plan.length} categories to merge out of ${allCategories.length}.`);
    
    // 4. Execute Migration
    log("▶️ Executing Migration in batches...");
    
    let processed = 0;
    const UPDATE_BATCH_SIZE = 50;

    for (let i = 0; i < plan.length; i += UPDATE_BATCH_SIZE) {
        const chunk = plan.slice(i, i + UPDATE_BATCH_SIZE);
        
        // We do promises all for the chunk
        await Promise.all(chunk.map(async (item) => {
            try {
                // Move books in batches to avoid timeout
                let moving = true;
                while (moving) {
                     // Fetch a batch of books to move
                     const { data: booksToMove, error: fetchErr } = await supabase
                        .from('libros')
                        .select('id')
                        .eq('categoria_id', item.from.id)
                        .limit(50); // Move 50 at a time (Reduced from 500 to avoid timeouts)
                        
                     if (fetchErr) {
                         log(`  ❌ Error fetching books to move from '${item.from.nombre}': ${fetchErr.message}`);
                         moving = false;
                         break;
                     }
                     
                     if (!booksToMove || booksToMove.length === 0) {
                         moving = false;
                         break;
                     }
                     
                     const ids = booksToMove.map(b => b.id);
                     
                     const { error: moveErr } = await supabase
                        .from('libros')
                        .update({ categoria_id: item.to.id })
                        .in('id', ids);
                        
                     if (moveErr) {
                         log(`  ❌ Error moving batch of ${ids.length} books from '${item.from.nombre}': ${moveErr.message}`);
                         // If we fail a batch, maybe stop this category?
                         moving = false;
                     } else {
                         // log(`    Moved batch of ${ids.length}...`);
                     }
                }

                // Verify empty before delete
                const { count } = await supabase
                    .from('libros')
                    .select('*', { count: 'exact', head: true })
                    .eq('categoria_id', item.from.id);
                    
                if (count === 0) {
                    const { error: delErr } = await supabase
                        .from('categorias')
                        .delete()
                        .eq('id', item.from.id);
                    
                    if (delErr) {
                        log(`  ⚠️ Moved books but failed to delete '${item.from.nombre}': ${delErr.message}`);
                    } else {
                        log(`  ✅ Migrated and deleted: ${item.from.nombre} -> ${item.to.name}`);
                    }
                } else {
                     log(`  ⚠️ Could not delete '${item.from.nombre}', still has ${count} books.`);
                }
            } catch (e) {
                log(`  ❌ Exception processing '${item.from.nombre}': ${e.message}`);
            }
        }));

        processed += chunk.length;
        if (processed % 100 === 0) {
            log(`   Processed ${processed}/${plan.length} categories...`);
        }
    }

    // 5. Final Cleanup: Delete empty categories (concurrently)
    log("🧹 Cleaning up empty non-standard categories...");
    
    let deletedCount = 0;
    
    // Fetch all current categories (just IDs) to check
    let remainingCategories = [];
    {
         let rFrom = 0;
         let rFetching = true;
         // optimized fetch
         while (rFetching) {
            const { data, error } = await supabase.from('categorias').select('id, nombre').range(rFrom, rFrom + 999);
            if (!data || data.length === 0) rFetching = false;
            else {
                remainingCategories = remainingCategories.concat(data);
                rFrom += 1000;
            }
         }
    }
    
    // Process in batches for concurrency
    const CLEANUP_CONCURRENCY = 20;
    for (let i = 0; i < remainingCategories.length; i += CLEANUP_CONCURRENCY) {
        const batch = remainingCategories.slice(i, i + CLEANUP_CONCURRENCY);
        await Promise.all(batch.map(async (cat) => {
            // Skip if Standard
            if (stdMap.has(cat.nombre.toLowerCase().trim())) return;
            // Also check by ID if name varies slightly? The map stores lower->{id, name}
            // If the ID matches a standard ID, skip.
            // We can check if Array.from(stdMap.values()).some(v => v.id === cat.id) but that's O(N) inside loop.
            // Better: Build a Set of Standard IDs first.
        }));
    }
    
    // Better ID set check
    const stdIds = new Set();
    for (const v of stdMap.values()) stdIds.add(v.id);
    
    // Actual Loop with concurrency
    for (let i = 0; i < remainingCategories.length; i += CLEANUP_CONCURRENCY) {
        const batch = remainingCategories.slice(i, i + CLEANUP_CONCURRENCY);
        
        await Promise.all(batch.map(async (cat) => {
            if (stdIds.has(cat.id)) return;
            const std = stdMap.get(cat.nombre.toLowerCase().trim());
            if (std && std.id === cat.id) return;

            // Check if empty
            const { count, error } = await supabase
                .from('libros')
                .select('*', { count: 'estimated', head: true }) // Try estimated first? No, for delete we need exact.
                .eq('categoria_id', cat.id);
            
            // Note: 'estimated' might return 0 erroneously? For strict cleanup, exact is safer.
            // But exact is slow.
            // Let's use exact but optimize?
            // Just count: exact is fine for individual check usually.
            
            const { count: exactCount, error: countErr } = await supabase
                .from('libros')
                .select('*', { count: 'exact', head: true })
                .eq('categoria_id', cat.id);

            if (!countErr && exactCount === 0) {
                // Delete
                const { error: delErr } = await supabase.from('categorias').delete().eq('id', cat.id);
                if (!delErr) {
                    deletedCount++;
                }
            }
        }));
        
        if (i % 500 === 0) log(`   Checked ${i}/${remainingCategories.length} cleanup candidates...`);
    }
    
    log(`✨ Deleted ${deletedCount} empty non-standard categories.`);
    log("🏁 Done.");
}

main().catch(e => {
    console.error(e);
    log(`❌ Fatal Error: ${e.message}`);
});
