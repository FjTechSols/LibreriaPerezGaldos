import https from 'https';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const userId = process.env.ABEBOOKS_USER_ID;
const apiKey = process.env.ABEBOOKS_API_KEY;

const ABEBOOKS_API_BASE = 'https://orderupdate.abebooks.com:10003/';

function callAbeBooksPost(action, extraXml = '') {
    return new Promise((resolve) => {
        const xml = `<?xml version="1.0" encoding="utf-8"?>
<orderUpdateRequest version="1.1">
    <action name="${action}">
        <username>${userId}</username>
        <password>${apiKey}</password>
    </action>
    ${extraXml}
</orderUpdateRequest>`;

        console.log(`\n--- 📡 POST a AbeBooks: ${action} ---`);
        console.log('Sending Body:', xml);
        
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/xml',
                'Content-Length': Buffer.byteLength(xml)
            },
            timeout: 10000
        };

        const start = Date.now();
        const req = https.request(ABEBOOKS_API_BASE, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                const duration = Date.now() - start;
                console.log(`⏱️  Duración: ${duration}ms, Status: ${res.statusCode}`);
                console.log('--- RESPONSE XML ---');
                console.log(body.substring(0, 1000));
                console.log('--------------------');
                resolve();
            });
        });

        req.on('error', (e) => {
            console.error(`❌ Error: ${e.message}`);
            resolve();
        });

        req.write(xml);
        req.end();
    });
}

async function run() {
    // Test 1: getOrderUpdate (might be another valid action)
    // Actually, let's try getOrders with dates
    await callAbeBooksPost('getOrderUpdate', '<orderDate>2026-03-10</orderDate>');
    await callAbeBooksPost('getOrders', '<dateRange><startDate>2026-03-10</startDate><endDate>2026-03-20</endDate></dateRange>');
}

run();
