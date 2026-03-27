import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filePath = path.join(__dirname, 'files', 'PurgePerezGaldosAbe.txt');

try {
    const content = fs.readFileSync(filePath, 'latin1');
    const lines = content.split(/\r?\n/);
    
    // User said line 3712. Arrays are 0-indexed. 
    // Usually editors show 1-indexed. Let's look at 3711, 3712, 3713.
    
    const targetIndex = 3712 - 1; 
    
    for (let i = targetIndex - 2; i <= targetIndex + 2; i++) {
        if (lines[i]) {
            const cols = lines[i].split('\t');
            console.log(`\n--- Line ${i + 1} ---`);
            // console.log(lines[i]);
            console.log(`Col count: ${cols.length}`);
            cols.forEach((c, idx) => console.log(`[${idx}] ${c}`));
        }
    }

} catch (e) {
    console.error(e);
}
