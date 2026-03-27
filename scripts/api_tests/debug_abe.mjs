
import https from 'https';
import dotenv from 'dotenv';

dotenv.config();

const userId = process.env.ABEBOOKS_USER_ID;
const apiKey = process.env.ABEBOOKS_API_KEY;

if (!userId || !apiKey) {
    console.error('❌ Faltan credenciales');
    process.exit(1);
}

function test(endpoint) {
    console.log(`\n--- 📡 Test: ${endpoint} ---`);
    const url = `https://orders.abebooks.com/ws/${endpoint}?userId=${userId}&apiKey=${apiKey}`;
    
    https.get(url, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => {
            console.log(`Status: ${res.statusCode}`);
            console.log('XML snippet:', body.substring(0, 500));
            const count = (body.match(/<order>/g) || []).length;
            console.log(`Orders found: ${count}`);
            if (body.includes('<error>')) {
                const err = body.match(/<error>(.*?)<\/error>/);
                console.log(`❌ AbeBooks Error: ${err ? err[1] : 'unknown'}`);
            }
        });
    }).on('error', e => console.error('Error:', e.message));
}

test('getAllNewOrders');
test('getOrdersProcessed');
