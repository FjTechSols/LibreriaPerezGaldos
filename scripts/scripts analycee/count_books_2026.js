import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load .env from root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../.env');

dotenv.config({ path: envPath });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase environment variables in .env');
  console.log('URL:', supabaseUrl ? 'Found' : 'Missing');
  console.log('KEY:', supabaseKey ? 'Found' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function countBooks() {
  console.log('Querying books with anio = 2026...');
  
  const { count, error } = await supabase
    .from('libros')
    .select('*', { count: 'exact', head: true })
    .eq('anio', 2026);

  if (error) {
    console.error('Error counting books:', error);
    return;
  }

  console.log(`\n----------------------------`);
  console.log(`Books published in 2026: ${count}`);
  console.log(`----------------------------`);
  
  // Data log removed as we are running head:true
}

countBooks();
