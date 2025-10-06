/*
  # Tabla de Clientes

  ## 1. Nueva Tabla
    - `clientes`
      - `id` (uuid, clave primaria)
      - `nombre` (text, nombre del cliente)
      - `apellidos` (text, apellidos del cliente)
      - `email` (text, correo electrónico)
      - `telefono` (text, número de teléfono)
      - `direccion` (text, dirección completa)
      - `ciudad` (text, ciudad)
      - `codigo_postal` (text, código postal)
      - `provincia` (text, provincia)
      - `pais` (text, país, default 'España')
      - `nif` (text, NIF/CIF/DNI)
      - `notas` (text, notas internas)
      - `activo` (boolean, cliente activo, default true)
      - `created_at` (timestamptz, fecha de creación)
      - `updated_at` (timestamptz, fecha de actualización)

  ## 2. Seguridad
    - RLS habilitado
    - Solo administradores pueden crear, modificar y eliminar clientes
    - Usuarios autenticados pueden leer clientes (para seleccionar en pedidos/facturas)

  ## 3. Índices
    - Índice en email para búsquedas rápidas
    - Índice en nif para búsquedas rápidas
    - Índice en nombre y apellidos para búsquedas

  ## 4. Relaciones
    - Pedidos y facturas podrán referenciar a clientes
*/

-- =========================
-- Crear tabla clientes
-- =========================
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

-- =========================
-- Índices
-- =========================
CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes(email);
CREATE INDEX IF NOT EXISTS idx_clientes_nif ON clientes(nif);
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes(nombre);
CREATE INDEX IF NOT EXISTS idx_clientes_apellidos ON clientes(apellidos);
CREATE INDEX IF NOT EXISTS idx_clientes_activo ON clientes(activo);

-- =========================
-- Trigger para actualizar updated_at
-- =========================
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

-- =========================
-- Habilitar RLS
-- =========================
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- =========================
-- Políticas RLS
-- =========================

-- SELECT: Usuarios autenticados pueden leer clientes activos
CREATE POLICY "Authenticated users can view active clients"
  ON clientes FOR SELECT
  TO authenticated
  USING (activo = true);

-- INSERT: Solo administradores pueden crear clientes
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

-- UPDATE: Solo administradores pueden actualizar clientes
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

-- DELETE: Solo administradores pueden eliminar clientes (soft delete recomendado)
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

-- =========================
-- Agregar columna cliente_id a pedidos
-- =========================
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

-- =========================
-- Agregar columna cliente_id a facturas
-- =========================
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

-- =========================
-- Comentarios
-- =========================
COMMENT ON TABLE clientes IS 'Almacena información de clientes de la librería para gestión interna';
COMMENT ON COLUMN clientes.nombre IS 'Nombre del cliente';
COMMENT ON COLUMN clientes.apellidos IS 'Apellidos del cliente';
COMMENT ON COLUMN clientes.email IS 'Correo electrónico del cliente';
COMMENT ON COLUMN clientes.telefono IS 'Número de teléfono del cliente';
COMMENT ON COLUMN clientes.direccion IS 'Dirección completa del cliente';
COMMENT ON COLUMN clientes.nif IS 'NIF, CIF o DNI del cliente';
COMMENT ON COLUMN clientes.activo IS 'Indica si el cliente está activo en el sistema';
COMMENT ON COLUMN clientes.notas IS 'Notas internas sobre el cliente';
