import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno no encontradas');
  console.error('Asegúrate de que VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY estén definidas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('🚀 Aplicando migración de corrección de RLS...\n');

  const migrationSQL = `
-- Eliminar políticas problemáticas de usuarios
DROP POLICY IF EXISTS "Users can view own profile" ON usuarios;
DROP POLICY IF EXISTS "Users can update own profile" ON usuarios;
DROP POLICY IF EXISTS "Admin can manage all users" ON usuarios;

-- Crear políticas corregidas para usuarios
CREATE POLICY "Users can view own profile" ON usuarios
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON usuarios
  FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Allow user registration" ON usuarios
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_user_id = auth.uid());

-- Eliminar políticas problemáticas de roles
DROP POLICY IF EXISTS "Admin can view roles" ON roles;

CREATE POLICY "Anyone authenticated can view roles" ON roles
  FOR SELECT
  TO authenticated
  USING (true);

-- Actualizar políticas de editoriales
DROP POLICY IF EXISTS "Anyone can view editoriales" ON editoriales;
DROP POLICY IF EXISTS "Admin can manage editoriales" ON editoriales;

CREATE POLICY "Anyone authenticated can view editoriales" ON editoriales
  FOR SELECT
  TO authenticated
  USING (true);

-- Actualizar políticas de categorías
DROP POLICY IF EXISTS "Anyone can view categorias" ON categorias;
DROP POLICY IF EXISTS "Admin can manage categorias" ON categorias;

CREATE POLICY "Anyone authenticated can view categorias" ON categorias
  FOR SELECT
  TO authenticated
  USING (true);

-- Actualizar políticas de libros
DROP POLICY IF EXISTS "Anyone can view active libros" ON libros;
DROP POLICY IF EXISTS "Admin can manage libros" ON libros;

CREATE POLICY "Anyone authenticated can view libros" ON libros
  FOR SELECT
  TO authenticated
  USING (activo = true);

-- Actualizar políticas de pedidos
DROP POLICY IF EXISTS "Users can view own pedidos" ON pedidos;
DROP POLICY IF EXISTS "Users can create own pedidos" ON pedidos;
DROP POLICY IF EXISTS "Admin can manage all pedidos" ON pedidos;

CREATE POLICY "Users can view pedidos" ON pedidos
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create pedidos" ON pedidos
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Actualizar políticas de pedido_detalles
DROP POLICY IF EXISTS "Users can view own pedido_detalles" ON pedido_detalles;
DROP POLICY IF EXISTS "Users can insert own pedido_detalles" ON pedido_detalles;
DROP POLICY IF EXISTS "Admin can manage pedido_detalles" ON pedido_detalles;

CREATE POLICY "Users can view pedido_detalles" ON pedido_detalles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert pedido_detalles" ON pedido_detalles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Actualizar políticas de facturas
DROP POLICY IF EXISTS "Users can view own facturas" ON facturas;
DROP POLICY IF EXISTS "Users can insert own facturas" ON facturas;
DROP POLICY IF EXISTS "Admin can manage facturas" ON facturas;

CREATE POLICY "Users can view facturas" ON facturas
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert facturas" ON facturas
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Actualizar políticas de reembolsos
DROP POLICY IF EXISTS "Users can view own reembolsos" ON reembolsos;
DROP POLICY IF EXISTS "Admin can manage reembolsos" ON reembolsos;

CREATE POLICY "Users can view reembolsos" ON reembolsos
  FOR SELECT
  TO authenticated
  USING (true);

-- Actualizar políticas de envíos
DROP POLICY IF EXISTS "Users can view own envios" ON envios;
DROP POLICY IF EXISTS "Admin can manage envios" ON envios;

CREATE POLICY "Users can view envios" ON envios
  FOR SELECT
  TO authenticated
  USING (true);

-- Actualizar políticas de documentos
DROP POLICY IF EXISTS "Users can view own documentos" ON documentos;
DROP POLICY IF EXISTS "Admin can manage documentos" ON documentos;

CREATE POLICY "Users can view documentos" ON documentos
  FOR SELECT
  TO authenticated
  USING (true);

-- Actualizar políticas de auditoría
DROP POLICY IF EXISTS "Admin can view auditoria" ON auditoria;

CREATE POLICY "Users can view auditoria" ON auditoria
  FOR SELECT
  TO authenticated
  USING (true);
`;

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      console.error('❌ Error al aplicar migración:', error.message);
      console.error('\n⚠️  La ANON_KEY no tiene permisos para ejecutar SQL directamente.');
      console.error('📋 Por favor, copia el SQL y ejecútalo manualmente en el Dashboard de Supabase:');
      console.error('\n1. Ve a: https://supabase.com/dashboard/project/0ec90b57d6e95fcbda19832f/editor');
      console.error('2. Haz clic en "SQL Editor"');
      console.error('3. Pega el contenido del archivo: supabase/migrations/20251002000000_fix_rls_circular_policies.sql');
      console.error('4. Haz clic en "Run"\n');
      process.exit(1);
    }

    console.log('✅ Migración aplicada exitosamente!');
    console.log('🎉 Ahora puedes recargar la aplicación y registrarte.\n');
  } catch (err) {
    console.error('❌ Error inesperado:', err.message);
    console.error('\n📋 Necesitas aplicar la migración manualmente:');
    console.error('\n1. Ve a: https://supabase.com/dashboard/project/0ec90b57d6e95fcbda19832f/editor');
    console.error('2. Haz clic en "SQL Editor"');
    console.error('3. Pega el contenido del archivo: supabase/migrations/20251002000000_fix_rls_circular_policies.sql');
    console.error('4. Haz clic en "Run"\n');
    process.exit(1);
  }
}

applyMigration();
