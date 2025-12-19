
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.development') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function debugSingleBook() {
  const targetRef = 'HE000379'; // Example form report
  console.log(`Checking status of ${targetRef}...`);

  const { data, error } = await supabase
    .from('libros')
    .select('*')
    .eq('legacy_id', targetRef);

  if (error) console.error(error);
  console.log("Current State:", data);

  // Attempt manual Move
  console.log("Attempting manual move to General...");
  const { error: moveError } = await supabase
    .from('libros')
    .update({ ubicacion: 'General' })
    .eq('legacy_id', targetRef);

  if (moveError) console.error("Move Error:", moveError);
  else console.log("Manual move success.");
  
  // Verify again
  const { data: data2 } = await supabase
    .from('libros')
    .select('*')
    .eq('legacy_id', targetRef);
  console.log("New State:", data2);
}

debugSingleBook();
