import https from 'https';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL + '/functions/v1/generate-abebooks-csv';
https.get(url, { headers: { 'Authorization': 'Bearer ' + process.env.VITE_SUPABASE_ANON_KEY } }, (res) => {
    let data = '';
    res.on('data', chunk => {
        data += chunk.toString();
        // Check for specific SKUs dynamically
        const lines = data.split('\r\n');
        for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i];
            if (line.includes('R2026326') || line.includes('02241815') || line.includes('02186021')) {
                console.log(line);
            }
        }
        // Keep only the last incomplete line for the next chunk
        data = lines[lines.length - 1];
    });
    res.on('end', () => console.log('Fetch completed.'));
}).on('error', (e) => {
    console.error(e);
});
