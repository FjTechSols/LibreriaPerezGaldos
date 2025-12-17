
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Using URL:', supabaseUrl ? 'Found' : 'Missing');
console.log('Using Key:', supabaseKey ? 'Found' : 'Missing');

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Could not find Supabase credentials. Checked VITE_SUPABASE_URL, SUPABASE_URL, etc.');
  // Debug: list env keys
  console.log('Available Env Keys:', Object.keys(process.env).filter(k => k.toLowerCase().includes('supabase')));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getLastId() {
  const { data, error } = await supabase
    .from('libros')
    .select('id')
    .order('id', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching last book:', error);
    return;
  }

  if (data) {
    console.log(`LAST_ID: ${data.id}`);
  } else {
    console.log('LAST_ID: 0');
  }
}

getLastId();
