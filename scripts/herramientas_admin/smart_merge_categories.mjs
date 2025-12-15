
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

// Log file
const logFile = path.join(rootDir, 'scripts', 'analysis', 'smart_merge_log.txt');
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

// Normalize text: lowercase, remove accents
function normalize(str) {
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

// RICH KEYWORD MAPPING
// Key: Keyword (normalized), Value: Standard Category Name
const KEYWORD_MAP = {
    // Ciencias Naturales
    'biologia': 'Ciencias Naturales (Física, Química, Biología)',
    'botanica': 'Ciencias Naturales (Física, Química, Biología)',
    'zoologia': 'Ciencias Naturales (Física, Química, Biología)',
    'fisica': 'Ciencias Naturales (Física, Química, Biología)',
    'quimica': 'Ciencias Naturales (Física, Química, Biología)',
    'astronomia': 'Ciencias Naturales (Física, Química, Biología)',
    'geologia': 'Ciencias Naturales (Física, Química, Biología)',
    'ecologia': 'Naturaleza y Medio Ambiente',
    'naturaleza': 'Naturaleza y Medio Ambiente',
    
    // Salud
    'medicina': 'Salud y Bienestar',
    'salud': 'Salud y Bienestar',
    'enfermeria': 'Salud y Bienestar',
    'dietetica': 'Salud y Bienestar',
    'nutricion': 'Salud y Bienestar',
    'yoga': 'Salud y Bienestar',
    'sexualidad': 'Salud y Bienestar',
    'psiquiatria': 'Salud y Bienestar',
    
    // Historia / Bio
    'historia': 'Historia',
    'arqueologia': 'Arqueología',
    'biografia': 'Biografías y Memorias',
    'memorias': 'Biografías y Memorias',
    'guerra': 'Historia',
    'militar': 'Historia', // or Ciencias Sociales? Historia likely better for bookstore
    
    // Literature Broad
    'literatura': 'Literatura Contemporánea', // Broad bucket
    'narrativa': 'Literatura Contemporánea',
    'novela': 'Literatura Contemporánea', // Default unless specific
    'ensayo': 'Literatura Contemporánea', // Often literary essays
    'cuento': 'Literatura Contemporánea',
    'relato': 'Literatura Contemporánea',
    'clasicos': 'Literatura Contemporánea',
    'poesia': 'Poesía',
    'poema': 'Poesía',
    'teatro': 'Teatro',
    'drama': 'Teatro',
    
    // Genres
    'policiaca': 'Novela Negra y Policial',
    'negra': 'Novela Negra y Policial',
    'crimen': 'Novela Negra y Policial',
    'misterio': 'Thriller y Misterio',
    'suspense': 'Thriller y Misterio',
    'terror': 'Terror',
    'horror': 'Terror',
    'fantasia': 'Fantasía',
    'ciencia ficcion': 'Ciencia Ficción',
    'sci-fi': 'Ciencia Ficción',
    'erotica': 'Erótica',
    'romantica': 'Romántica',
    'amor': 'Romántica',
    'historica': 'Novela Histórica',
    
    // Comics
    'comic': 'Cómics y Novela Gráfica',
    'tebeo': 'Cómics y Novela Gráfica',
    'manga': 'Manga',
    'novela grafica': 'Cómics y Novela Gráfica',
    
    // Social / Humanities
    'filosofia': 'Filosofía',
    'psicologia': 'Psicología',
    'sociologia': 'Ciencias Sociales',
    'politica': 'Política',
    'derecho': 'Derecho',
    'legislacion': 'Derecho',
    'juridico': 'Derecho',
    'economia': 'Economía',
    'empresa': 'Empresa y Negocios',
    'negocios': 'Empresa y Negocios',
    'finanzas': 'Finanzas e Inversión',
    'banca': 'Finanzas e Inversión',
    'marketing': 'Empresa y Negocios',
    'gestion': 'Empresa y Negocios',
    'contabilidad': 'Empresa y Negocios',
    'pedagogia': 'Educación y Pedagogía',
    'educacion': 'Educación y Pedagogía',
    'ensenanza': 'Educación y Pedagogía',
    'religion': 'Religión',
    'teologia': 'Religión',
    'biblia': 'Religión',
    'espiritualidad': 'Espiritualidad',
    'esoterismo': 'Espiritualidad', // or Ocio?
    'cristianismo': 'Religión',
    
    // Technical
    'informatica': 'Informática',
    'software': 'Informática',
    'internet': 'Informática',
    'ingenieria': 'Ingeniería',
    'tecnologia': 'Tecnología',
    'bricolaje': 'Hogar y Jardín',
    'jardineria': 'Hogar y Jardín',
    'hogar': 'Hogar y Jardín',
    'decoracion': 'Hogar y Jardín',
    'manualidades': 'Manualidades',
    'artesania': 'Manualidades',
    
    // Arts / Leisure
    'arte': 'Arte',
    'pintura': 'Arte',
    'escultura': 'Arte',
    'arquitectura': 'Arte', // debatable, often art section
    'cine': 'Cine',
    'pelicula': 'Cine',
    'fotografia': 'Fotografía',
    'musica': 'Música',
    'partitura': 'Música',
    'deporte': 'Deportes',
    'futbol': 'Deportes',
    'caza': 'Ocio y Juegos',
    'pesca': 'Ocio y Juegos',
    'juegos': 'Ocio y Juegos',
    'ajedrez': 'Ocio y Juegos',
    'viajes': 'Viajes',
    'turismo': 'Viajes',
    'guia': 'Viajes', // Guías
    'cocina': 'Cocina y Gastronomía',
    'gastronomia': 'Cocina y Gastronomía',
    'recetas': 'Cocina y Gastronomía',
    'vinos': 'Cocina y Gastronomía',
    
    // Kids
    'infantil': 'Infantil',
    'ninos': 'Infantil',
    'juvenil': 'Juvenil (Young Adult)',
    'oposiciones': 'Oposiciones',
    'texto': 'Libros de Texto',
    'escolar': 'Libros de Texto',
    'diccionario': 'Diccionarios y Enciclopedias',
    'enciclopedia': 'Diccionarios y Enciclopedias',
    'idiomas': 'Idiomas',
    'ingles': 'Idiomas',
    'frances': 'Idiomas',
    'aleman': 'Idiomas',
    'linguistica': 'Idiomas',
    'filologia': 'Idiomas'
};

async function moveBooksSafely(oldId, newId, catName) {
    let movedTotal = 0;
    while (true) {
        // 1. Fetch batch of book IDs
        const { data: books, error: fetchErr } = await supabase
            .from('libros')
            .select('id')
            .eq('categoria_id', oldId)
            .limit(50); // Small batch size!

        if (fetchErr) {
            log(`    ❌ Error fetching books for '${catName}': ${fetchErr.message}`);
            return false;
        }

        if (!books || books.length === 0) {
            break; // Done
        }

        const ids = books.map(b => b.id);

        // 2. Update batch
        const { error: updateErr } = await supabase
            .from('libros')
            .update({ categoria_id: newId })
            .in('id', ids);

        if (updateErr) {
            log(`    ❌ Error moving batch of ${ids.length} books for '${catName}': ${updateErr.message}`);
            return false;
        }
        
        movedTotal += ids.length;
        // Optional: slight delay to be nice to DB?
        // await new Promise(r => setTimeout(r, 50)); 
    }
    if (movedTotal > 0) log(`    ✅ Moved ${movedTotal} books from '${catName}'.`);
    return true;
}

async function main() {
    log("🧠 Starting Smart Merge...");
    
    // 1. Get Standard IDs
    const stdMap = new Map(); // Name -> ID
    const stdNameSet = new Set();
    
    for (const name of STANDARD_CATEGORIES) {
        const { data } = await supabase.from('categorias').select('id, nombre').ilike('nombre', name).limit(1);
        if (data && data.length > 0) {
            stdMap.set(name, data[0].id);
            stdNameSet.add(normalize(name));
        }
    }
    log(`ℹ️ Loaded ${stdMap.size} standard category IDs.`);

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
    
    // Filter out standard ones from the process list (don't delete them!)
    // Note: We need target IDs, so we use stdMap for lookup.
    
    const stdIds = new Set(stdMap.values());
    const candidates = allCategories.filter(c => !stdIds.has(c.id));
    
    log(`🔍 Analyzing ${candidates.length} candidates for merging...`);
    
    let mergedCount = 0;
    
    for (const cat of candidates) {
        const normName = normalize(cat.nombre);
        let targetName = null;

        // A. Direct Keyword Match
        for (const [keyword, stdCat] of Object.entries(KEYWORD_MAP)) {
            // Check provided mapping keywords
            // logic: if 'literatura en lengua rusa' contains 'literatura' -> match
            if (normName.includes(keyword)) {
                targetName = stdCat;
                break; // First match wins (order of KEYWORD_MAP distinct keys is technically insertion order, but object logic applies. We put specific first?)
                       // Actually iteration order is not guaranteed reliable, but usually ok.
            }
        }
        
        // B. Standard Category Containment
        // If 'Historia de España' contains 'Historia' -> match 'Historia'
        if (!targetName) {
            for (const std of STANDARD_CATEGORIES) {
                const normStd = normalize(std);
                // If candidate contains Standard Name (e.g. "Historia Antigua" contains "Historia")
                if (normName.includes(normStd)) {
                    targetName = std;
                    break;
                }
                 // If Standard Name contains Candidate (e.g. "Cine" contains "Cine") - covered above
            }
        }

        if (targetName) {
            const targetId = stdMap.get(targetName);
            if (targetId) {
                // log(`  🔄 Merging '${cat.nombre}' -> '${targetName}'...`);
                // PERFORM MERGE
                const success = await moveBooksSafely(cat.id, targetId, cat.nombre);
                
                if (success) {
                    // Delete old
                    const { error: delErr } = await supabase.from('categorias').delete().eq('id', cat.id);
                    if (delErr) {
                         log(`    ⚠️ Could not delete '${cat.nombre}': ${delErr.message}`);
                    } else {
                         mergedCount++;
                         if (mergedCount % 100 === 0) log(`    Processed ${mergedCount} merges...`);
                    }
                }
            }
        } else {
            // No match found - these will be leftovers
            // log(`  Detailed: No match for '${cat.nombre}'`);
        }
    }

    log(`🎉 Smart Merge Completed. Merged ${mergedCount} categories.`);
}

main().catch(console.error);
