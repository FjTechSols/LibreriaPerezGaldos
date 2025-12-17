
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.development');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function checkLocationPatterns() {
  console.log('--- Checking Codes with Suffix "G" (Galeon?) ---');
  const { data: catG } = await supabase
    .from('libros')
    .select('legacy_id, ubicacion')
    .like('legacy_id', '%G')
    .order('legacy_id', { ascending: false })
    .limit(5);
  console.table(catG);

  console.log('\n--- Checking Codes with Suffix "R" (Reina?) ---');
  const { data: catR } = await supabase
    .from('libros')
    .select('legacy_id, ubicacion')
    .like('legacy_id', '%R')
    .order('legacy_id', { ascending: false })
    .limit(5);
  console.table(catR);
  
    console.log('\n--- Checking Codes with Suffix "T" (Tetuán?) or others? ---');
    // Just blindly checking active books detecting suffixes
    const { data: random } = await supabase
    .from('libros')
    .select('legacy_id, ubicacion')
    .not('legacy_id', 'is', null)
    .limit(20);
    // Manually inspect output
    console.log(random.map(b => `${b.legacy_id} (${b.ubicacion})`).join('\n'));
}

checkLocationPatterns();
