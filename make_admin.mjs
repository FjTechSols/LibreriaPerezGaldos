import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://weaihscsaqxadxjgsfbt.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlYWloc2NzYXF4YWR4amdzZmJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTI3MjA5NSwiZXhwIjoyMDc0ODQ4MDk1fQ.FIiVcBSyxlQBKn9sZpCKLQqTIQ5vvvlgS4rPCTZEMGw';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function makeAdmin(email, username) {
  try {
    console.log(`\n🔍 Buscando usuario: ${email}`);

    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('❌ Error al listar usuarios:', listError.message);
      return;
    }

    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      console.log(`❌ Usuario con email "${email}" no encontrado.`);
      return;
    }

    console.log(`✅ Usuario encontrado: ${user.email} (ID: ${user.id})`);

    const { error: updateAuthError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          username: username,
          role: 'admin'
        }
      }
    );

    if (updateAuthError) {
      console.error('❌ Error al actualizar metadata:', updateAuthError.message);
      return;
    }

    console.log(`✅ Metadata actualizado en auth.users`);

    const { data: roles } = await supabase
      .from('roles')
      .select('id')
      .eq('nombre', 'admin')
      .maybeSingle();

    if (!roles) {
      console.error('❌ No se encontró el rol admin en la tabla roles');
      return;
    }

    const adminRolId = roles.id;
    console.log(`✅ ID del rol admin: ${adminRolId}`);

    const { data: existingUser, error: selectError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (selectError) {
      console.error('❌ Error al buscar en usuarios:', selectError.message);
      return;
    }

    if (existingUser) {
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({
          username: username,
          rol_id: adminRolId
        })
        .eq('auth_user_id', user.id);

      if (updateError) {
        console.error('❌ Error al actualizar tabla usuarios:', updateError.message);
        return;
      }

      console.log(`✅ Usuario actualizado en tabla usuarios`);
    } else {
      const { error: insertError } = await supabase
        .from('usuarios')
        .insert([{
          auth_user_id: user.id,
          username: username,
          email: user.email,
          rol_id: adminRolId,
          activo: true
        }]);

      if (insertError) {
        console.error('❌ Error al insertar en tabla usuarios:', insertError.message);
        return;
      }

      console.log(`✅ Usuario insertado en tabla usuarios`);
    }

    console.log(`\n✅ Usuario "${email}" ahora es administrador`);
    console.log(`📋 Detalles:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Username: ${username}`);
    console.log(`   Rol: admin`);

  } catch (error) {
    console.error('❌ Error inesperado:', error);
  }
}

const email = process.argv[2];
const username = process.argv[3];

if (!email || !username) {
  console.log('❌ Debes proporcionar email y username como argumentos.');
  console.log('Uso: node make_admin.mjs email@ejemplo.com username');
  process.exit(1);
}

makeAdmin(email, username);
