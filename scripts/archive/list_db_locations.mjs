
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.development');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function listLocations() {
  console.log('--- DB LOCATIONS ---');
  const { data, error } = await supabase.from('ubicaciones').select('*');
  if (error) console.error(error);
  else console.table(data);
}

listLocations();
