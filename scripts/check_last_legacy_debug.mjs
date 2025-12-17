
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.development');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function checkLegacy() {
  // Strategy 1: Last created books (most likely to have the "last" code in a sequence)
  console.log('--- Checking last 50 created books and their legacy_ids ---');
  const { data: latest, error: errLatest } = await supabase
    .from('libros')
    .select('id, legacy_id, created_at, ubicacion')
    .order('created_at', { ascending: false })
    .limit(50);

  if (errLatest) console.error(errLatest);
  else {
    latest.forEach(b => {
        if (b.legacy_id) console.log(`Created: ${b.created_at} | LegacyID: ${b.legacy_id} | Loc: ${b.ubicacion}`);
    });
  }

  // Strategy 2: Order by legacy_id desc
  console.log('\n--- Checking highest legacy_id (raw string sort) ---');
  const { data: highest, error: errHigh } = await supabase
    .from('libros')
    .select('id, legacy_id')
    .not('legacy_id', 'is', null)
    // Filter out rows starting with 'G', 'H', 'R' to try to find numeric ones?
    // Regex filtering in Supabase is hard. Let's just fetch more.
    .order('legacy_id', { ascending: false })
    .limit(20);

  if (errHigh) console.error(errHigh);
  else {
    highest.forEach(b => console.log(`LegacyID: ${b.legacy_id}`));
  }
}

checkLegacy();
