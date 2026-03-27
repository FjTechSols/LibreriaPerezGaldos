import fs from 'fs';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const inventoryPath = resolve(__dirname, '../debug_inventory.txt');

async function countBooks() {
  const fileStream = fs.createReadStream(inventoryPath);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let count = 0;
  let headerFound = false;
  let linesProcessed = 0;
  const matches = [];

  console.log('Reading inventory from:', inventoryPath);

  for await (const line of rl) {
    if (!headerFound) {
      // Check if it's the header line
      if (line.includes('"Codigo"\t"Titulo"')) {
        headerFound = true;
      }
      continue;
    }

    linesProcessed++;
    
    // Split by tab. The file seems to use tabs based on the 'view_file' output
    // Note: The values are quoted: "02180346"	"Lo Mejor de Ernesto Sabato" ...
    
    const columns = line.split('\t');
    if (columns.length < 6) continue;

    // "Ano" is the 6th column (index 5)
    let yearRaw = columns[5];
    
    // Clean quotes
    const year = yearRaw ? yearRaw.replace(/^"|"$/g, '').trim() : '';
    
    // Check if 2026
    if (year === '2026') {
      count++;
      
      // Extract title (index 1)
      let title = columns[1] ? columns[1].replace(/^"|"$/g, '') : 'Unknown Title';
      matches.push(title);
    }
  }

  const output = [
    `Total lines processed: ${linesProcessed}`,
    `Books published in 2026: ${count}`,
    `----------------------------`,
    `First 10 titles found:`,
    ...matches.slice(0, 10).map(t => `- ${t}`),
    matches.length > 10 ? `... and ${matches.length - 10} more.` : ''
  ].join('\n');

  console.log(output);
  fs.writeFileSync(resolve(__dirname, '../final_count.txt'), output, 'utf8');
}

countBooks().catch(err => console.error(err));
