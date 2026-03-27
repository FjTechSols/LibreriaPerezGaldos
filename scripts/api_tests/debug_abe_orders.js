
import https from 'https';
import dotenv from 'dotenv';

dotenv.config();

const userId = process.env.ABEBOOKS_USER_ID;
const apiKey = process.env.ABEBOOKS_API_KEY;

if (!userId || !apiKey) {
  console.error('❌ Error: Falta ABEBOOKS_USER_ID o ABEBOOKS_API_KEY en el .env');
  process.exit(1);
}

function callAbeApi(endpoint, params = {}) {
  return new Promise((resolve, reject) => {
    const urlParams = new URLSearchParams({ userId, apiKey, ...params });
    const url = `https://orders.abebooks.com/ws/${endpoint}?${urlParams.toString()}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, data });
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function debug() {
  const tests = [
    { name: 'getAllNewOrders', params: {} },
    { name: 'getNewOrdersByStatus', params: { orderStatus: 'Ordered' } },
    { name: 'getNewOrdersByStatus', params: { orderStatus: 'availabilityConfirmed' } },
    { name: 'getOrdersProcessed', params: {} }
  ];

  for (const test of tests) {
    console.log(`\n--- 📡 Probando: ${test.name} (${test.params.orderStatus || 'all'}) ---`);
    try {
      const { status, data } = await callAbeApi(test.name, test.params);
      console.log(`HTTP ${status}`);
      console.log('XML Preview:', data.substring(0, 500));
      
      const orders = data.match(/<order>/g) || [];
      console.log(`Encontrados: ${orders.length} pedidos`);
      
      if (data.includes('<error>')) {
        console.log('⚠️ Error en XML detectado');
      }
    } catch (e) {
      console.error('❌ Error:', e.message);
    }
  }
}

debug();
