
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const jsonFilePath = path.resolve(__dirname, '../files/libros_convertidos_schema.json');
const outDir = path.resolve(__dirname, '../files');

console.log("🚀 Leyendo archivo JSON...");
const rawData = fs.readFileSync(jsonFilePath, 'utf8');
const libros = JSON.parse(rawData);

console.log(`📚 Analizando ${libros.length} libros...`);

const categorias = {};
const editoriales = {};

libros.forEach(libro => {
    // Categories
    let cat = libro.categoria_id; // Currently holds text
    if (typeof cat === 'string') {
        cat = cat.trim();
        if (cat) {
            categorias[cat] = (categorias[cat] || 0) + 1;
        }
    }

    // Editorials
    let edit = libro.editorial_id; // Currently holds text
    if (typeof edit === 'string') {
        edit = edit.trim();
        if (edit) {
            editoriales[edit] = (editoriales[edit] || 0) + 1;
        }
    }
});

// Sort by frequency (descending)
const sortedCategorias = Object.entries(categorias)
    .sort(([, a], [, b]) => b - a)
    .map(([name, count]) => `${name} (${count})`);

const sortedEditoriales = Object.entries(editoriales)
    .sort(([, a], [, b]) => b - a)
    .map(([name, count]) => `${name} (${count})`);

// Write to files
fs.writeFileSync(path.join(outDir, 'lista_categorias.txt'), sortedCategorias.join('\n'));
fs.writeFileSync(path.join(outDir, 'lista_editoriales.txt'), sortedEditoriales.join('\n'));

console.log(`✅ Extracción completada.`);
console.log(`- Categorías únicas: ${sortedCategorias.length}`);
console.log(`- Editoriales únicas: ${sortedEditoriales.length}`);
console.log(`Archivos generados en: ${outDir}`);
