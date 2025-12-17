
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

try {
  // Read .env.development
  console.log('Reading .env.development...');
  const envContent = fs.readFileSync('.env.development', 'utf-8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  });

  console.log('Keys found:', Object.keys(env));

  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const supabaseKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || env.SUPABASE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('Failed to find standard Supabase keys in .env.development');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  async function getLastId() {
    console.log('Querying Supabase...');
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
} catch (err) {
  console.error('Script error:', err);
}
