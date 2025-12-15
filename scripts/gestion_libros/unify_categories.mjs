
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const inputFile = path.resolve(__dirname, 'resultados/lista_categorias.txt');
const outputFileMap = path.resolve(__dirname, 'mapeos/mapeo_categorias.json');
const outputFileSummary = path.resolve(__dirname, 'resultados/resumen_categorias_unificadas.txt');

console.log("🚀 Iniciando unificación de categorías...");

if (!fs.existsSync(inputFile)) {
    console.error("❌ Archivo de entrada no encontrado:", inputFile);
    process.exit(1);
}

const rawLines = fs.readFileSync(inputFile, 'utf8').split('\n');

// Unification Rules (Order matters!)
const rules = [
    { target: 'Historia', keywords: ['historia', 'historico', 'guerra', 'civil'] },
    { target: 'Infantiles', keywords: ['infantil', 'niños', 'juvenil', 'cuentos'] },
    { target: 'Poesía', keywords: ['poesía', 'poesia', 'poemas', 'verso'] },
    { target: 'Novela', keywords: ['novela', 'ficción', 'ficcion', 'narrativa'] },
    { target: 'Arte', keywords: ['arte', 'pintura', 'escultura', 'arquitectura', 'fotografía', 'fotografia'] },
    { target: 'Religión', keywords: ['religión', 'religion', 'teología', 'iglesia', 'cristianismo'] },
    { target: 'Biografía', keywords: ['biograf', 'memorias'] },
    { target: 'Viajes', keywords: ['viaje', 'turismo', 'guia'] },
    { target: 'Ciencias', keywords: ['ciencia', 'fisica', 'quimica', 'biologia', 'medicina', 'tecnologia'] },
    { target: 'Filosofía', keywords: ['filosofía', 'filosofia', 'pensamiento'] },
    { target: 'Cocina', keywords: ['cocina', 'gastronomia', 'recetas'] },
    { target: 'Teatro', keywords: ['teatro', 'drama'] },
];

const categoryMap = {}; // "Old Name": "New Name"
const summaryCounts = {}; // "New Name": Total Count

rawLines.forEach(line => {
    if (!line.trim()) return;

    // Line format: "Category Name (Count)"
    // Need to extract the name part carefully to assume it ends with (N)
    const match = line.match(/^(.*) \((\d+)\)$/);
    if (!match) return;

    const originalName = match[1].trim();
    const count = parseInt(match[2], 10);
    const lowerName = originalName.toLowerCase();

    let assigned = false;
    
    // Check rules
    for (const rule of rules) {
        if (rule.keywords.some(k => lowerName.includes(k))) {
            categoryMap[originalName] = rule.target;
            summaryCounts[rule.target] = (summaryCounts[rule.target] || 0) + count;
            assigned = true;
            break;
        }
    }

    // Default: Keep original but formatted (Capitalized)
    if (!assigned) {
        // Simple capitalization
        let normalized = originalName.charAt(0).toUpperCase() + originalName.slice(1).toLowerCase();
        // Maybe group small buckets into "Otros"?
        // For now, keep as is to avoid over-reduction
        categoryMap[originalName] = normalized;
        summaryCounts[normalized] = (summaryCounts[normalized] || 0) + count;
    }
});

// Save Map
fs.writeFileSync(outputFileMap, JSON.stringify(categoryMap, null, 2));

// Save Summary (Sorted by count)
const summaryText = Object.entries(summaryCounts)
    .sort(([, a], [, b]) => b - a) // Descending
    .map(([name, count]) => `${name}: ${count}`)
    .join('\n');

fs.writeFileSync(outputFileSummary, summaryText);

console.log(`✅ Unificación completada.`);
console.log(`- Mapeo guardado en: ${outputFileMap}`);
console.log(`- Resumen guardado en: ${outputFileSummary}`);
