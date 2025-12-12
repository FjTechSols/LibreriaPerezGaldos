
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.development');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function checkFeatured() {
  const { count, error } = await supabase
    .from('libros')
    .select('*', { count: 'exact', head: true })
    .eq('destacado', true)
    .eq('activo', true);

  if (error) console.error(error);
  else console.log(`Total featured (active) books: ${count}`);

  const { data } = await supabase
    .from('libros')
    .select('titulo, autor')
    .eq('destacado', true)
    .eq('activo', true)
    .limit(5);

  if (data && data.length > 0) {
    console.log('Sample featured books:', data);
  } else {
    console.log('No featured books found.');
  }
}

checkFeatured();
