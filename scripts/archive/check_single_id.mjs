
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

let envConfig = dotenv.config({ path: path.join(rootDir, '.env') });
if (envConfig.error) {
  envConfig = dotenv.config({ path: path.join(rootDir, '.env.development') });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkId() {
  const idToCheck = 533822;
  const { data, error } = await supabase
    .from('libros')
    .select('id')
    .eq('id', idToCheck);
    
  if (error) {
      console.error('Error:', error);
  } else {
      if (data.length > 0) {
          console.log(`ID ${idToCheck} EXISTS in database.`);
      } else {
          console.log(`ID ${idToCheck} does NOT exist (was likely deleted).`);
      }
  }
}

checkId();
