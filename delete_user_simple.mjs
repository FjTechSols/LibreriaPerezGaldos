import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
const lines = envContent.split('\n');
let url = '';
let key = '';

lines.forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) {
    url = line.split('=')[1].trim();
  }
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
    key = line.split('=')[1].trim();
  }
});

const supabase = createClient(url, key);

async function deleteUser() {
  try {
    // Intentar eliminar de la tabla usuarios
    const { error } = await supabase
      .from('usuarios')
      .delete()
      .eq('email', 'fjtechsols@gmail.com');
    
    if (error) {
      console.error('Error:', error.message);
    } else {
      console.log('✓ Usuario eliminado de la tabla usuarios');
      console.log('Nota: El usuario en auth.users debe eliminarse desde el dashboard de Supabase');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

deleteUser();
