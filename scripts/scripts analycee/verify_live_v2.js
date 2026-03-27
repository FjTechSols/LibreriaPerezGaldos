// scripts/verify_live_v2.js
const https = require('https');
const fs = require('fs');
const path = require('path');

// Manual .env parsing because we want zero dependencies if possible, 
// or assume we run with node -r dotenv/config if we had it.
// But let's just parse it manually to be safe and robust.
const envPath = path.resolve(__dirname, '../.env');
let env = {};
try {
    const data = fs.readFileSync(envPath, 'utf8');
    data.split('\n').forEach(line => {
        const [key, ...val] = line.split('=');
        if (key && val) env[key.trim()] = val.join('=').trim().replace(/^["']|["']$/g, '');
    });
} catch (e) {
    console.log('No .env found or error reading it');
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
const functionUrlEnv = process.env.SUPABASE_FUNCTION_URL || env.SUPABASE_FUNCTION_URL;

async function verifyLiveCSV(legacyId) {
    console.log(`Verifying live CSV for legacy_id: ${legacyId}`);
    
    let functionUrl = functionUrlEnv;
    if (!functionUrl) {
         if (supabaseUrl) {
            functionUrl = `${supabaseUrl}/functions/v1/generate-abebooks-csv`;
         } else {
             console.error('Missing URL configuration');
             return;
         }
    } else {
        if (!functionUrl.includes('generate-abebooks-csv')) {
             functionUrl = functionUrl.replace(/\/$/, '') + '/generate-abebooks-csv';
        }
    }
    
    console.log(`Target URL: ${functionUrl}`);

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

        const text = await response.text();
        console.log(`Downloaded ${text.length} chars.`);
        
        const lines = text.split('\n');
        const targetLine = lines.find(line => line.includes(legacyId));
        
        if (targetLine) {
            console.log('\n--- TARGET LINE ---');
            console.log(targetLine);
            const cols = targetLine.split('\t');
            
            const clean = (s) => s ? s.replace(/^"|"$/g, '') : '';
            
            const pages = clean(cols[10]);
            const stock = clean(cols[11]);
            const isbn = clean(cols[12]);

            console.log(`\nCol 11 [Pages]: ${pages}`);
            console.log(`Col 12 [Stock]: ${stock}`);
            console.log(`Col 13 [ISBN]: ${isbn}`);
            
            if (pages === '1') {
                console.log('RESULT: FAIL. Pages is "1". Code is likely OLD.');
            } else if (pages === '164') {
                console.log('RESULT: PASS. Pages is "164". Code is UPDATED.');
            } else {
                console.log(`RESULT: UNCERTAIN. Pages is "${pages}".`);
            }
            
        } else {
            console.log('Line not found.');
        }

    } catch (error) {
        console.error('Script Error:', error);
    }
}

verifyLiveCSV('02285207');
