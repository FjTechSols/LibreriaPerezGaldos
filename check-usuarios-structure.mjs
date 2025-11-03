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

async function checkUsuariosStructure() {
  console.log('🔍 VERIFICANDO ESTRUCTURA DE TABLA usuarios\n');
  console.log('='.repeat(60));

  try {
    // Intentar obtener un registro para ver la estructura
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error al consultar usuarios:', error.message);
      return;
    }

    if (data && data.length > 0) {
      console.log('\n📊 Columnas encontradas en tabla usuarios:\n');
      const columns = Object.keys(data[0]);
      columns.forEach(col => {
        const value = data[0][col];
        const type = typeof value;
        console.log(`   ✓ ${col.padEnd(20)} (${type})`);
      });

      console.log('\n📝 Registro de ejemplo:');
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log('\n⚠️  La tabla usuarios está vacía');
      console.log('   No se puede determinar la estructura sin datos');
    }

    console.log('\n' + '='.repeat(60));

  } catch (err) {
    console.error('❌ Error inesperado:', err);
  }
}

checkUsuariosStructure().catch(console.error);
