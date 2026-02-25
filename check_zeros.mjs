import https from 'https';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL + '/functions/v1/generate-abebooks-csv';
https.get(url, { headers: { 'Authorization': 'Bearer ' + process.env.VITE_SUPABASE_ANON_KEY } }, (res) => {
    let rawData = '';
    res.on('data', chunk => {
        rawData += chunk;
    });
    res.on('end', () => {
        console.log('--- Checking for 0-stock SKUs in LIVE CSV ---');
        console.log('Contains 00001280H?', rawData.includes('00001280H'));
        console.log('Contains 02186021?', rawData.includes('02186021'));
        console.log('Contains 02271895?', rawData.includes('02271895'));
        console.log('Contains 02210423?', rawData.includes('02210423'));
        console.log('Done.');
    });
}).on('error', (e) => {
    console.error(e);
});
