import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://weaihscsaqxadxjgsfbt.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlYWloc2NzYXF4YWR4amdzZmJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTI3MjA5NSwiZXhwIjoyMDc0ODQ4MDk1fQ.FIiVcBSyxlQBKn9sZpCKLQqTIQ5vvvlgS4rPCTZEMGw';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function deleteUser(userEmail) {
  try {
    console.log(`\n🔍 Buscando usuario: ${userEmail}`);

    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('❌ Error al listar usuarios:', listError.message);
      return;
    }

    const user = users.find(u => u.email === userEmail);

    if (!user) {
      console.log(`❌ Usuario con email "${userEmail}" no encontrado.`);
      console.log(`\n📋 Usuarios disponibles:`);
      users.forEach(u => console.log(`   - ${u.email} (ID: ${u.id})`));
      return;
    }

    console.log(`✅ Usuario encontrado: ${user.email} (ID: ${user.id})`);

    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('❌ Error al eliminar usuario:', deleteError.message);
      return;
    }

    console.log(`✅ Usuario "${userEmail}" eliminado exitosamente.`);

  } catch (error) {
    console.error('❌ Error inesperado:', error);
  }
}

const emailToDelete = process.argv[2];

if (!emailToDelete) {
  console.log('❌ Debes proporcionar un email como argumento.');
  console.log('Uso: node delete_user.mjs email@ejemplo.com');
  process.exit(1);
}

deleteUser(emailToDelete);
