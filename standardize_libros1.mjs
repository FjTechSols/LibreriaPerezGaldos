
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE = path.join(__dirname, 'scripts/files/libros1.txt');
const OUTPUT_FILE = path.join(__dirname, 'scripts/files/libros1_normalizados_final.jsonl');

function standardize() {
    try {
        console.log(`Reading from: ${INPUT_FILE}`);
        const content = fs.readFileSync(INPUT_FILE, 'latin1');
        const lines = content.replace(/\r\n/g, '\n').split('\n').filter(l => l.trim().length > 0);

        console.log(`Total lines found: ${lines.length}`);
        
        const outputStream = fs.createWriteStream(OUTPUT_FILE, { encoding: 'utf8' });
        
        let processed = 0;
        let errors = 0;

        lines.forEach((line, index) => {
            const cols = line.split('\t').map(c => c.trim());
            
            // Basic validation: ensure we have at least an ID
            if (!cols[0]) {
                console.warn(`Skipping line ${index + 1}: No ID found`);
                errors++;
                return;
            }

            const book = {
                legacy_id: cols[0],
                titulo: cols[1] || '',
                descripcion: cols[2] || '',
                editorial: cols[4] || '',
                anio: cols[5] || '',
                autor: cols[6] || '',
                precio: parseFloat(cols[9].replace(',', '.')) || 0,
                ubicacion: cols[15] || 'Almacen',
                stock: parseInt(cols[16]) || 0,
                isbn: cols[17] || ''
            };

            outputStream.write(JSON.stringify(book) + '\n');
            processed++;
        });

        outputStream.end();
        console.log(`Optimization complete.`);
        console.log(`Processed: ${processed}`);
        console.log(`Errors/Skipped: ${errors}`);
        console.log(`Output written to: ${OUTPUT_FILE}`);

    } catch (error) {
        console.error('Error during standardization:', error);
    }
}

standardize();
