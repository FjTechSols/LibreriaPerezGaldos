
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filePath = path.resolve(__dirname, '../files/Conjunta.txt');

async function analyzeColumns() {
    const fileStream = fs.createReadStream(filePath, { encoding: 'latin1' });
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const columnCounts = {};
    let lineCount = 0;

    for await (const line of rl) {
        if (!line.trim()) continue;
        const cols = line.split('\t').length;
        columnCounts[cols] = (columnCounts[cols] || 0) + 1;
        lineCount++;
        
        if (lineCount < 5) {
             console.log(`Line ${lineCount} cols: ${cols}`);
             console.log(line.split('\t').map(c => c.trim().substring(0, 20)).join('|'));
        }
    }

    console.log('\n--- Column Count Summary ---');
    console.table(columnCounts);
}

analyzeColumns();
