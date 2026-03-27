import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if(k && v.length) acc[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.from('settings').select('*');
  console.log("Settings rows:", data?.length);
  if (data) {
     for (const row of data) {
         console.log(`Key: ${row.key}`);
         if (row.key === 'integrations') {
             console.log(JSON.stringify(row.value?.abeBooks?.ftps, null, 2));
         }
     }
  }
}
test();
