
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env.production') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function debugInsert() {
    console.log('Attempting to insert N0001026...');
    
    // Exact payload derived from row 0 of libros_compilado_final.jsonl
    const payload = {
        legacy_id: "N0001026",
        titulo: "EN BUSCA DEL GRAN KAN",
        descripcion: "Colección \"Obra de V. Blasco Ibañez\" con el nº 16. Cartoné con sobrecubierta. Firma anterior propietario. Impecable.",
        autor: "Vicente Blasco Ibañez",
        // editorial_id and categoria_id removed for testing
        anio: "1978", // Correct column name
        precio: 12.00,
        stock: 1,
        ubicacion: "almacen",
        isbn: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    // Explicitly define columns to match what script does? No, script passes object keys.
    const { data, error } = await supabase.from('libros').insert(payload).select();

    if (error) {
        console.error('INSERT FAILED:', JSON.stringify(error, null, 2));
    } else {
        console.log('INSERT SUCCESS:', data);
    }
}

debugInsert();
