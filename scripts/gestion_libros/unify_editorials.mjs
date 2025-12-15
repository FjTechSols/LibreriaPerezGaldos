
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const inputFile = path.resolve(__dirname, 'resultados/lista_editoriales.txt');
const outputFileMap = path.resolve(__dirname, 'mapeos/mapeo_editoriales.json');
const outputFileSummary = path.resolve(__dirname, 'resultados/resumen_editoriales_unificadas.txt');

console.log("🚀 Iniciando unificación de editoriales...");

if (!fs.existsSync(inputFile)) {
    console.error("❌ Archivo de entrada no encontrado:", inputFile);
    process.exit(1);
}

const rawLines = fs.readFileSync(inputFile, 'utf8').split('\n');

// Unification Rules (Prioritized)
const rules = [
    { target: 'Espasa-Calpe', keywords: ['espasa', 'calpe', 'espasa-calpe', 'espasa calpe'] },
    { target: 'Planeta', keywords: ['planeta'] }, // Catch "Planeta DeAgostini" separately if needed, but often grouped. Let's separate DeAgostini maybe? User said "respetivos nombres", so let's try to be specific but grouped.
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
    { target: 'Fondo de Cultura Económica', keywords: ['cultura económica', 'cultura economica'] },
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

const categoryMap = {}; // "Old Name": "New Name"
const summaryCounts = {}; // "New Name": Total Count

rawLines.forEach(line => {
    if (!line.trim()) return;

    // Line format: "Name (Count)"
    const match = line.match(/^(.*) \((\d+)\)$/);
    if (!match) return;

    const originalName = match[1].trim();
    const count = parseInt(match[2], 10);
    const lowerName = originalName.toLowerCase();

    let assigned = false;
    
    // Check prioritized rules
    // Note: Order in 'rules' array matters. Put specific ones (Planeta DeAgostini) before general (Planeta).
    // I sorted array above roughly, but let's double check.
    
    for (const rule of rules) {
        if (rule.keywords.some(k => lowerName.includes(k))) {
            categoryMap[originalName] = rule.target;
            summaryCounts[rule.target] = (summaryCounts[rule.target] || 0) + count;
            assigned = true;
            break;
        }
    }

    // Default: Keep original but try to clean up "S.A.", "S.L."
    if (!assigned) {
        let clean = originalName
            .replace(/,?\s*S\.A\./gi, '')
            .replace(/,?\s*S\.L\./gi, '')
            .replace(/Editorial\s+/i, '')
            .replace(/Ediciones\s+/i, '')
            .trim();
            
        // Capitalize first letter logic is complex for multi-words, rely on clean output
        if (clean.length < 2) clean = originalName; // Revert if cleaned too much
        
        categoryMap[originalName] = clean;
        summaryCounts[clean] = (summaryCounts[clean] || 0) + count;
    }
});

fs.writeFileSync(outputFileMap, JSON.stringify(categoryMap, null, 2));

const summaryText = Object.entries(summaryCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([name, count]) => `${name}: ${count}`)
    .join('\n');

fs.writeFileSync(outputFileSummary, summaryText);

console.log(`✅ Unificación de editoriales completada.`);
console.log(`- Mapeo guardado en: ${outputFileMap}`);
console.log(`- Resumen guardado en: ${outputFileSummary}`);
