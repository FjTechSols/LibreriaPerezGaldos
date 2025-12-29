
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
    console.log('Attempting to insert 02292927...');
    
    // Payload from last line of file:
    // {"legacy_id":"02292927","titulo":"Política para corregidores y señores","descripcion":"","editorial":"Instituto de Estudios de Administración Local","anio":"1987","autor":"Castillo de Bobadilla, Jerónimo","precio":75,"ubicacion":"almacen","stock":2,"isbn":""}
    
    const payload = {
        legacy_id: "02292927",
        titulo: "Política para corregidores y señores",
        descripcion: "",
        editorial_id: null, // Will need relation mapping if strict, but testing basic insert
        categoria_id: null, 
        anio: "1987",
        autor: "Castillo de Bobadilla, Jerónimo",
        precio: 75,
        stock: 2,
        ubicacion: "almacen",
        isbn: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase.from('libros').insert(payload).select();

    if (error) {
        console.error('INSERT FAILED:', JSON.stringify(error, null, 2));
    } else {
        console.log('INSERT SUCCESS:', data);
    }
}

debugInsert();
