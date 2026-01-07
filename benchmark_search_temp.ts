
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.development') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function benchmark() {
  const term = 'Quijote'; // Common term
  const partialTerm = 'Quijo'; // Partial term

  console.log('--- Benchmarking Search Strategies ---');

  // 1. ILIKE %term%
  console.time('ILIKE %term%');
  const { data: ilikeData, error: ilikeError } = await supabase
    .from('libros')
    .select('id')
    .ilike('titulo', `%${term}%`)
    .limit(10);
  console.timeEnd('ILIKE %term%');
  if (ilikeError) console.error('ILIKE Error:', ilikeError.message);
  else console.log(`ILIKE found: ${ilikeData.length} records`);

  // 2. TextSearch (plain)
  console.time('TextSearch plain');
  const { data: tsData, error: tsError } = await supabase
    .from('libros')
    .select('id')
    .textSearch('titulo', term)
    .limit(10);
  console.timeEnd('TextSearch plain');
  if (tsError) console.error('TextSearch Error:', tsError.message);
  else console.log(`TextSearch found: ${tsData.length} records`);
  
   // 3. TextSearch (prefix)
  console.time('TextSearch prefix');
  const { data: tsPrefixData, error: tsPrefixError } = await supabase
    .from('libros')
    .select('id')
    .textSearch('titulo', `'${partialTerm}':*`)
    .limit(10);
  console.timeEnd('TextSearch prefix');
  if (tsPrefixError) console.error('TextSearch Prefix Error:', tsPrefixError.message);
  else console.log(`TextSearch Prefix found: ${tsPrefixData.length} records`);

}

benchmark();
