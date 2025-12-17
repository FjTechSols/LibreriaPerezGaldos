
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.development');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function checkLegacy() {
  // Just get the top 10 legacy_ids order by legacy_id desc
  const { data, error } = await supabase
    .from('libros')
    .select('id, legacy_id')
    .not('legacy_id', 'is', null) // filter nulls
    .order('legacy_id', { ascending: false })
    .limit(100);

  if (error) {
     console.error(error); 
     return;
  }
  
  // Filter for numeric only in JS
  const numeric = data.filter(b => /^\d+$/.test(b.legacy_id));

  console.log('--- Top 5 Numeric Legacy IDs ---');
  numeric.slice(0, 5).forEach(b => console.log(`LegacyID: ${b.legacy_id} (ID: ${b.id})`));
}

checkLegacy();
