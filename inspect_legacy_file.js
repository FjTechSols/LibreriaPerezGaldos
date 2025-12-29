
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'scripts/files/libros1.txt');

try {
  // Read as latin1 to handle accents
  const content = fs.readFileSync(filePath, 'latin1');
  const lines = content.replace(/\r\n/g, '\n').split('\n').filter(l => l.trim().length > 0);
  
  console.log(`Total lines: ${lines.length}`);
  
  console.log('--- Column Mapping (First Record) ---');
  if (lines.length > 0) {
      const columns = lines[0].split('\t');
      columns.forEach((col, index) => {
          console.log(`[${index}] ${col.trim()}`);
      });
  }

} catch (err) {
  console.error('Error reading file:', err);
}
