
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.development');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

const ubicaciones = [
  { nombre: 'Almacén', sufijo: '' },
  { nombre: 'Galeon', sufijo: 'G' },
  { nombre: 'Hortaleza', sufijo: 'H' },
  { nombre: 'Reina', sufijo: 'R' },
  { nombre: 'Abebooks', sufijo: 'Ab' },
  { nombre: 'General', sufijo: 'Gen' },
  { nombre: 'UniLiber', sufijo: 'UL' }
];

async function forecast() {
  console.log('--- PREVISIÓN DE CÓDIGOS LEGACY ---');
  console.log('| Ubicación | Último Encontrado | SIGUIENTE (Generado) |');
  console.log('|---|---|---|');

  for (const u of ubicaciones) {
    let query = supabase.from('libros').select('legacy_id');

    // Logic mirror from libroService.ts
    if (u.sufijo) {
      query = query.like('legacy_id', `%${u.sufijo}`);
    } else {
       query = query.like('legacy_id', '02%').lt('legacy_id', '02300000');
    }

    // Sort and limit
    query = query.order('legacy_id', { ascending: false }).limit(1);

    const { data } = await query;
    
    let lastCode = 'Ninguno';
    let nextCode = u.sufijo ? `1${u.sufijo}` : '02290000'; // Default fallbacks

    if (data && data.length > 0) {
       lastCode = data[0].legacy_id;
       
       const numbStr = lastCode.replace(/\D/g, '');
       const num = parseInt(numbStr, 10);
       
       if (!isNaN(num)) {
          const nextNum = num + 1;
          const padding = u.sufijo ? numbStr.length : 8; // Default 8 for Almacen if unknown, or keep existing length
          // For Almacen specifically, we usually want 8 digits '0229xxxx'
          // For others, we assume we keep the padding found.
          
          nextCode = `${nextNum.toString().padStart(numbStr.length, '0')}${u.sufijo}`;
       }
    }
    
    const resultObj = {
        location: u.nombre,
        lastCode: lastCode,
        nextCode: nextCode
    };
    results.push(resultObj);
  }
  
  fs.writeFileSync('forecast_results_v2.json', JSON.stringify(results, null, 2));
  console.log('Results written to forecast_results_v2.json');
}

const results = [];
forecast();
