import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function deleteUser() {
  try {
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) throw listError;
    
    const user = authUsers.users.find(u => u.email === 'fjtechsols@gmail.com');
    
    if (!user) {
      console.log('Usuario no encontrado en auth.users');
      return;
    }
    
    console.log('Usuario encontrado:', user.id);
    
    const { error: dbError } = await supabase
      .from('usuarios')
      .delete()
      .eq('auth_user_id', user.id);
    
    if (dbError) {
      console.log('Error eliminando de usuarios:', dbError.message);
    } else {
      console.log('Eliminado de tabla usuarios');
    }
    
    const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
    
    if (authError) throw authError;
    
    console.log('✓ Usuario fjtechsols@gmail.com eliminado completamente');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

deleteUser();
