import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filesDir = path.join(__dirname, 'files');
const files = ['Conjunta.txt', 'ConjuntaAbebooks.txt', 'ConjuntaConectia.txt', 'GaleonConectia.txt'];

const out = {};
for (const f of files) {
    const p = path.join(filesDir, f);
    const content = fs.readFileSync(p, 'latin1');
    const lines = content.split('\n').filter(l => l.trim());
    const firstLine = lines[0];
    const delim = firstLine.includes('\t') ? '\t' : '#';
    const parts = firstLine.split(delim).map(x => x.replace(/^"|"$/g, '').trim());

    out[f] = {
        size_kb: Math.round(fs.statSync(p).size / 1024),
        total_lines: lines.length,
        delimiter: delim === '\t' ? 'TAB' : '#',
        columns: parts.length,
        col_values: parts.slice(0, 14).reduce((acc, v, i) => {
            acc[`col_${i}`] = v.substring(0, 50);
            return acc;
        }, {})
    };
}

const outPath = path.join(__dirname, 'file_inspection.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log('Inspección guardada en scripts/file_inspection.json');
