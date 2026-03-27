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

async function inspectBreakPoint() {
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
        let lineCount = 0;
        const targetRow = 82336;
        const windowSize = 10; // Show 10 rows before and after
        
        console.log(`Scanning for rows ${targetRow - windowSize} to ${targetRow + windowSize}...`);

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
                    
                    if (lineCount >= targetRow - windowSize && lineCount <= targetRow + windowSize) {
                        console.log(`\n[Row ${lineCount}]`);
                        console.log(line);
                        // Check for suspicious chars
                        if (line.includes('\t\t') || line.split('\t').length !== 13) {
                            console.warn('^^^ SUSPICIOUS ROW FORMAT ^^^');
                        }
                    }

                    if (lineCount > targetRow + windowSize) {
                        reader.cancel();
                        return;
                    }
                }
            }
        }

    } catch (error) {
        console.error('Script Error:', error);
    }
}

inspectBreakPoint();
