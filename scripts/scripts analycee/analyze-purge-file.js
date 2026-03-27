import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Correct path relative to where script is located: scripts/analyze-purge-file.js
// Target file: scripts/files/PurgePerezGaldosAbe.txt
const filePath = path.join(__dirname, 'files', 'PurgePerezGaldosAbe.txt');

try {
    console.log(`Reading file from: ${filePath}`);
    const content = fs.readFileSync(filePath, 'latin1'); // Use latin1 to see true byte preservation if needed, or utf8
    // Actually, let's try reading as is to see encoding.
    // If it's a legacy file, might be latin1.
    
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');

    console.log(`Total data lines: ${lines.length}`);

    if (lines.length > 0) {
        // Analyze first 5 lines
        for (let i = 0; i < Math.min(5, lines.length); i++) {
            const line = lines[i];
            const columns = line.split('\t');
            console.log(`\n--- Line ${i + 1} ---`);
            // console.log(`Raw: ${JSON.stringify(line)}`); 
            console.log(`Column Count: ${columns.length}`);
            columns.forEach((col, idx) => {
                console.log(`[${idx}] ${col}`);
            });
        }
    }
} catch (err) {
    console.error('Error reading file:', err);
}
