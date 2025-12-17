
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.development');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function checkLegacy() {
  console.log('--- Hunting for highest numeric legacy_id (pure digits) ---');
  
  // Since we suspect high numbers (e.g. 1436891 is the ID), let's look for legacy_ids that start with digits
  // But legacy_id column likely has mixed alphanumeric.
  // Sort desc by legacy_id might show "V..." or "R..." first.
  // Let's try to fetch a chunk of IDs where legacy_id < 'A' to avoid letters?
  
  const { data, error } = await supabase
    .from('libros')
    .select('id, legacy_id')
    .not('legacy_id', 'is', null)
    .lt('legacy_id', 'A') // Filter out starting with letters? "100" < "A" in ASCII.
    .order('legacy_id', { ascending: false })
    .limit(50);

  if (error) {
     console.error(error);
  } else {
     const numeric = data.filter(b => /^\d+$/.test(b.legacy_id));
     console.log(`Found ${numeric.length} pure numeric legacy IDs in top results < 'A'.`);
     if (numeric.length > 0) {
         console.log('Top 5:');
         numeric.slice(0, 5).forEach(b => console.log(`LegacyID: ${b.legacy_id} (ID: ${b.id})`));
     } else {
         console.log('Top results were:', data.slice(0,5).map(b => b.legacy_id));
     }
  }
}

checkLegacy();
