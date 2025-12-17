
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.development');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function checkLegacy() {
  const target = '02292865';
  console.log(`--- Checking for existence of ${target} ---`);
  
  const { data: specific, error: errSpecific } = await supabase
    .from('libros')
    .select('id, legacy_id, created_at')
    .eq('legacy_id', target)
    .maybeSingle(); // distinct per legacy_id generally
    
  if (errSpecific) console.error(errSpecific);
  else if (specific) {
      console.log('FOUND:', specific);
  } else {
      console.log('NOT FOUND. Checking highest in that range again with higher limit...');
      
      const { data: zeros } = await supabase
        .from('libros')
        .select('id, legacy_id')
        .like('legacy_id', '022928%')
        .order('legacy_id', { ascending: false })
        .limit(5);
        
      if (zeros) zeros.forEach(b => console.log(`LegacyID: ${b.legacy_id}`));
  }
}

checkLegacy();
