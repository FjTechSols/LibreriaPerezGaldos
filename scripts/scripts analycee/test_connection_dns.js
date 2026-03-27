import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import dns from 'dns';

// SET CUSTOM DNS
try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
    console.log('DNS servers set to Google Public DNS (8.8.8.8)');
} catch (e) {
    console.error('Failed to set DNS servers:', e.message);
}

// Polyfill for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env
const envPath = resolve(__dirname, '../.env');
const result = dotenv.config({ path: envPath });

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

console.log(`Target URL: ${url}`);

// Test DNS/Network
console.log('\n--- Network Check with Custom DNS ---');
try {
  console.log(`Pinging Supabase URL...`);
  const response = await fetch(`${url}/rest/v1/`, { 
     method: 'HEAD',
     headers: {
         'apikey': key,
         'Authorization': `Bearer ${key}`
     }
  }); 
  console.log(`Status: ${response.status} ${response.statusText}`);
  console.log('Connection Successful!');
} catch (error) {
  console.error('Connection Failed:', error.message);
  if (error.cause) console.error('Cause:', error.cause);
}
