import https from 'https';
import fs from 'fs';

// Lee de un .env rudimentario
const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if(k && v.length) acc[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const fnUrl = `${env.VITE_SUPABASE_URL}/functions/v1/generate-abebooks-csv`;
console.log("Fetching:", fnUrl);

https.get(fnUrl, {
  headers: { 'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY}` }
}, (res) => {
  if (res.statusCode !== 200) {
    console.log("Error:", res.statusCode);
    return;
  }
  let txt = '';
  res.on('data', d => txt += d);
  res.on('end', () => {
    const lines = txt.split('\n');
    console.log("Total líneas recibidas:", lines.length);
    const m1 = lines.find(l => l.includes('02293659'));
    const m2 = lines.find(l => l.includes('02293656'));
    if (m1) console.log("02293659 =>", m1); else console.log("No está 02293659");
    if (m2) console.log("02293656 =>", m2); else console.log("No está 02293656");
  });
}).on('error', console.error);
