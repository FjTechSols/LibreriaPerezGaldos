import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length) {
    envVars[key.trim()] = values.join('=').trim().replace(/^["']|["']$/g, '');
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno no encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const SQL_STATEMENTS = [
  'DROP POLICY IF EXISTS "Users can view own profile" ON usuarios',
  'DROP POLICY IF EXISTS "Users can update own profile" ON usuarios',
  'DROP POLICY IF EXISTS "Admin can manage all users" ON usuarios',
  'DROP POLICY IF EXISTS "Admin can view roles" ON roles',
  'DROP POLICY IF EXISTS "Anyone can view editoriales" ON editoriales',
  'DROP POLICY IF EXISTS "Admin can manage editoriales" ON editoriales',
  'DROP POLICY IF EXISTS "Anyone can view categorias" ON categorias',
  'DROP POLICY IF EXISTS "Admin can manage categorias" ON categorias',
  'DROP POLICY IF EXISTS "Anyone can view active libros" ON libros',
  'DROP POLICY IF EXISTS "Admin can manage libros" ON libros',
  'DROP POLICY IF EXISTS "Users can view own pedidos" ON pedidos',
  'DROP POLICY IF EXISTS "Users can create own pedidos" ON pedidos',
  'DROP POLICY IF EXISTS "Admin can manage all pedidos" ON pedidos',
  'DROP POLICY IF EXISTS "Users can view own pedido_detalles" ON pedido_detalles',
  'DROP POLICY IF EXISTS "Users can insert own pedido_detalles" ON pedido_detalles',
  'DROP POLICY IF EXISTS "Admin can manage pedido_detalles" ON pedido_detalles',
  'DROP POLICY IF EXISTS "Users can view own facturas" ON facturas',
  'DROP POLICY IF EXISTS "Users can insert own facturas" ON facturas',
  'DROP POLICY IF EXISTS "Admin can manage facturas" ON facturas',
  'DROP POLICY IF EXISTS "Users can view own reembolsos" ON reembolsos',
  'DROP POLICY IF EXISTS "Admin can manage reembolsos" ON reembolsos',
  'DROP POLICY IF EXISTS "Users can view own envios" ON envios',
  'DROP POLICY IF EXISTS "Admin can manage envios" ON envios',
  'DROP POLICY IF EXISTS "Users can view own documentos" ON documentos',
  'DROP POLICY IF EXISTS "Admin can manage documentos" ON documentos',
  'DROP POLICY IF EXISTS "Admin can view auditoria" ON auditoria',

  `CREATE POLICY "Users can view own profile" ON usuarios FOR SELECT TO authenticated USING (auth_user_id = auth.uid())`,
  `CREATE POLICY "Users can update own profile" ON usuarios FOR UPDATE TO authenticated USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid())`,
  `CREATE POLICY "Allow user registration" ON usuarios FOR INSERT TO authenticated WITH CHECK (auth_user_id = auth.uid())`,
  `CREATE POLICY "Anyone authenticated can view roles" ON roles FOR SELECT TO authenticated USING (true)`,
  `CREATE POLICY "Anyone authenticated can view editoriales" ON editoriales FOR SELECT TO authenticated USING (true)`,
  `CREATE POLICY "Anyone authenticated can view categorias" ON categorias FOR SELECT TO authenticated USING (true)`,
  `CREATE POLICY "Anyone authenticated can view libros" ON libros FOR SELECT TO authenticated USING (activo = true)`,
  `CREATE POLICY "Users can view pedidos" ON pedidos FOR SELECT TO authenticated USING (true)`,
  `CREATE POLICY "Users can create pedidos" ON pedidos FOR INSERT TO authenticated WITH CHECK (true)`,
  `CREATE POLICY "Users can view pedido_detalles" ON pedido_detalles FOR SELECT TO authenticated USING (true)`,
  `CREATE POLICY "Users can insert pedido_detalles" ON pedido_detalles FOR INSERT TO authenticated WITH CHECK (true)`,
  `CREATE POLICY "Users can view facturas" ON facturas FOR SELECT TO authenticated USING (true)`,
  `CREATE POLICY "Users can insert facturas" ON facturas FOR INSERT TO authenticated WITH CHECK (true)`,
  `CREATE POLICY "Users can view reembolsos" ON reembolsos FOR SELECT TO authenticated USING (true)`,
  `CREATE POLICY "Users can view envios" ON envios FOR SELECT TO authenticated USING (true)`,
  `CREATE POLICY "Users can view documentos" ON documentos FOR SELECT TO authenticated USING (true)`,
  `CREATE POLICY "Users can view auditoria" ON auditoria FOR SELECT TO authenticated USING (true)`
];

async function executeSQLStatement(sql) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ query: sql })
    });

    return { success: response.ok, status: response.status, error: await response.text() };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function applyMigration() {
  console.log('🚀 Intentando aplicar migración de corrección de RLS...\n');
  console.log('⚠️  Nota: Es probable que esto falle porque la ANON_KEY no tiene permisos.\n');

  let attempted = 0;

  for (const sql of SQL_STATEMENTS) {
    attempted++;
    const preview = sql.substring(0, 70) + (sql.length > 70 ? '...' : '');
    console.log(`[${attempted}/${SQL_STATEMENTS.length}] ${preview}`);

    const result = await executeSQLStatement(sql);
    if (result.success) {
      console.log('  ✅\n');
    } else {
      console.log(`  ❌ ${result.error.substring(0, 100)}\n`);
      break;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.error('❌ Como era de esperar, no se puede ejecutar SQL con ANON_KEY.\n');
  console.error('📋 DEBES aplicar la migración manualmente:\n');
  console.error('PASOS:');
  console.error('1. En la pantalla donde ves las tablas (Database Tables)');
  console.error('2. Busca un botón que diga "SQL" o "Run SQL" o un ícono </>');
  console.error('3. Si no lo ves, busca en la parte superior una pestaña "SQL Editor"');
  console.error('4. Abre el archivo: supabase/migrations/20251002000000_fix_rls_circular_policies.sql');
  console.error('5. Copia TODO el contenido');
  console.error('6. Pégalo en el editor SQL');
  console.error('7. Haz clic en "Run" o "Execute"\n');
  console.error('Si estás en Bolt y no ves forma de ejecutar SQL:');
  console.error('- Contacta al soporte de Bolt');
  console.error('- O pide acceso directo al dashboard de Supabase');
  console.error('='.repeat(70) + '\n');
}

applyMigration();
