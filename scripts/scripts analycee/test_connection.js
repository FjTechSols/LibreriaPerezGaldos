import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Polyfill for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env
const envPath = resolve(__dirname, '../.env');
console.log(`Loading .env from: ${envPath}`);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('Error loading .env:', result.error);
}

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

console.log('--- Environment Check ---');
console.log('SUPABASE_URL:', url ? url : 'MISSING');
console.log('SUPABASE_KEY:', key ? `${key.substring(0, 10)}...` : 'MISSING');

// Test DNS/Network
console.log('\n--- Network Check ---');
try {
  console.log(`Pinging Supabase URL: ${url}...`);
  const response = await fetch(`${url}/rest/v1/`, { // Health check endpoint usually (or just root)
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
