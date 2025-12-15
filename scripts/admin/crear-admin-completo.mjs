import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function crearAdmin() {
  console.log('🔐 Creando usuario administrador...\n');

  const email = 'FjtechSols@gmail.com';
  const password = 'TuContraseñaSegura123!';
  const username = 'admin';

  console.log('📧 Email:', email);
  console.log('👤 Username:', username);
  console.log('🔒 Password: (proporcionada por ti)\n');

  try {
    console.log('1️⃣ Registrando usuario en auth.users...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username
        }
      }
    });

    if (authError) {
      console.error('❌ Error al registrar en auth:', authError.message);

      if (authError.message.includes('already registered')) {
        console.log('\n⚠️  El email ya está registrado.');
        console.log('Intentando obtener el auth_user_id del usuario existente...\n');

        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (loginError) {
          console.error('❌ No se pudo iniciar sesión con esas credenciales.');
          console.log('\n💡 Opciones:');
          console.log('   1. Usa la contraseña correcta del usuario existente');
          console.log('   2. Elimina el usuario de auth.users desde Supabase Dashboard');
          console.log('   3. Usa un email diferente');
          return;
        }

        console.log('✅ Login exitoso. Verificando datos en tabla usuarios...\n');

        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('*')
          .eq('auth_user_id', loginData.user.id)
          .maybeSingle();

        if (userError) {
          console.error('❌ Error al consultar tabla usuarios:', userError);
          return;
        }

        if (!userData) {
          console.log('⚠️  El usuario existe en auth pero NO en tabla usuarios.');
          console.log('Creando registro en tabla usuarios...\n');

          const { error: insertError } = await supabase
            .from('usuarios')
            .insert([{
              auth_user_id: loginData.user.id,
              email: email,
              username: username,
              rol_id: 1
            }]);

          if (insertError) {
            console.error('❌ Error al crear usuario en tabla:', insertError);
            return;
          }

          console.log('✅ Usuario admin creado exitosamente!\n');
          console.log('📝 Datos del admin:');
          console.log('   Email:', email);
          console.log('   Username:', username);
          console.log('   Rol: ADMIN (rol_id: 1)');
          return;
        } else {
          console.log('✅ Usuario ya existe en tabla usuarios\n');
          console.log('📝 Datos actuales:');
          console.log('   Username:', userData.username);
          console.log('   Email:', userData.email);
          console.log('   Rol ID:', userData.rol_id, userData.rol_id === 1 ? '(ADMIN)' : '(USER)');

          if (userData.rol_id !== 1) {
            console.log('\n⚠️  El usuario NO es admin. Actualizando a rol admin...');
            const { error: updateError } = await supabase
              .from('usuarios')
              .update({ rol_id: 1 })
              .eq('id', userData.id);

            if (updateError) {
              console.error('❌ Error al actualizar rol:', updateError);
              return;
            }
            console.log('✅ Usuario actualizado a ADMIN');
          }
        }
        return;
      }
      return;
    }

    if (!authData.user) {
      console.error('❌ No se pudo crear el usuario en auth');
      return;
    }

    console.log('✅ Usuario creado en auth.users');
    console.log('   Auth User ID:', authData.user.id, '\n');

    console.log('2️⃣ Esperando trigger automático (2 segundos)...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('3️⃣ Verificando registro en tabla usuarios...');
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('auth_user_id', authData.user.id)
      .maybeSingle();

    if (userError) {
      console.error('❌ Error al verificar tabla usuarios:', userError);
      return;
    }

    if (!userData) {
      console.log('⚠️  Trigger no creó el registro. Creando manualmente...');
      const { error: insertError } = await supabase
        .from('usuarios')
        .insert([{
          auth_user_id: authData.user.id,
          email: email,
          username: username,
          rol_id: 1
        }]);

      if (insertError) {
        console.error('❌ Error al insertar en tabla usuarios:', insertError);
        return;
      }

      console.log('✅ Usuario admin creado manualmente\n');
    } else {
      console.log('✅ Usuario encontrado en tabla usuarios');

      if (userData.rol_id !== 1) {
        console.log('⚠️  Actualizando a rol admin...');
        const { error: updateError } = await supabase
          .from('usuarios')
          .update({ rol_id: 1 })
          .eq('id', userData.id);

        if (updateError) {
          console.error('❌ Error al actualizar rol:', updateError);
          return;
        }
        console.log('✅ Rol actualizado a ADMIN\n');
      } else {
        console.log('✅ El usuario ya es ADMIN\n');
      }
    }

    console.log('═══════════════════════════════════════');
    console.log('✨ ADMINISTRADOR CREADO EXITOSAMENTE ✨');
    console.log('═══════════════════════════════════════');
    console.log('📧 Email:', email);
    console.log('👤 Username:', username);
    console.log('🔐 Password:', password);
    console.log('👑 Rol: ADMINISTRADOR');
    console.log('═══════════════════════════════════════\n');
    console.log('💡 Ahora puedes iniciar sesión con:');
    console.log(`   - Email: ${email}`);
    console.log(`   - Username: ${username}`);
    console.log(`   - Password: ${password}`);

  } catch (error) {
    console.error('❌ Error inesperado:', error);
  }
}

crearAdmin();
