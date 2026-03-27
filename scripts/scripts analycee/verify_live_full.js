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

async function verifyFullStream() {
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
            return;
        }

        console.log('Streaming response for full count...');
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        
        let buffer = '';
        let lineCount = 0;
        let lastLine = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            let newlineIndex;
            while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
                const line = buffer.slice(0, newlineIndex).trim();
                buffer = buffer.slice(newlineIndex + 1);
                
                if (line) {
                    lineCount++;
                    lastLine = line; // Keep track of last valid line
                }
            }
        }
        
        // Handle last chunk
        if (buffer.trim()) {
            lineCount++;
            lastLine = buffer.trim();
        }

        console.log(`Total Rows Received: ${lineCount}`);
        
        // Inspect Last Line to see if it looks truncated or valid
        if (lastLine) {
            console.log('--- LAST LINE ---');
            console.log(lastLine);
            const cols = lastLine.split('\t');
            console.log(`Columns: ${cols.length}`);
            console.log(`SKU: ${cols[0]}`);
        }

    } catch (error) {
        console.error('Script Error:', error);
    }
}

verifyFullStream();
