
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const inputFile = path.resolve(__dirname, '../files/Conjunta.txt');
const outputFile = path.resolve(__dirname, '../files/libros_convertidos_schema.json');

async function convertFile() {
    console.log('🚀 Iniciando conversión a esquema de BD...');
    
    const outputStream = fs.createWriteStream(outputFile, { encoding: 'utf8' });
    outputStream.write('[\n'); // Start JSON array

    const fileStream = fs.createReadStream(inputFile, { encoding: 'latin1' });
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    // Helper to determine location based on legacy_id
    const getLocation = (id) => {
        if (!id) return 'Desconocido';
        const cleanId = id.replace(/^"/, '').replace(/"$/, '').trim();
        
        // Check for Suffixes first
        if (cleanId.toUpperCase().endsWith('G')) return 'Galeon';

        // Check if pure numbers
        if (/^\d+$/.test(cleanId)) return 'Almacen';
        
        // Check Prefixes
        const firstLetter = cleanId.charAt(0).toUpperCase();
        switch (firstLetter) {
            case 'H': return 'Hortaleza';
            case 'R': return 'Reina';
            default: return 'Almacen2'; // Any other letter or prefix
        }
    };

    let isFirst = true;
    let count = 0;

    for await (const line of rl) {
        if (!line.trim()) continue;

        // Parse CSV/TSV logic
        let cols = line.split('\t').map(c => {
            let clean = c.trim();
            // Remove surrounding quotes
            if (clean.startsWith('"') && clean.endsWith('"')) {
                clean = clean.slice(1, -1);
            }
            // Fix double double-quotes
            return clean.replace(/""/g, '"').trim();
        });

        // Mapping Schema
        // 0: legacy_id
        // 1: titulo
        // 2: descripcion (Detailed description/Binding)
        // 3: ?? (often "NO", sometimes could be extra info)
        // 4: editorial (Name)
        // 5: anio
        // 6: autor
        // 7: ubicacion / ciudad (OLD) - Ignore for 'ubicacion' field per new req
        // 8: pais (OLD) - Ignore for 'ubicacion' field per new req
        // 9: precio
        // 10: paginas
        // 11: categoria (or maybe timestamp? inspecting logs showed empty mostly, but user asked to map it)
        // 12: stock

        const legacyId = cols[0] || null;

        const libroSchema = {
            legacy_id: legacyId,
            isbn: null, // No clear ISBN column identified yet, leaving null or assume it might be in notes
            titulo: cols[1] || 'Sin título',
            anio: parseInt(cols[5]) || null,
            paginas: parseInt(cols[10]) || 0,
            descripcion: cols[2] || '', 
            notas: '', 
            categoria_id: cols[11] || '', // User requested text mapping to this field for now.
            editorial_id: cols[4] || '', // User requested text mapping.
            precio: parseFloat(cols[9]) || 0,
            ubicacion: getLocation(legacyId), // New Logic
            stock: parseInt(cols[12]) || 0,
            activo: true,
            
            // Temporary/Extra fields
            autor: cols[6] || '',
            fecha_ingreso: new Date().toISOString(), // Defaulting to now
            imagen_url: ''
        };

        const jsonString = JSON.stringify(libroSchema, null, 2);
        
        if (!isFirst) {
            outputStream.write(',\n');
        }
        outputStream.write(jsonString);
        
        isFirst = false;
        count++;

        if (count % 5000 === 0) {
            process.stdout.write(`\rProcesados: ${count}`);
        }
    }

    outputStream.write('\n]'); // End JSON array
    outputStream.end();
    console.log(`\n\n✅ Conversión finalizada. Total: ${count} libros.`);
    console.log(`Archivo guardado en: ${outputFile}`);
}

convertFile();
