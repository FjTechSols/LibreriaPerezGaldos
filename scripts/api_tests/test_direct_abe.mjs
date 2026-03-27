
import https from 'https';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const userId = process.env.ABEBOOKS_USER_ID;
const apiKey = process.env.ABEBOOKS_API_KEY;

if (!userId || !apiKey) {
    console.error('❌ Error: Credenciales no encontradas en .env');
    process.exit(1);
}

function callAbeBooks(endpoint, extraParams = {}) {
    return new Promise((resolve) => {
        const params = new URLSearchParams({ userId, apiKey, ...extraParams });
        const url = `https://orders.abebooks.com/ws/${endpoint}?${params.toString()}`;
        
        console.log(`\n--- 📡 Llamando a: ${endpoint} ---`);
        console.log(`URL (sin key): ${url.replace(apiKey, 'REDACTED')}`);
        
        const start = Date.now();
        https.get(url, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                const duration = Date.now() - start;
                console.log(`⏱️  Duración: ${duration}ms`);
                console.log(`HTTP Status: ${res.statusCode}`);
                console.log(`Tamaño: ${(body.length / 1024).toFixed(2)} KB`);
                
                if (body.includes('<error>')) {
                    const error = body.match(/<error>(.*?)<\/error>/s);
                    console.log(`❌ Error AbeBooks: ${error ? error[1] : 'Desconocido'}`);
                } else {
                    const orders = body.match(/<order>/g) || [];
                    console.log(`✅ Pedidos encontrados: ${orders.length}`);
                }
                
                // Si hay muchos pedidos, mostramos un snippet del XML
                if (body.length > 500) {
                    console.log('Snippet XML:', body.substring(0, 500));
                }
                
                resolve();
            });
        }).on('error', (e) => {
            console.error(`❌ Error de red: ${e.message}`);
            resolve();
        });
    });
}

async function runTests() {
    // Test 1: Pedidos nuevos
    await callAbeBooks('getAllNewOrders');
    
    // Test 2: Intentar por estado (probar nombres comunes)
    await callAbeBooks('getOrdersByStatus', { orderStatus: 'Shipped' });
    await callAbeBooks('getOrdersByStatus', { orderStatus: 'Seller Notified' });
    
    // Test 3: Intentar otros nombres probables de histórico
    await callAbeBooks('getProcessedOrders', { onOrAfter: '2026-02-01' });
}

runTests();
