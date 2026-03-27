import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../.env');

dotenv.config({ path: envPath });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
let functionUrl = process.env.SUPABASE_FUNCTION_URL;

if (!functionUrl && supabaseUrl) {
    functionUrl = `${supabaseUrl}/functions/v1/generate-abebooks-csv`;
}

console.log(`Target URL: ${functionUrl}`);

async function verifyLiveCSV(legacyId) {
    if (!functionUrl) {
        console.error('No Function URL found.');
        return;
    }

    try {
        const response = await fetch(functionUrl, {
            headers: {
                'Authorization': `Bearer ${supabaseKey}`
            }
        });

        if (!response.ok) {
            console.error(`Error: ${response.status}`);
            const text = await response.text();
            console.error(text);
            return;
        }

        console.log('Streaming response...');
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        
        let buffer = '';
        let found = false;
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            // Process complete lines
            let newlineIndex;
            while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
                const line = buffer.slice(0, newlineIndex);
                buffer = buffer.slice(newlineIndex + 1);
                
                if (line.includes(legacyId)) {
                    console.log('\n--- TARGET LINE FOUND ---');
                    const cols = line.split('\t');
                    const clean = (s) => s ? s.replace(/^"|"$/g, '') : '';
                    
                    const pages = clean(cols[10]);
                    const stock = clean(cols[11]);
                    
                    console.log(`Col 11 [Pages]: ${pages}`);
                    console.log(`Col 12 [Stock]: ${stock}`);
                    
                    if (pages === '1') {
                        console.log('RESULT: FAIL. Pages is "1". Code is likely OLD.');
                    } else if (pages === '164') {
                        console.log('RESULT: PASS. Pages is "164". Code is UPDATED.');
                    } else {
                        console.log(`RESULT: UNCERTAIN. Pages is "${pages}".`);
                    }
                    found = true;
                    // We can stop now
                    reader.cancel();
                    return; 
                }
            }
        }
        
        if (!found) {
            console.log('Line not found after full stream.');
        }

    } catch (error) {
        console.error('Script Error:', error);
    }
}

verifyLiveCSV('02285207');
