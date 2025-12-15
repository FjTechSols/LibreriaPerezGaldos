
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const inputFile = path.resolve(__dirname, '../files/Conjunta.txt');

async function inspectColumns() {
    const fileStream = fs.createReadStream(inputFile, { encoding: 'latin1' });
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let count = 0;
    for await (const line of rl) {
        if (!line.trim()) continue;
        if (count >= 3) break;

        console.log(`\n--- Line ${count + 1} ---`);
        const cols = line.split('\t').map(c => {
            let clean = c.trim();
             if (clean.startsWith('"') && clean.endsWith('"')) {
                clean = clean.slice(1, -1);
            }
            return clean.replace(/""/g, '"');
        });

        cols.forEach((val, idx) => {
            console.log(`[${idx}] ${val}`);
        });
        count++;
    }
}

inspectColumns();
