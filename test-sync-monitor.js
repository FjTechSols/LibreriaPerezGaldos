// Script de prueba para verificar el sistema de logging
// Ejecutar con: node test-sync-monitor.js

const SUPABASE_URL = 'https://weaihscsaqxadxjgsfbt.supabase.co';
const SUPABASE_KEY = 'TU_SUPABASE_ANON_KEY'; // Reemplazar con tu key

async function testSyncMonitor() {
  console.log('🧪 Testing Sync Monitor System...\n');

  // 1. Test: Check FTPS enabled
  console.log('1️⃣ Testing check-ftps-enabled...');
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/check-ftps-enabled`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    });
    const data = await response.json();
    console.log('✅ Response:', data);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n2️⃣ Testing get-last-ftps-sync...');
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/get-last-ftps-sync`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    });
    const data = await response.json();
    console.log('✅ Response:', data);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n3️⃣ Testing trigger-ftps-sync...');
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/trigger-ftps-sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    console.log('✅ Response:', data);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n4️⃣ Checking database table directly...');
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/abebooks_sync_log?select=*&order=sync_date.desc&limit=5`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY,
      },
    });
    const data = await response.json();
    console.log('✅ Recent logs:', data);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSyncMonitor();
