import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim();
});

console.log('🔍 Verificando ubicaciones...');

// Intentar con anon key primero para ver qué hay
const supabaseAnon = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const { data: existing, error: selectError } = await supabaseAnon
  .from('ubicaciones')
  .select('*');

console.log('📋 Ubicaciones actuales:', existing);

if (existing && existing.length > 0) {
  console.log('✅ Ya existen ubicaciones en la base de datos');
} else {
  console.log('\n⚠️  No hay ubicaciones. Se requiere insertar "Almacén".');
  console.log('\nPor favor, ejecuta este SQL directamente en Supabase Dashboard:');
  console.log('\n----------------------------------------');
  console.log("INSERT INTO ubicaciones (nombre, descripcion, activa)");
  console.log("VALUES ('Almacén', 'Ubicación principal de almacenamiento', true);");
  console.log('----------------------------------------\n');
}
