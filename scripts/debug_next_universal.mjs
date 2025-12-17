
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.development');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

const obtenerSufijo = (ubicacion) => {
  const normalizada = ubicacion.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  switch (normalizada) {
    case 'almacen': return '';
    case 'galeon': return 'G';
    case 'hortaleza': return 'H';
    case 'reina': return 'R';
    case 'abebooks': return 'Ab';
    default: return ''; 
  }
};

async function simulateNextCode(ubicacion) {
  const sufijo = obtenerSufijo(ubicacion);
  console.log(`\n--- Simulating for "${ubicacion}" (Suffix: "${sufijo}") ---`);

  // 1. Query
  let query = supabase.from('libros').select('legacy_id').order('legacy_id', { ascending: false }).limit(5);

  if (sufijo) {
    query = query.like('legacy_id', `%${sufijo}`);
  } else {
     query = query.like('legacy_id', '02%').lt('legacy_id', '02800000');
  }

  const { data, error } = await query;
  
  if (data && data.length > 0) {
      console.log('Top match found:', data[0].legacy_id);
      
      const lastCode = data[0].legacy_id;
      const numbStr = lastCode.replace(/\D/g, ''); 
      const num = parseInt(numbStr, 10);
      
      console.log('Extracted Number:', num);

      const nextNum = num + 1;
      const nextCode = `${nextNum.toString().padStart(numbStr.length, '0')}${sufijo}`;
      console.log('Generated Next:', nextCode);
  } else {
      console.log('No matches found. Fallback would be used.');
  }
}

async function run() {
    await simulateNextCode('Galeon');
    await simulateNextCode('Hortaleza');
}

run();
