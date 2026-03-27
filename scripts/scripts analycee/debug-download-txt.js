import https from 'https';
import fs from 'fs';
import path from 'path';
// import 'dotenv/config'; // Using --env-file

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_FUNCTION_URL = process.env.VITE_SUPABASE_FUNCTION_URL || process.env.SUPABASE_FUNCTION_URL || (SUPABASE_URL ? `${SUPABASE_URL}/functions/v1` : null);
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_FUNCTION_URL || !SUPABASE_KEY) {
    console.error("❌ Missing SUPABASE env vars (URL or KEY). Use --env-file=.env");
    console.error(`Debug: URL=${SUPABASE_URL}, FUNC=${SUPABASE_FUNCTION_URL}, KEY=${!!SUPABASE_KEY}`);
    process.exit(1);
}

const url = `${SUPABASE_FUNCTION_URL}/generate-abebooks-csv`; 

console.log(`⬇️  Downloading from: ${url}`);

const TXT_PATH = path.join(process.cwd(), 'debug_inventory.txt');

const options = {
    headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`
    }
};

https.get(url, options, (res) => {
    if (res.statusCode !== 200) {
        console.error(`❌ Error: ${res.statusCode}`);
        res.pipe(process.stdout);
        // Consumir datos para que termine
        res.on('data', () => {});
        return;
    }

    let rawData = [];
    res.on('data', (chunk) => rawData.push(chunk));
    res.on('end', () => {
        const buffer = Buffer.concat(rawData);
        const content = buffer.toString('utf8');
        
        console.log(`✅ Downloaded ${content.length} bytes.`);
        
        const lines = content.split('\r\n'); // Legacy uses CRLF
        console.log(`Lines: ${lines.length}`);
        
        if (lines.length > 1) {
            const header = lines[0];
            const firstRow = lines[1];
            
            console.log('\n--- HEADER ---');
            console.log(JSON.stringify(header));
            
            console.log('\n--- FIRST ROW ---');
            console.log(JSON.stringify(firstRow));
            
            // Analyze Column 4 (Imagen)
            const cols = firstRow.split('\t');
            console.log(`\nColumns found: ${cols.length} (Expected 12)`);
            console.log(`Col 4 (Imagen): ${cols[3]}`);

            // Scan for any URLs in the whole file
            const urlMatches = content.match(/http[^\"]+/g);
            if (urlMatches) {
                console.log(`\n✅ Found ${urlMatches.length} URLs in the file!`);
                console.log('Sample URLs:', urlMatches.slice(0, 3));
            } else {
                console.log('\n⚠️ No URLs found in the file (all "NO"?).');
            }
        }
        
        fs.writeFileSync(TXT_PATH, buffer);
        console.log(`\nSaved to ${TXT_PATH}`);
    });
});
