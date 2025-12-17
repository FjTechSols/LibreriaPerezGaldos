
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.development');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

const locations = [
  'Abebooks',
  'Almacén', // Check with accent
  'almacen', // Check lower
  'Galeon',
  'General',
  'Hortaleza',
  'Reina',
  'Almacén General'
];

async function checkAllLocations() {
  console.log('--- STATUS REPORT BY LOCATION ---');
  
  for (const loc of locations) {
    // Normalizar para búsqueda si es necesario, pero buscaremos por string exacto de ubicación en columna 'ubicacion'
    // OJO: La columna 'ubicacion' puede tener variaciones.
    
    // Primero buscar por la ubicación exacta
    const { data, error } = await supabase
      .from('libros')
      .select('legacy_id, ubicacion')
      .eq('ubicacion', loc)
      .not('legacy_id', 'is', null)
      .order('legacy_id', { ascending: false })
      .limit(3);

    if (error) {
       console.error(`Error checking ${loc}:`, error.message);
       continue;
    }
    
    if (data.length > 0) {
        console.log(`\nLocation: "${loc}"`);
        data.forEach(b => console.log(`   - Code: ${b.legacy_id}`));
    } else {
        console.log(`\nLocation: "${loc}" - NO BOOKS FOUND / NO CODES`);
    }
  }
}

checkAllLocations();
