
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const inputFile = path.resolve(__dirname, '../files/Conjunta.txt');

async function findCategories() {
    const fileStream = fs.createReadStream(inputFile, { encoding: 'latin1' });
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let count = 0;
    let found = 0;
    for await (const line of rl) {
        if (!line.trim()) continue;
        count++;

        const cols = line.split('\t').map(c => {
            let clean = c.trim();
             if (clean.startsWith('"') && clean.endsWith('"')) {
                clean = clean.slice(1, -1);
            }
            return clean.replace(/""/g, '"').trim();
        });

        const category = cols[11]; // Index 11
        if (category && category.length > 0) {
            console.log(`Line ${count}: ${category}`);
            found++;
            if (found >= 5) break; 
        }
    }
    
    if (found === 0) {
        console.log("No non-empty categories found in first batch.");
    }
}

findCategories();
