
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

// Env setup
let envConfig = dotenv.config({ path: path.join(rootDir, '.env') });
if (envConfig.error) {
  envConfig = dotenv.config({ path: path.join(rootDir, '.env.development') });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
   console.error("❌ Missing Supabase URL or Service Role Key");
   process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Rules from unify_editorials.mjs
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

async function analyze() {
    console.log("📥 Fetching all editorials...");
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
            console.error(error);
            break;
        }

        if (data.length === 0) {
            fetching = false;
        } else {
            allEditorials = allEditorials.concat(data);
            from += batchSize;
        }
    }
    console.log(`✅ Total fetched: ${allEditorials.length}`);

    // Logic
    const proposalMap = new Map(); // TargetName -> [original items]

    allEditorials.forEach(ed => {
        const originalName = ed.nombre;
        const lowerName = originalName.toLowerCase();
        let target = null;
        let method = 'none';

        // 1. Check Rules
        for (const rule of rules) {
             if (rule.keywords.some(k => lowerName.includes(k))) {
                 target = rule.target;
                 method = 'rule';
                 break;
             }
        }

        // 2. Normalization
        if (!target) {
            let clean = originalName
                .replace(/,?\s*S\.A\./gi, '')
                .replace(/,?\s*S\.L\./gi, '')
                .replace(/Editorial\s+/i, '')
                .replace(/Ediciones\s+/i, '')
                .replace(/Libreria\s+/i, '')
                .replace(/Imprenta\s+/i, '')
                .replace(/[.,]/g, '') // Remove dots/commas
                .trim();
            
            // Capitalize first letter logic
            if (clean.length > 1) {
                clean = clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
            }
            
            if (clean.length < 2) target = originalName; // Avoid empty names
            else target = clean;
            
            method = 'normalization';
        }

        if (!proposalMap.has(target)) {
            proposalMap.set(target, []);
        }
        proposalMap.get(target).push({ ...ed, method });
    });

    // Generate Report
    const proposedMerges = [];
    let totalReduction = 0;

    for (const [target, items] of proposalMap.entries()) {
        if (items.length > 1) {
            // Check if they are actually different IDs (we know there are duplicates)
            const uniqueIds = new Set(items.map(i => i.id));
            if (uniqueIds.size > 1) {
                // Check if names are actually different (to show meaningful merges)
                const uniqueNames = new Set(items.map(i => i.nombre));
                
                proposedMerges.push({
                    targetName: target,
                    count: items.length,
                    variations: Array.from(uniqueNames),
                    ids: items.map(i => i.id).slice(0, 10) // Limit IDs in report
                });
                totalReduction += (items.length - 1);
            }
        }
    }

    // Sort by count desc
    proposedMerges.sort((a, b) => b.count - a.count);

    const report = {
        totalEditorialsProcessed: allEditorials.length,
        groupsFound: proposedMerges.length,
        potentialReduction: totalReduction,
        topMerges: proposedMerges.slice(0, 100)
    };

    fs.writeFileSync('scripts/analysis/advanced_cleanup_proposal.json', JSON.stringify(report, null, 2));
    console.log(`✅ Proposal generated in scripts/analysis/advanced_cleanup_proposal.json`);
    console.log(`Potential groups: ${proposedMerges.length}. Reduction: ${totalReduction}`);
}

analyze();
