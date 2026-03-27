
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'files', 'PerezGaldosConectia.txt');
const outPath = path.join(__dirname, 'sample_head.txt');

try {
    const data = fs.readFileSync(filePath, 'latin1'); 
    const lines = data.split(/\r?\n/).filter(line => line.trim() !== '');
    
    if (lines.length > 0) {
        // Write the first line to a file in UTF-8
        fs.writeFileSync(outPath, lines[0], 'utf8');
        console.log('Written first line to sample_head.txt');
    }
} catch (err) {
    console.error(err);
}
