
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FILE_1 = path.join(__dirname, 'scripts/files/libros_normalizados_final.jsonl');
const FILE_2 = path.join(__dirname, 'scripts/files/libros1_normalizados_final.jsonl');
const OUTPUT_FILE = path.join(__dirname, 'scripts/files/libros_compilado_final.jsonl');

async function processFile(filePath, bookMap, stats) {
    console.log(`Processing ${path.basename(filePath)}...`);
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        if (!line.trim()) continue;
        try {
            const book = JSON.parse(line);
            if (book.legacy_id) {
                if (bookMap.has(book.legacy_id)) {
                    stats.duplicates++;
                }
                // Last write wins (or we could keep first). 
                // Using set() updates the entry, so acceptable for 'latest' version.
                bookMap.set(book.legacy_id, book);
                stats.totalRead++;
            }
        } catch (e) {
            console.error(`Error parsing line in ${path.basename(filePath)}:`, e.message);
            stats.errors++;
        }
    }
}

async function merge() {
    const bookMap = new Map();
    const stats = { totalRead: 0, duplicates: 0, errors: 0 };

    console.time('Merge');
    
    if (fs.existsSync(FILE_1)) {
        await processFile(FILE_1, bookMap, stats);
    } else {
        console.error(`File 1 not found: ${FILE_1}`);
    }

    if (fs.existsSync(FILE_2)) {
        await processFile(FILE_2, bookMap, stats);
    } else {
         console.error(`File 2 not found: ${FILE_2}`);
    }

    console.log(`Writing output to ${path.basename(OUTPUT_FILE)}...`);
    const outputStream = fs.createWriteStream(OUTPUT_FILE, { encoding: 'utf8' });
    
    let written = 0;
    for (const book of bookMap.values()) {
        outputStream.write(JSON.stringify(book) + '\n');
        written++;
    }
    outputStream.end();

    console.timeEnd('Merge');
    console.log('--- Merge Statistics ---');
    console.log(`Total Records Read: ${stats.totalRead}`);
    console.log(`Duplicates Handled (Overwritten): ${stats.duplicates}`);
    console.log(`Parse Errors: ${stats.errors}`);
    console.log(`Final Unique Records: ${written}`);
}

merge().catch(console.error);
