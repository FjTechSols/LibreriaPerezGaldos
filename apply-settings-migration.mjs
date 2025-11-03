import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://weaihscsaqxadxjgsfbt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlYWloc2NzYXF4YWR4amdzZmJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNzIwOTUsImV4cCI6MjA3NDg0ODA5NX0.uKzFp5yYPrbcjpDiKTKugfG6QzJ7raVf-swAPMsau9E';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔄 Aplicando migración de tabla settings...');

// Leer el archivo SQL
const migrationSQL = readFileSync('./supabase/migrations/20251008000000_create_settings_table.sql', 'utf8');

try {
  // Ejecutar la migración
  const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

  if (error) {
    console.error('❌ Error al aplicar migración:', error);

    // Intentar aplicar manualmente usando el cliente
    console.log('🔄 Intentando aplicar manualmente...');

    // Verificar si la tabla existe
    const { data: tableExists, error: checkError } = await supabase
      .from('settings')
      .select('count')
      .limit(1);

    if (checkError && checkError.code === 'PGRST204') {
      console.log('❌ La tabla settings no existe en Supabase.');
      console.log('📝 Por favor, aplica esta migración manualmente desde el panel de Supabase:');
      console.log('   1. Ve a SQL Editor en el dashboard de Supabase');
      console.log('   2. Copia el contenido del archivo: supabase/migrations/20251008000000_create_settings_table.sql');
      console.log('   3. Pégalo en el editor y ejecútalo');
    } else {
      console.log('✅ La tabla settings ya existe');

      // Verificar datos
      const { data: settings, error: selectError } = await supabase
        .from('settings')
        .select('*');

      if (selectError) {
        console.error('❌ Error al leer settings:', selectError);
      } else {
        console.log(`✅ Configuraciones encontradas: ${settings.length}`);
      }
    }
  } else {
    console.log('✅ Migración aplicada exitosamente');
  }
} catch (err) {
  console.error('❌ Error:', err.message);
  console.log('\n📝 INSTRUCCIONES MANUALES:');
  console.log('1. Ve a https://weaihscsaqxadxjgsfbt.supabase.co');
  console.log('2. Abre SQL Editor');
  console.log('3. Copia y pega el contenido de: supabase/migrations/20251008000000_create_settings_table.sql');
  console.log('4. Ejecuta el SQL');
}
