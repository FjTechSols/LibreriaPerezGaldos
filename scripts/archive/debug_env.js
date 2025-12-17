
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const cwd = process.cwd();
console.log('CWD:', cwd);

const envPath = path.join(cwd, '.env');
console.log('Checking .env at:', envPath);

if (fs.existsSync(envPath)) {
  console.log('.env exists!');
  try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    // console.log('Content preview:', envContent.substring(0, 50));
    
    // Parse
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
    
    const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
    const key = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || env.SUPABASE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (url && key) {
        console.log('Keys found. Querying DB...');
        const supabase = createClient(url, key);
        const { data, error } = await supabase.from('libros').select('id').order('id', {ascending: false}).limit(1).single();
        if (error) console.error(error);
        else console.log('LAST_ID:', data?.id || 0);
    } else {
        console.log('Keys missing in .env');
        console.log('Keys found:', Object.keys(env));
    }

  } catch (e) {
    console.error('Error reading .env:', e);
  }
} else {
  console.log('.env DOES NOT EXIST at that path.');
  console.log('Listing files in CWD:');
  fs.readdirSync(cwd).forEach(f => {
      if (f.startsWith('.env')) console.log(f);
  });
}
