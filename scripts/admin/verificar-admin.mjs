import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function verificarAdmin() {
  console.log('🔍 Buscando usuarios admin...\n');

  const { data: usuarios, error } = await supabase
    .from('usuarios')
    .select('id, username, email, rol_id')
    .eq('rol_id', 1);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!usuarios || usuarios.length === 0) {
    console.log('❌ No se encontraron usuarios admin');
    return;
  }

  console.log(`✅ Encontrados ${usuarios.length} usuarios admin:\n`);
  usuarios.forEach((u, i) => {
    console.log(`${i + 1}. ID: ${u.id}`);
    console.log(`   Username: ${u.username}`);
    console.log(`   Email: ${u.email}`);
    console.log(`   Rol ID: ${u.rol_id}\n`);
  });
}

verificarAdmin();
