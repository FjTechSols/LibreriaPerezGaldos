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

async function findRow() {
    const targetSku = "02283425"; // SKU from screenshot

    try {
        const response = await fetch(functionUrl, {
            headers: { 'Authorization': `Bearer ${supabaseKey}` }
        });

        if (!response.ok) {
            console.error(`Error: ${response.status}`);
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        
        let buffer = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            let newlineIndex;
            while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
                const line = buffer.slice(0, newlineIndex).trim();
                buffer = buffer.slice(newlineIndex + 1);
                
                if (line.includes(targetSku)) {
                    console.log('--- FOUND ROW ---');
                    console.log(line);
                    const cols = line.split('\t');
                    console.log(`\nCol Count: ${cols.length}`);
                    console.log(`Col 1 (SKU): ${cols[0]}`);
                    console.log(`Col 10 (Price): ${cols[9]}`);
                    console.log(`Col 11 (Pages): ${cols[10]}`);
                    console.log(`Col 12 (Empty): ${cols[11]}`);
                    console.log(`Col 13 (ISBN): ${cols[12]}`);
                    
                    reader.cancel();
                    return;
                }
            }
        }
        console.log('Row not found in stream.');

    } catch (error) {
        console.error('Script Error:', error);
    }
}

findRow();
