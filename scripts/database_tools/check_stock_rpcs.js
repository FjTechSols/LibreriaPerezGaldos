/**
 * Script: check_stock_rpcs.js
 * Propósito: Verificar si los RPCs de stock existen en Supabase y están funcionando.
 * Uso: node scripts/check_stock_rpcs.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Leer .env manualmente
const envPath = resolve(process.cwd(), '.env');
let envContent;
try {
  envContent = readFileSync(envPath, 'utf-8');
} catch {
  console.error('❌ No se encontró .env en la raíz del proyecto');
  process.exit(1);
}

// Parsear variables de entorno
const parseEnv = (content) => {
  const result = {};
  content.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) result[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  });
  return result;
};

const env = parseEnv(envContent);
const supabaseUrl = env.VITE_SUPABASE_URL;
const serviceKey = env.VITE_SUPABASE_ROL_KEY || env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ No se encontraron VITE_SUPABASE_URL o la Service Role Key en .env');
  console.log('Variables disponibles:', Object.keys(env).filter(k => k.includes('SUPA')));
  process.exit(1);
}

console.log('🔗 Conectando a:', supabaseUrl);

const supabase = createClient(supabaseUrl, serviceKey);

async function checkRPCs() {
  console.log('\n========================================');
  console.log('📋 VERIFICACIÓN DE RPCs DE STOCK EN BD');
  console.log('========================================\n');

  // 1. Listar todas las funciones relacionadas con stock
  console.log('1️⃣  Buscando funciones de stock en information_schema...\n');
  const { data: functions, error: funcError } = await supabase.rpc('_debug_list_functions').catch(() => ({ data: null, error: 'RPC not available' }));

  // Si no existe un RPC de debug, usar SQL directo
  const { data: sqlFunctions, error: sqlError } = await supabase
    .from('information_schema.routines')
    .select('routine_name, routine_type')
    .eq('routine_schema', 'public')
    .catch(() => ({ data: null, error: 'Direct query failed' }));

  // Intentar con RPC de postgres (pg_proc)
  console.log('   Consultando pg_proc para funciones de stock...');
  const { data: pgFunctions, error: pgError } = await supabase.rpc('pg_catalog.pg_proc').catch(() => null);

  // El mejor enfoque: usar SQL raw vía rpc si existe
  // Intentamos llamar directamente a cada RPC para ver si existe
  const rpcsToCheck = [
    'deduct_stock_force',
    'restore_stock_force', 
    'decrement_stock',
    'confirm_order_and_deduct_stock',
    'increment_stock'
  ];

  console.log('2️⃣  Probando existencia de cada RPC individualmente:\n');
  
  for (const rpcName of rpcsToCheck) {
    try {
      // Intentar con parámetro inválido — si el error dice "does not exist" = no existe
      // Si el error dice "missing" o "invalid" = SÍ existe pero faltan parámetros
      const { data, error } = await supabase.rpc(rpcName, { _test: true });
      
      if (error) {
        if (error.message?.includes('does not exist') || error.code === 'PGRST202') {
          console.log(`   ❌ ${rpcName}: NO EXISTE en la BD`);
        } else if (error.message?.includes('Could not find') || error.message?.includes('No match found')) {
          console.log(`   ❌ ${rpcName}: NO EXISTE (${error.code})`);
        } else {
          console.log(`   ✅ ${rpcName}: EXISTE (error esperado por params: ${error.message?.substring(0, 80)})`);
        }
      } else {
        console.log(`   ✅ ${rpcName}: EXISTE y respondió con data: ${JSON.stringify(data)}`);
      }
    } catch (e) {
      console.log(`   ⚠️  ${rpcName}: Error de conexión: ${e.message}`);
    }
  }

  // 3. Si deduct_stock_force existe, probarlo con un pedido real
  console.log('\n3️⃣  Buscando pedidos recientes para auditar stock...\n');
  
  const { data: recentOrders, error: ordersError } = await supabase
    .from('pedidos')
    .select(`
      id, estado, tipo, fecha_pedido,
      detalles:pedido_detalles(
        libro_id, cantidad,
        libro:libros(id, titulo, stock)
      )
    `)
    .in('estado', ['procesando', 'enviado', 'completado'])
    .order('fecha_pedido', { ascending: false })
    .limit(5);

  if (ordersError) {
    console.log('   ❌ Error obteniendo pedidos:', ordersError.message);
  } else if (recentOrders && recentOrders.length > 0) {
    console.log(`   📦 Últimos ${recentOrders.length} pedidos en estado procesando/enviado/completado:\n`);
    recentOrders.forEach(order => {
      console.log(`   Pedido #${order.id} | Tipo: ${order.tipo} | Estado: ${order.estado} | Fecha: ${order.fecha_pedido?.substring(0, 10)}`);
      order.detalles?.forEach(d => {
        if (d.libro) {
          console.log(`     📚 "${d.libro.titulo}" | Vendido: ${d.cantidad} | Stock actual: ${d.libro.stock}`);
        }
      });
    });
  } else {
    console.log('   ℹ️  No hay pedidos en estado procesando/enviado/completado');
  }

  // 4. Verificar tabla de libros para stock_history o triggers
  console.log('\n4️⃣  Verificando triggers en tabla libros...\n');
  const { data: triggers, error: triggerError } = await supabase
    .rpc('check_triggers')
    .catch(() => ({ data: null, error: 'no rpc' }));

  // Revisión directa: buscar un libro con stock para cruzar datos
  const { data: sampleBook, error: bookError } = await supabase
    .from('libros')
    .select('id, titulo, stock')
    .gt('stock', 0)
    .limit(3);
  
  if (sampleBook) {
    console.log('   Libros con stock > 0 (muestra):');
    sampleBook.forEach(b => console.log(`     ID: ${b.id} | "${b.titulo}" | Stock: ${b.stock}`));
  }

  console.log('\n========================================');
  console.log('✅ Verificación completada');
  console.log('========================================\n');
}

checkRPCs().catch(console.error);
