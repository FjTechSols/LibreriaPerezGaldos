import https from 'https';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if(k && v.length) acc[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const queryUrl = `${env.VITE_SUPABASE_URL}/rest/v1/settings?select=*`;

console.log("Fetching ALL Settings...");

https.get(queryUrl, {
  headers: {
    'apikey': env.VITE_SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY}`
  }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log("CLAVES:", json.map(j => j.key));
      const integ = json.find(j => j.key === 'integrations');
      if (integ) {
        console.log("minPrice:", integ.value?.abeBooks?.ftps?.minPrice);
      }
    } catch(e) { console.error(data); }
  });
}).on('error', console.error);
