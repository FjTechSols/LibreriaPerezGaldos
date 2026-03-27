import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if(k && v.length) acc[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

async function test() {
  console.log("Testeando Edge Function logic:");
  const { data: settingsData, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'integrations')
    .single();
    
  let minPrice = 12; // Fallback
  console.log("Settings devueltos:", settingsData ? "SI" : "NO", error || "");
  if (settingsData?.value?.abeBooks?.ftps?.minPrice) {
    minPrice = Number(settingsData.value.abeBooks.ftps.minPrice);
    console.log("minPrice configurado:", minPrice);
  } else {
    console.log("No se pudo leer minPrice, usando fallback:", minPrice);
  }
}
test();
