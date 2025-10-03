import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deleteUser() {
  try {
    // 1. Buscar el usuario por email
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) throw listError;
    
    const user = authUsers.users.find(u => u.email === 'fjtechsols@gmail.com');
    
    if (!user) {
      console.log('Usuario no encontrado en auth.users');
      return;
    }
    
    console.log('Usuario encontrado:', user.id);
    
    // 2. Eliminar de tabla usuarios primero (si existe)
    const { error: dbError } = await supabase
      .from('usuarios')
      .delete()
      .eq('auth_user_id', user.id);
    
    if (dbError) {
      console.log('Error eliminando de usuarios (puede que no exista):', dbError.message);
    } else {
      console.log('Eliminado de tabla usuarios');
    }
    
    // 3. Eliminar de auth.users
    const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
    
    if (authError) throw authError;
    
    console.log('✓ Usuario fjtechsols@gmail.com eliminado completamente');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

deleteUser();
