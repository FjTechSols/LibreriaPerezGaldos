
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

// Log file
const logFile = path.join(rootDir, 'scripts', 'analysis', 'smart_cleanup_log.txt');
function log(msg) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${msg}`;
    console.log(line);
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

// Rules (Exact copy from verify/analysis)
const rules = [
    { target: 'Espasa-Calpe', keywords: ['espasa', 'calpe', 'espasa-calpe', 'espasa calpe'] },
    { target: 'Planeta', keywords: ['planeta'] },
    { target: 'Planeta DeAgostini', keywords: ['deagostini', 'de agostini', 'agostini'] },
    { target: 'Aguilar', keywords: ['aguilar'] },
    { target: 'Plaza & Janés', keywords: ['plaza', 'janés', 'janes'] },
    { target: 'Alianza Editorial', keywords: ['alianza'] },
    { target: 'Círculo de Lectores', keywords: ['círculo de lectores', 'circulo de lectores', 'circulo lectores'] },
    { target: 'Grijalbo', keywords: ['grijalbo'] },
    { target: 'Ediciones B', keywords: ['ediciones b'] },
    { target: 'Alfaguara', keywords: ['alfaguara'] },
    { target: 'Bruguera', keywords: ['bruguera'] },
    { target: 'Labor', keywords: ['labor'] },
    { target: 'Salvat', keywords: ['salvat'] },
    { target: 'RBA', keywords: ['rba'] },
    { target: 'Taurus', keywords: ['taurus'] },
    { target: 'Juventud', keywords: ['juventud'] },
    { target: 'Seix Barral', keywords: ['seix barral', 'seix-barral'] },
    { target: 'Anaya', keywords: ['anaya'] },
    { target: 'Destino', keywords: ['destino'] },
    { target: 'Cátedra', keywords: ['cátedra', 'catedra'] },
    { target: 'Anagrama', keywords: ['anagrama'] },
    { target: 'Tusquets', keywords: ['tusquets'] },
    { target: 'Akal', keywords: ['akal'] },
    { target: 'Fondo de Cultura Económica', keywords: ['cultura económica', 'cultura economica', 'fce'] },
    { target: 'SM', keywords: ['ediciones sm', 'fundación santa maría'] },
    { target: 'Valdemar', keywords: ['valdemar'] },
    { target: 'Siruela', keywords: ['siruela'] },
    { target: 'Lumen', keywords: ['lumen'] },
    { target: 'Debolsillo', keywords: ['debolsillo'] },
    { target: 'Salamandra', keywords: ['salamandra'] },
    { target: 'Vicens Vives', keywords: ['vicens vives', 'vicens-vives'] },
    { target: 'Gredos', keywords: ['gredos'] },
    { target: 'Ariel', keywords: ['ariel'] },
    { target: 'Martínez Roca', keywords: ['martínez roca', 'martinez roca'] },
    { target: 'Orbis', keywords: ['orbis'] },
    { target: 'Taschen', keywords: ['taschen'] },
    { target: 'Mondadori', keywords: ['mondadori'] },
    { target: 'Paidos', keywords: ['paidos', 'paidós'] },
    { target: 'Rialp', keywords: ['rialp'] },
    { target: 'Sopena', keywords: ['sopena', 'ramón sopena'] },
    { target: 'Edhasa', keywords: ['edhasa'] },
    { target: 'Trotta', keywords: ['trotta'] },
    { target: 'Castalia', keywords: ['castalia'] },
    { target: 'Tecnos', keywords: ['tecnos'] },
    { target: 'Herder', keywords: ['herder'] },
    { target: 'Sígueme', keywords: ['sígueme', 'sigueme'] },
    { target: 'Minotauro', keywords: ['minotauro'] },
    { target: 'Galaxia Gutenberg', keywords: ['galaxia gutenberg'] },
    { target: 'Pre-Textos', keywords: ['pre-textos', 'pre textos'] },
    { target: 'Hiperión', keywords: ['hiperión', 'hiperion'] },
    { target: 'Visor', keywords: ['visor'] },
    { target: 'Renacimiento', keywords: ['renacimiento'] },
    { target: 'Icaria', keywords: ['icaria'] },
    { target: 'La Esfera de los Libros', keywords: ['esfera de los libros'] },
    { target: 'Península', keywords: ['península', 'peninsula'] },
    { target: 'Hachette', keywords: ['hachette'] },
    { target: 'Cambridge University Press', keywords: ['cambridge'] },
    { target: 'Oxford University Press', keywords: ['oxford'] },
    { target: 'McGraw-Hill', keywords: ['mcgraw', 'mc graw'] },
    { target: 'Pearson', keywords: ['pearson'] },
    { target: 'Springer', keywords: ['springer'] },
    { target: 'Elsevier', keywords: ['elsevier'] },
    { target: 'Wiley', keywords: ['wiley'] },
    { target: 'Routledge', keywords: ['routledge'] },
    { target: 'Palgrave', keywords: ['palgrave'] },
    { target: 'Sage', keywords: ['sage'] },
    { target: 'MIT Press', keywords: ['mit press'] },
    { target: 'Harvard University Press', keywords: ['harvard'] },
    { target: 'Yale University Press', keywords: ['yale'] },
    { target: 'Princeton University Press', keywords: ['princeton'] },
    { target: 'Stanford University Press', keywords: ['stanford'] },
    { target: 'Chicago University Press', keywords: ['chicago'] },
    { target: 'Columbia University Press', keywords: ['columbia'] },
    { target: 'California University Press', keywords: ['california'] },
    { target: 'Duke University Press', keywords: ['duke'] },
    { target: 'Johns Hopkins University Press', keywords: ['johns hopkins'] },
    { target: 'Cornell University Press', keywords: ['cornell'] },
    { target: 'University of Toronto Press', keywords: ['toronto'] },
    { target: 'University of Pennsylvania Press', keywords: ['pennsylvania'] },
];

async function executeSmartCleanup() {
    log("🚀 Starting Smart Editorial Cleanup...");

    // 1. Fetch
    log("📥 Fetching all editorials...");
    let allEditorials = [];
    let from = 0;
    const batchSize = 1000;
    let fetching = true;

    while (fetching) {
        const { data, error } = await supabase
            .from('editoriales')
            .select('id, nombre')
            .range(from, from + batchSize - 1)
            .order('id');

        if (error) {
            log(`❌ Error fetching: ${error.message}`);
            process.exit(1);
        }

        if (data.length === 0) {
            fetching = false;
        } else {
            allEditorials = allEditorials.concat(data);
            from += batchSize;
        }
    }
    log(`✅ Fetched ${allEditorials.length} records.`);

    // 2. Group
    const groups = new Map();

    allEditorials.forEach(ed => {
        const originalName = ed.nombre;
        const lowerName = originalName.toLowerCase();
        let target = null;

        // Rules
        for (const rule of rules) {
             if (rule.keywords.some(k => lowerName.includes(k))) {
                 target = rule.target;
                 break;
             }
        }

        // Normalization fallback
        if (!target) {
            let clean = originalName
                .replace(/,?\s*S\.A\./gi, '')
                .replace(/,?\s*S\.L\./gi, '')
                .replace(/Editorial\s+/i, '')
                .replace(/Ediciones\s+/i, '')
                .replace(/Libreria\s+/i, '')
                .replace(/Imprenta\s+/i, '')
                .replace(/[.,]/g, '')
                .trim();
            
            if (clean.length > 1) {
                clean = clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
            }
            target = (clean.length < 2) ? originalName : clean;
        }

        if (!groups.has(target)) {
            groups.set(target, []);
        }
        groups.get(target).push(ed);
    });

    log(`📊 Grouping complete. Found ${groups.size} unique targets.`);

    // 3. Process
    let processedGroups = 0;
    let recordsConsolidated = 0;
    let renames = 0;

    for (const [targetName, items] of groups.entries()) {
        if (items.length === 0) continue;

        // Sort: Look for exact match first, then by ID
        let survivor = items.find(i => i.nombre === targetName);
        if (!survivor) {
            items.sort((a, b) => a.id - b.id);
            survivor = items[0];
        }

        const victims = items.filter(i => i.id !== survivor.id);
        const victimIds = victims.map(i => i.id);

        try {
            // Need to update Survivor Name?
            if (survivor.nombre !== targetName) {
                const { error: renameErr } = await supabase
                    .from('editoriales')
                    .update({ nombre: targetName })
                    .eq('id', survivor.id);
                
                if (renameErr) {
                    log(`  ⚠️ Warning: Could not rename ID ${survivor.id} ('${survivor.nombre}') to '${targetName}': ${renameErr.message}`);
                    // Continue anyway, better to merge than fail
                } else {
                    renames++;
                }
            }

            if (victimIds.length > 0) {
                // Batch processing to avoid timeouts
                const BATCH_SIZE = 10;
                for (let i = 0; i < victimIds.length; i += BATCH_SIZE) {
                    const chunk = victimIds.slice(i, i + BATCH_SIZE);

                    // Update Books for this chunk
                    const { error: updateErr } = await supabase
                        .from('libros')
                        .update({ editorial_id: survivor.id })
                        .in('editorial_id', chunk);

                    if (updateErr) {
                        log(`  ❌ Failed to reassign books for chunk (starting index ${i}): ${updateErr.message}`);
                        // Try to proceed to next chunk? Or abort group?
                        // If update fails, we CANNOT delete the editorial or we lose the link.
                        continue; 
                    }

                    // Delete Victims for this chunk
                    const { error: delErr } = await supabase
                        .from('editoriales')
                        .delete()
                        .in('id', chunk);

                    if (delErr) {
                        log(`  ❌ Failed to delete victims for chunk: ${delErr.message}`);
                    } else {
                        recordsConsolidated += chunk.length;
                    }
                }
            }
            
            processedGroups++;
            if (processedGroups % 100 === 0) {
                log(`...processed ${processedGroups} groups. Consolidated: ${recordsConsolidated}`);
                // Simple delay to breathe
                await new Promise(r => setTimeout(r, 100));
            }

        } catch (e) {
            log(`  ❌ Exception in group '${targetName}': ${e.message}`);
        }
    }

    log(`🏁 Smart Cleanup Finished!`);
    log(`   Groups Processed: ${processedGroups}`);
    log(`   Records Consolidated (Deleted): ${recordsConsolidated}`);
    log(`   Renames Performed: ${renames}`);
    log(`   Final DB Estimate: ${groups.size} editorials`);
}

executeSmartCleanup();
