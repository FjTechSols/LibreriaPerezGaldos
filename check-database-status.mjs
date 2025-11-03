#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Leer .env manualmente
const envFile = readFileSync(join(__dirname, '.env'), 'utf8');
const envLines = envFile.split('\n');
const env = {};
envLines.forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno no encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable(tableName) {
  const { data, error } = await supabase
    .from(tableName)
    .select('count')
    .limit(1);

  return { exists: !error, error: error?.message };
}

async function checkDatabaseStatus() {
  console.log('🔍 DIAGNÓSTICO DE BASE DE DATOS SUPABASE\n');
  console.log('=' .repeat(60));

  const tables = [
    'usuarios',
    'libros',
    'categorias',
    'pedidos',
    'pedido_detalles',
    'facturas',
    'clientes',
    'carrito',
    'wishlist',
    'settings',
    'autores',
    'libro_autores'
  ];

  console.log('\n📊 Verificando tablas:\n');

  const results = {};

  for (const table of tables) {
    const result = await checkTable(table);
    results[table] = result;

    const icon = result.exists ? '✅' : '❌';
    const status = result.exists ? 'Existe' : 'NO EXISTE';
    console.log(`${icon} ${table.padEnd(20)} - ${status}`);

    if (!result.exists && result.error) {
      console.log(`   └─ Error: ${result.error}`);
    }
  }

  console.log('\n' + '='.repeat(60));

  const existingTables = Object.entries(results).filter(([_, r]) => r.exists).length;
  const missingTables = tables.length - existingTables;

  console.log(`\n📈 RESUMEN:`);
  console.log(`   ✅ Tablas existentes: ${existingTables}/${tables.length}`);
  console.log(`   ❌ Tablas faltantes: ${missingTables}/${tables.length}`);

  if (missingTables > 0) {
    console.log('\n⚠️  ACCIÓN REQUERIDA:');
    console.log('   Las siguientes tablas necesitan ser creadas:');
    Object.entries(results)
      .filter(([_, r]) => !r.exists)
      .forEach(([table]) => {
        console.log(`   • ${table}`);
      });

    console.log('\n📖 INSTRUCCIONES:');
    console.log('   1. Ve al SQL Editor de Supabase');
    console.log('   2. Ejecuta las migraciones en orden desde: supabase/migrations/');
    console.log('   3. O usa el script apply-settings-migration.mjs');
  } else {
    console.log('\n✅ Todas las tablas están presentes!');
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Verificar datos de muestra
  console.log('📊 Verificando datos:\n');

  if (results.libros?.exists) {
    const { count } = await supabase
      .from('libros')
      .select('*', { count: 'exact', head: true });
    console.log(`   📚 Libros: ${count || 0} registros`);
  }

  if (results.usuarios?.exists) {
    const { count } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true });
    console.log(`   👥 Usuarios: ${count || 0} registros`);
  }

  if (results.pedidos?.exists) {
    const { count } = await supabase
      .from('pedidos')
      .select('*', { count: 'exact', head: true });
    console.log(`   📦 Pedidos: ${count || 0} registros`);
  }

  if (results.facturas?.exists) {
    const { count } = await supabase
      .from('facturas')
      .select('*', { count: 'exact', head: true });
    console.log(`   🧾 Facturas: ${count || 0} registros`);
  }

  if (results.clientes?.exists) {
    const { count } = await supabase
      .from('clientes')
      .select('*', { count: 'exact', head: true });
    console.log(`   🏢 Clientes: ${count || 0} registros`);
  }

  if (results.settings?.exists) {
    const { count } = await supabase
      .from('settings')
      .select('*', { count: 'exact', head: true });
    console.log(`   ⚙️  Settings: ${count || 0} registros`);
  }

  console.log('\n' + '='.repeat(60));
}

checkDatabaseStatus().catch(console.error);
