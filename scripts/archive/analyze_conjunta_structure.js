
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../files/Conjunta.txt');

// Read first 2000 chars as latin1
const buffer = fs.readFileSync(filePath);
const content = buffer.toString('latin1', 0, 2000);

console.log('--- SAMPLE CONTENT (Latin1 Decoded) ---');
console.log(content);
console.log('--- END SAMPLE ---');
