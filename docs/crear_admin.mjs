import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://weaihscsaqxadxjgsfbt.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlYWloc2NzYXF4YWR4amdzZmJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTI3MjA5NSwiZXhwIjoyMDc0ODQ4MDk1fQ.FIiVcBSyxlQBKn9sZpCKLQqTIQ5vvvlgS4rPCTZEMGw';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdmin(email, name) {
  try {
    console.log(`\n🔐 Creando usuario administrador...`);
    console.log(`📧 Email: ${email}`);
    console.log(`👤 Nombre: ${name}`);

    const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
      email: email,
      password: 'Admin123456!',
      email_confirm: true,
      user_metadata: {
        name: name,
        role: 'admin'
      }
    });

    if (signUpError) {
      console.error('❌ Error al crear usuario:', signUpError.message);
      return;
    }

    console.log(`✅ Usuario creado con ID: ${authData.user.id}`);

    const { error: insertError } = await supabase
      .from('usuarios')
      .insert([{
        id: authData.user.id,
        email: email,
        nombre: name,
        rol: 'admin'
      }]);

    if (insertError) {
      console.error('❌ Error al insertar en tabla usuarios:', insertError.message);

      const { error: deleteError } = await supabase.auth.admin.deleteUser(authData.user.id);
      if (deleteError) {
        console.error('⚠️ No se pudo revertir la creación del usuario en auth');
      }
      return;
    }

    console.log(`✅ Usuario administrador creado exitosamente`);
    console.log(`\n📋 Credenciales:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: Admin123456!`);
    console.log(`   Rol: admin`);

  } catch (error) {
    console.error('❌ Error inesperado:', error);
  }
}

const email = process.argv[2];
const name = process.argv[3];

if (!email || !name) {
  console.log('❌ Debes proporcionar email y nombre como argumentos.');
  console.log('Uso: node crear_admin.mjs email@ejemplo.com "Nombre Completo"');
  process.exit(1);
}

createAdmin(email, name);
