
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filePath = path.resolve(__dirname, '../files/Conjunta.txt');

console.log(`Counting lines in ${filePath}...`);
let count = 0;
fs.createReadStream(filePath)
    .on('data', chunk => {
        for (let i = 0; i < chunk.length; ++i) if (chunk[i] === 10) count++;
    })
    .on('end', () => console.log(`Total source lines: ${count}`))
    .on('error', err => console.error(err));
