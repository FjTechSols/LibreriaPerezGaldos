import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function listarUsuarios() {
  console.log('🔍 Listando TODOS los usuarios...\n');

  const { data: usuarios, error } = await supabase
    .from('usuarios')
    .select('id, username, email, rol_id')
    .order('id', { ascending: false });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!usuarios || usuarios.length === 0) {
    console.log('❌ No se encontraron usuarios en la base de datos');
    return;
  }

  console.log(`✅ Total de usuarios: ${usuarios.length}\n`);
  usuarios.forEach((u, i) => {
    console.log(`${i + 1}. ID: ${u.id}`);
    console.log(`   Username: ${u.username}`);
    console.log(`   Email: ${u.email}`);
    console.log(`   Rol ID: ${u.rol_id} (${u.rol_id === 1 ? 'ADMIN' : 'USER'})`);
    console.log('');
  });
}

listarUsuarios();
