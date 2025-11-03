#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY deben estar definidas en .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('🚀 Iniciando aplicación de migración de settings...\n');

  try {
    // Leer el archivo de migración
    const migrationPath = join(__dirname, 'supabase/migrations/20251008000000_create_settings_table.sql');
    const sql = readFileSync(migrationPath, 'utf8');

    console.log('📄 Migración cargada:', migrationPath);
    console.log('📝 Ejecutando SQL...\n');

    // Ejecutar la migración usando RPC
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Error al ejecutar migración:', error);
      console.log('\n⚠️  NOTA: Si ves error "function exec_sql does not exist", necesitas ejecutar el SQL directamente en Supabase SQL Editor');
      console.log('📋 Copia el contenido de: supabase/migrations/20251008000000_create_settings_table.sql');
      console.log('🌐 Y ejecútalo en: https://supabase.com/dashboard/project/_/sql');
      return false;
    }

    console.log('✅ Migración aplicada exitosamente!');
    console.log('✅ Tabla "settings" creada con éxito\n');

    // Verificar que la tabla existe
    const { data: settingsData, error: selectError } = await supabase
      .from('settings')
      .select('count')
      .limit(1);

    if (selectError) {
      console.log('⚠️  Advertencia al verificar tabla:', selectError.message);
    } else {
      console.log('✅ Verificación: Tabla "settings" es accesible');
    }

    return true;
  } catch (err) {
    console.error('❌ Error inesperado:', err);
    return false;
  }
}

// Ejecutar
applyMigration().then(success => {
  if (success) {
    console.log('\n✅ Proceso completado exitosamente');
    process.exit(0);
  } else {
    console.log('\n❌ Proceso completado con errores');
    console.log('\n📖 INSTRUCCIONES MANUALES:');
    console.log('1. Ve a: https://supabase.com/dashboard/project/_/sql');
    console.log('2. Copia y pega el contenido de: supabase/migrations/20251008000000_create_settings_table.sql');
    console.log('3. Haz clic en "Run" para ejecutar la migración');
    console.log('4. Recarga la aplicación\n');
    process.exit(1);
  }
});
