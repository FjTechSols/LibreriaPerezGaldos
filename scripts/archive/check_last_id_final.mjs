
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.development');
if (!fs.existsSync(envPath)) {
  console.log('Error: .env.development not found at', envPath);
  process.exit(1);
}

const envConfig = dotenv.parse(fs.readFileSync(envPath));
const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

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
  console.log(`LAST_ID: ${data?.id || 0}`);
}

getLastId();
