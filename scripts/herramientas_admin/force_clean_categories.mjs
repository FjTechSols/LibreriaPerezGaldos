
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

// Log file
const logFile = path.join(rootDir, 'scripts', 'analysis', 'force_clean_log.txt');
function log(msg) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${msg}`;
    console.log(line);
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
    log("🚀 Starting Force Cleanup of Non-Standard Categories...");

    // 1. Get Standard IDs
    const stdMap = new Map();
    for (const name of STANDARD_CATEGORIES) {
        const { data } = await supabase.from('categorias').select('id, nombre').ilike('nombre', name).limit(1);
        if (data && data.length > 0) {
            stdMap.set(data[0].id, data[0].nombre);
        }
    }
    const stdIds = new Set(stdMap.keys());
    log(`✅ Identified ${stdIds.size} standard categories to PROTECT.`);

    // 2. Fetch All Categories
    let allCategories = [];
    {
         let rFrom = 0;
         let rFetching = true;
         while (rFetching) {
            const { data, error } = await supabase.from('categorias').select('id, nombre').range(rFrom, rFrom + 999);
            if (!data || data.length === 0) rFetching = false;
            else {
                allCategories = allCategories.concat(data);
                rFrom += 1000;
            }
         }
    }
    
    const toDelete = allCategories.filter(c => !stdIds.has(c.id));
    log(`⚠️ Found ${toDelete.length} categories to DELETE.`);

    // 3. Process Deletion
    const BATCH_SIZE = 50; 
    let processed = 0;
    
    // Process in chunks
    for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
        const batch = toDelete.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(async (cat) => {
            try {
                // A. Unlink Books (Set to NULL)
                // We do this in a loop until 0 updated, to handle large categories
                let unlinking = true;
                while (unlinking) {
                    // Try to set 1000 books to null
                     const { data: books, error: fetchErr } = await supabase
                        .from('libros')
                        .select('id')
                        .eq('categoria_id', cat.id)
                        .limit(500);

                    if (!books || books.length === 0) {
                        unlinking = false;
                        break;
                    }

                    const ids = books.map(b => b.id);
                    const { error: updateErr } = await supabase
                        .from('libros')
                        .update({ categoria_id: null }) // TRY NULL
                        .in('id', ids);

                    if (updateErr) {
                         // Check if it's a constraint error
                         if (updateErr.message && updateErr.message.includes('null value in column "categoria_id" violates not-null constraint')) {
                             log(`❌ CRITICAL: 'categoria_id' is NOT nullable. Cannot orphan books from '${cat.nombre}'. Skipping.`);
                             unlinking = false;
                             return; // Skip deletion of this category
                         }
                         log(`  ❌ Error unlinking books for '${cat.nombre}': ${updateErr.message}`);
                         unlinking = false; // Stop trying to unlink if other error
                    }
                }

                // B. Delete Category
                const { error: delErr } = await supabase.from('categorias').delete().eq('id', cat.id);
                if (delErr) {
                    // Check FK error (if unlinking failed or missed some)
                    log(`  ❌ Failed to delete '${cat.nombre}': ${delErr.message}`);
                } else {
                    // log(`  ✅ Deleted '${cat.nombre}'`);
                }

            } catch (e) {
                log(`  ❌ Exception processing '${cat.nombre}': ${e.message}`);
            }
        }));
        
        processed += batch.length;
        if (processed % 500 === 0) log(`   Processed ${processed}/${toDelete.length}...`);
    }

    log("🏁 Force Cleanup Done.");
}

main().catch(console.error);
