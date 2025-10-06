import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno no encontradas');
  console.error('Asegúrate de que VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY estén definidas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSQLDirect(sql) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    },
    body: JSON.stringify({ sql })
  });

  return response;
}

const migrations = [
  {
    name: 'Tabla Clientes',
    sql: `
-- Crear tabla clientes
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  direccion TEXT,
  ciudad TEXT,
  codigo_postal TEXT,
  provincia TEXT,
  pais TEXT DEFAULT 'España',
  nif TEXT,
  notas TEXT,
  activo BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes(email);
CREATE INDEX IF NOT EXISTS idx_clientes_nif ON clientes(nif);
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes(nombre);
CREATE INDEX IF NOT EXISTS idx_clientes_apellidos ON clientes(apellidos);
CREATE INDEX IF NOT EXISTS idx_clientes_activo ON clientes(activo);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_clientes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_clientes_updated_at_trigger ON clientes;
CREATE TRIGGER update_clientes_updated_at_trigger
  BEFORE UPDATE ON clientes
  FOR EACH ROW
  EXECUTE FUNCTION update_clientes_updated_at();

-- Habilitar RLS
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DROP POLICY IF EXISTS "Authenticated users can view active clients" ON clientes;
CREATE POLICY "Authenticated users can view active clients"
  ON clientes FOR SELECT
  TO authenticated
  USING (activo = true);

DROP POLICY IF EXISTS "Only admins can create clients" ON clientes;
CREATE POLICY "Only admins can create clients"
  ON clientes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.auth_user_id = auth.uid()
      AND usuarios.rol_id = 1
    )
  );

DROP POLICY IF EXISTS "Only admins can update clients" ON clientes;
CREATE POLICY "Only admins can update clients"
  ON clientes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.auth_user_id = auth.uid()
      AND usuarios.rol_id = 1
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.auth_user_id = auth.uid()
      AND usuarios.rol_id = 1
    )
  );

DROP POLICY IF EXISTS "Only admins can delete clients" ON clientes;
CREATE POLICY "Only admins can delete clients"
  ON clientes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.auth_user_id = auth.uid()
      AND usuarios.rol_id = 1
    )
  );
`
  },
  {
    name: 'Agregar cliente_id a pedidos y facturas',
    sql: `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pedidos' AND column_name = 'cliente_id'
  ) THEN
    ALTER TABLE pedidos ADD COLUMN cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_id ON pedidos(cliente_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'facturas' AND column_name = 'cliente_id'
  ) THEN
    ALTER TABLE facturas ADD COLUMN cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_facturas_cliente_id ON facturas(cliente_id);
  END IF;
END $$;
`
  },
  {
    name: 'Tabla Carritos',
    sql: `
-- Crear tabla carritos
CREATE TABLE IF NOT EXISTS carritos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  libro_id INTEGER NOT NULL REFERENCES libros(id) ON DELETE CASCADE,
  cantidad INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, libro_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_carritos_user_id ON carritos(user_id);
CREATE INDEX IF NOT EXISTS idx_carritos_libro_id ON carritos(libro_id);

-- Habilitar RLS
ALTER TABLE carritos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DROP POLICY IF EXISTS "Users can view own cart" ON carritos;
CREATE POLICY "Users can view own cart"
  ON carritos FOR SELECT
  TO authenticated
  USING (
    user_id::text = (
      SELECT id::text FROM usuarios WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own cart" ON carritos;
CREATE POLICY "Users can insert own cart"
  ON carritos FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id::text = (
      SELECT id::text FROM usuarios WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own cart" ON carritos;
CREATE POLICY "Users can update own cart"
  ON carritos FOR UPDATE
  TO authenticated
  USING (
    user_id::text = (
      SELECT id::text FROM usuarios WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own cart" ON carritos;
CREATE POLICY "Users can delete own cart"
  ON carritos FOR DELETE
  TO authenticated
  USING (
    user_id::text = (
      SELECT id::text FROM usuarios WHERE auth_user_id = auth.uid()
    )
  );
`
  },
  {
    name: 'Tabla Wishlist',
    sql: `
-- Crear tabla wishlist
CREATE TABLE IF NOT EXISTS wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  libro_id INTEGER NOT NULL REFERENCES libros(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, libro_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_libro_id ON wishlist(libro_id);

-- Habilitar RLS
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DROP POLICY IF EXISTS "Users can view own wishlist" ON wishlist;
CREATE POLICY "Users can view own wishlist"
  ON wishlist FOR SELECT
  TO authenticated
  USING (
    user_id::text = (
      SELECT id::text FROM usuarios WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own wishlist" ON wishlist;
CREATE POLICY "Users can insert own wishlist"
  ON wishlist FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id::text = (
      SELECT id::text FROM usuarios WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own wishlist" ON wishlist;
CREATE POLICY "Users can delete own wishlist"
  ON wishlist FOR DELETE
  TO authenticated
  USING (
    user_id::text = (
      SELECT id::text FROM usuarios WHERE auth_user_id = auth.uid()
    )
  );
`
  }
];

async function applyMigrations() {
  console.log('🚀 Aplicando migraciones a Supabase...\n');

  for (const migration of migrations) {
    console.log(`📦 Aplicando: ${migration.name}...`);

    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: migration.sql
      }).single();

      if (error) {
        console.error(`   ❌ Error: ${error.message}\n`);
        console.log('   ℹ️  Copiando SQL para ejecución manual...\n');
        console.log('═'.repeat(80));
        console.log(migration.sql);
        console.log('═'.repeat(80));
        console.log('\n   Por favor, ejecuta este SQL manualmente en el SQL Editor de Supabase.\n');
      } else {
        console.log(`   ✅ ${migration.name} aplicada correctamente\n`);
      }
    } catch (err) {
      console.error(`   ❌ Error inesperado: ${err.message}\n`);
      console.log('   ℹ️  SQL para ejecución manual:\n');
      console.log('═'.repeat(80));
      console.log(migration.sql);
      console.log('═'.repeat(80));
      console.log('\n');
    }
  }

  console.log('✨ Proceso completado!\n');
  console.log('📋 Instrucciones si hubo errores:');
  console.log('   1. Copia el SQL mostrado arriba');
  console.log('   2. Ve al SQL Editor de Supabase');
  console.log('   3. Pega y ejecuta el SQL');
  console.log('   4. Recarga la aplicación\n');
}

applyMigrations();
