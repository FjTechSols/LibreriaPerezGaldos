import https from 'https';
import fs from 'fs';

// Lee de un .env rudimentario
const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if(k && v.length) acc[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const queryUrl = `${env.VITE_SUPABASE_URL}/rest/v1/libros?legacy_id=in.(02293659,02293656)&select=legacy_id,titulo,precio,stock`;

console.log("Fetching DB info for the two books:", queryUrl);

https.get(queryUrl, {
  headers: {
    'apikey': env.VITE_SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY}`
  }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    console.log("Respuesta BD:", data);
  });
}).on('error', console.error);
