
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Adjust path to reach scripts/files/Conjunta.txt
const filePath = path.resolve(__dirname, '../files/Conjunta.txt');

console.log('Reading file:', filePath);

try {
    const buffer = fs.readFileSync(filePath);
    // Decode as latin1 to fix "damaged" characters
    const content = buffer.toString('latin1');
    
    const lines = content.split('\n').filter(l => l.trim().length > 0).slice(0, 5);

    lines.forEach((line, index) => {
        console.log(`\n--- Line ${index + 1} ---`);
        console.log('Raw:', line);
        
        // Attempt TSV split (handling quotes optionally)
        // Simple regex for quoted or unquoted TSV
        const values = line.split('\t').map(v => v.trim().replace(/^"|"$/g, ''));
        
        values.forEach((v, i) => {
            console.log(`Col ${i}: ${v}`);
        });
    });

} catch (error) {
    console.error('Error reading file:', error);
}
