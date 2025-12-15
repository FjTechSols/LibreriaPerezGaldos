#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Faltan las credenciales de Supabase en el archivo .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarRolesUsuario() {
  try {
    console.log('\n🔍 Verificando roles del usuario actual...\n');

    // Obtener el usuario actual
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ Error: No hay sesión activa. Debes iniciar sesión primero.');
      console.log('\n📝 Para crear una sesión, ejecuta:');
      console.log('   node scripts/verificar-admin.mjs');
      process.exit(1);
    }

    console.log('✅ Usuario autenticado:');
    console.log('   Email:', user.email);
    console.log('   ID:', user.id);

    // Verificar roles en usuarios_roles
    const { data: rolesData, error: rolesError } = await supabase
      .from('usuarios_roles')
      .select(`
        rol_id,
        activo,
        roles (
          id,
          nombre,
          display_name,
          descripcion,
          nivel_jerarquia
        )
      `)
      .eq('user_id', user.id);

    if (rolesError) {
      console.error('\n❌ Error al consultar roles:', rolesError.message);
      process.exit(1);
    }

    console.log('\n📋 Roles asignados en usuarios_roles:');
    if (!rolesData || rolesData.length === 0) {
      console.log('   ⚠️  NO HAY ROLES ASIGNADOS');
      console.log('\n💡 Este es el problema del error 403.');
      console.log('   Necesitas asignar roles a este usuario.');
      console.log('\n📝 Para asignar el rol de admin, ejecuta:');
      console.log('   node scripts/crear-admin-completo.mjs');
    } else {
      rolesData.forEach((ur, index) => {
        console.log(`\n   Rol ${index + 1}:`);
        console.log('   - Nombre:', ur.roles?.nombre);
        console.log('   - Display:', ur.roles?.display_name);
        console.log('   - Nivel jerarquía:', ur.roles?.nivel_jerarquia);
        console.log('   - Activo:', ur.activo ? '✅' : '❌');
      });

      const isAdmin = rolesData.some(ur =>
        ur.activo && (ur.roles?.nombre === 'admin' || ur.roles?.nombre === 'webmaster')
      );

      if (isAdmin) {
        console.log('\n✅ El usuario tiene permisos de administrador');
        console.log('\n💡 Si aún recibes error 403, el problema es que');
        console.log('   la edge function no está desplegada.');
        console.log('\n📝 Para desplegar la edge function, contacta con soporte.');
      } else {
        console.log('\n⚠️  El usuario NO tiene permisos de administrador');
        console.log('\n📝 Para asignar el rol de admin, ejecuta:');
        console.log('   node scripts/crear-admin-completo.mjs');
      }
    }

    console.log('\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verificarRolesUsuario();
