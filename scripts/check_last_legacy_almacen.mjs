
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.development');
if (!fs.existsSync(envPath)) {
  console.log('Error: .env.development not found');
  process.exit(1);
}

const envConfig = dotenv.parse(fs.readFileSync(envPath));
const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function checkLegacy() {
  // Strategy 1: Last created books (most likely to have the "last" code in a sequence)
  console.log('--- Checking last 20 created books ---');
  const { data: latest, error: errLatest } = await supabase
    .from('libros')
    .select('id, legacy_id, created_at, ubicacion')
    .order('created_at', { ascending: false })
    .limit(50);

  if (errLatest) console.error(errLatest);
  else {
    const almacenLatest = latest.filter(b => b.legacy_id && /^\d+$/.test(b.legacy_id));
    console.log(`Found ${almacenLatest.length} numeric legacy_ids in last 50 created.`);
    if (almacenLatest.length > 0) {
      console.log('Most recent numeric legacy_id:', almacenLatest[0].legacy_id);
    }
  }

  // Strategy 2: Order by legacy_id desc (might give high numbers mixed with other strings)
  console.log('\n--- Checking highest legacy_id (lexical sort) ---');
  const { data: highest, error: errHigh } = await supabase
    .from('libros')
    .select('id, legacy_id')
    .not('legacy_id', 'is', null)
    .order('legacy_id', { ascending: false })
    .limit(50);

  if (errHigh) console.error(errHigh);
  else {
    // Filter for purely numeric
    const numeric = highest.filter(b => /^\d+$/.test(b.legacy_id));
    console.log('Highest numeric legacy_ids found (lexicographical top):');
    numeric.slice(0, 5).forEach(b => console.log(`- ${b.legacy_id} (ID: ${b.id})`));
  }
}

checkLegacy();
