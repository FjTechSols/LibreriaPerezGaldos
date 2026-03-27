/**
 * Script: check_stock_rpcs.mjs
 * Propósito: Verificar si los RPCs de stock existen en Supabase y están funcionando.
 * Uso: node scripts/check_stock_rpcs.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Leer .env manualmente desde la raíz del proyecto
const envPath = resolve(__dirname, '..', '.env');
let envContent;
try {
  envContent = readFileSync(envPath, 'utf-8');
} catch {
  console.error('❌ No se encontró .env en la raíz del proyecto');
  console.error('   Ruta buscada:', envPath);
  process.exit(1);
}

// Parsear variables de entorno
const parseEnv = (content) => {
  const result = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed.includes('=')) return;
    const eqIndex = trimmed.indexOf('=');
    const key = trimmed.substring(0, eqIndex).trim();
    const val = trimmed.substring(eqIndex + 1).trim().replace(/^["']|["']$/g, '');
    result[key] = val;
  });
  return result;
};

const env = parseEnv(envContent);
const supabaseUrl = env.VITE_SUPABASE_URL;
const serviceKey = env.VITE_SUPABASE_ROL_KEY 
  || env.VITE_SUPABASE_SERVICE_ROLE_KEY 
  || env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('❌ VITE_SUPABASE_URL no encontrada en .env');
  console.log('   Variables encontradas:', Object.keys(env).join(', '));
  process.exit(1);
}

const keyToUse = serviceKey || anonKey;
console.log('🔗 URL:', supabaseUrl);
console.log('🔑 Key type:', serviceKey ? 'SERVICE ROLE' : 'ANON (limitada)');

const supabase = createClient(supabaseUrl, keyToUse);

async function checkRPCs() {
  console.log('\n========================================');
  console.log('📋 VERIFICACIÓN DE RPCs DE STOCK EN BD');
  console.log('========================================\n');

  // ---- TEST CADA RPC INDIVIDUALMENTE ----
  // Trick: si la RPC no existe Supabase devuelve code "PGRST202" o un mensaje "Could not find"
  // Si existe pero recibe params incorrectos -> error diferente (42883, 42P01, etc.)
  
  const rpcsToCheck = [
    { name: 'deduct_stock_force', params: { p_pedido_id: 0 } },
    { name: 'restore_stock_force', params: { p_pedido_id: 0 } },
    { name: 'confirm_order_and_deduct_stock', params: { p_pedido_id: 0 } },
    { name: 'decrement_stock', params: { row_id: 0, amount: 0 } },
    { name: 'increment_stock', params: { row_id: 0, amount: 0 } },
  ];

  console.log('1️⃣  Probando existencia de cada RPC:\n');
  const rpcResults = {};

  for (const rpc of rpcsToCheck) {
    const { data, error } = await supabase.rpc(rpc.name, rpc.params);
    
    if (error) {
      // PGRST202 = "Could not find the function" = NO EXISTE
      const notFound = 
        error.code === 'PGRST202' || 
        error.message?.toLowerCase().includes('could not find') ||
        error.message?.toLowerCase().includes('does not exist') ||
        error.message?.toLowerCase().includes('no match');
      
      if (notFound) {
        console.log(`   ❌ ${rpc.name}: NO EXISTE en la BD`);
        console.log(`      Error: ${error.code} - ${error.message?.substring(0, 100)}`);
        rpcResults[rpc.name] = 'NOT_FOUND';
      } else {
        // Existe pero hubo otro error (ej: el pedido_id 0 no existe -> normal)
        console.log(`   ✅ ${rpc.name}: EXISTE`);
        console.log(`      (Error esperado con ID=0: ${error.code} - ${error.message?.substring(0, 80)})`);
        rpcResults[rpc.name] = 'EXISTS';
      }
    } else {
      console.log(`   ✅ ${rpc.name}: EXISTE y retornó: ${JSON.stringify(data)}`);
      rpcResults[rpc.name] = 'EXISTS';
    }
  }

  // ---- ANÁLISIS DE PEDIDOS RECIENTES ----
  console.log('\n2️⃣  Auditando pedidos recientes con stock...\n');
  
  const { data: orders, error: ordersErr } = await supabase
    .from('pedidos')
    .select(`
      id, estado, tipo, fecha_pedido,
      detalles:pedido_detalles(
        libro_id, cantidad,
        libro:libros(id, titulo, stock)
      )
    `)
    .order('fecha_pedido', { ascending: false })
    .limit(10);

  if (ordersErr) {
    console.log('   ❌ Error obteniendo pedidos:', ordersErr.message);
  } else if (orders?.length > 0) {
    console.log(`   📦 Últimos ${orders.length} pedidos:\n`);
    
    let problemFound = false;
    orders.forEach(order => {
      const detallesConLibro = order.detalles?.filter(d => d.libro) || [];
      if (detallesConLibro.length === 0) return;
      
      const estadoDebeDescontar = ['procesando', 'enviado', 'completado'].includes(order.estado);
      
      console.log(`   Pedido #${order.id} | Tipo: ${order.tipo} | Estado: ${order.estado}`);
      detallesConLibro.forEach(d => {
        const symbol = estadoDebeDescontar ? '⚠️ ' : '   ';
        console.log(`   ${symbol}"${d.libro.titulo?.substring(0,40)}" | Vendido: ${d.cantidad} | Stock BD actual: ${d.libro.stock}`);
      });
    });
  }

  // ---- RESUMEN ----
  console.log('\n========================================');
  console.log('📊 RESUMEN DE RPCs:');
  Object.entries(rpcResults).forEach(([name, status]) => {
    const icon = status === 'EXISTS' ? '✅' : '❌';
    console.log(`   ${icon} ${name}: ${status}`);
  });
  
  const missingRPCs = Object.entries(rpcResults)
    .filter(([, status]) => status === 'NOT_FOUND')
    .map(([name]) => name);
  
  if (missingRPCs.length > 0) {
    console.log('\n🚨 CAUSA PROBABLE DEL BUG:');
    console.log('   Los siguientes RPCs NO EXISTEN en la BD de producción:');
    missingRPCs.forEach(name => console.log(`   - ${name}`));
    console.log('\n   El frontend llama a estas funciones pero Supabase las rechaza silenciosamente.');
    console.log('   Solución: Crear los RPCs faltantes en Supabase.\n');
  } else {
    console.log('\n✅ Todos los RPCs existen. El bug está en otro lugar (lógica de frontend).');
  }
  
  console.log('========================================\n');
}

checkRPCs().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
