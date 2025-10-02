import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://weaihscsaqxadxjgsfbt.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlYWloc2NzYXF4YWR4amdzZmJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTI3MjA5NSwiZXhwIjoyMDc0ODQ4MDk1fQ.FIiVcBSyxlQBKn9sZpCKLQqTIQ5vvvlgS4rPCTZEMGw';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkTable() {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error:', error.message);
      return;
    }

    console.log('Estructura de la tabla usuarios:');
    if (data && data.length > 0) {
      console.log('Columnas:', Object.keys(data[0]));
    } else {
      console.log('La tabla está vacía');
    }
  } catch (error) {
    console.error('Error inesperado:', error);
  }
}

checkTable();
