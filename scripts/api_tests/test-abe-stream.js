import https from 'https';
import fs from 'fs';
import readline from 'readline';

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if(k && v.length) acc[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const fnUrl = `${env.VITE_SUPABASE_URL}/functions/v1/generate-abebooks-csv`;
const outPath = 'scripts/api_tests/out.txt';

console.log("Downloading to:", outPath);

https.get(fnUrl, {
  headers: { 'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY}` }
}, (res) => {
  if (res.statusCode !== 200) {
    console.error("HTTP error:", res.statusCode);
  }
  const file = fs.createWriteStream(outPath);
  res.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log("Download complete. Searching...");
    const rl = readline.createInterface({
      input: fs.createReadStream(outPath),
      crlfDelay: Infinity
    });
    rl.on('line', (line) => {
      if (line.includes('02293659') || line.includes('02293656')) {
        console.log("ENCONTRADO =>", line);
      }
    });
  });
}).on('error', console.error);
