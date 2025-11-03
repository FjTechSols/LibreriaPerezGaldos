/*
  # Crear tabla de ubicaciones para libros

  ## 1. Nueva Tabla
    - `ubicaciones`
      - `id` (serial, primary key)
      - `nombre` (varchar, unique) - Nombre de la ubicación (ej: Almacén, H20006547)
      - `descripcion` (text, opcional) - Descripción adicional de la ubicación
      - `activa` (boolean) - Si la ubicación está disponible
      - `created_at` (timestamptz) - Fecha de creación

  ## 2. Datos Iniciales
    - Insertar ubicación "Almacén" como primera opción

  ## 3. Seguridad
    - RLS habilitado en la tabla
    - Todos los usuarios autenticados pueden leer ubicaciones activas
    - Solo admins pueden crear, actualizar o eliminar ubicaciones

  ## 4. Índices
    - Índice único en el nombre
    - Índice en el campo activa para filtros
*/

-- Crear tabla de ubicaciones
CREATE TABLE IF NOT EXISTS ubicaciones (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    activa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Insertar ubicación inicial "Almacén"
INSERT INTO ubicaciones (nombre, descripcion, activa)
VALUES ('Almacén', 'Ubicación principal de almacenamiento', true)
ON CONFLICT (nombre) DO NOTHING;

-- Crear índice en campo activa
CREATE INDEX IF NOT EXISTS idx_ubicaciones_activa ON ubicaciones(activa);

-- Habilitar RLS
ALTER TABLE ubicaciones ENABLE ROW LEVEL SECURITY;

-- Política: Todos los usuarios autenticados pueden leer ubicaciones activas
CREATE POLICY "Usuarios autenticados pueden leer ubicaciones activas"
  ON ubicaciones
  FOR SELECT
  TO authenticated
  USING (activa = true);

-- Política: Solo admins pueden insertar ubicaciones
CREATE POLICY "Solo admins pueden insertar ubicaciones"
  ON ubicaciones
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.auth_user_id = auth.uid()
      AND usuarios.rol_id = 1
    )
  );

-- Política: Solo admins pueden actualizar ubicaciones
CREATE POLICY "Solo admins pueden actualizar ubicaciones"
  ON ubicaciones
  FOR UPDATE
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

-- Política: Solo admins pueden eliminar ubicaciones (soft delete recomendado)
CREATE POLICY "Solo admins pueden eliminar ubicaciones"
  ON ubicaciones
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.auth_user_id = auth.uid()
      AND usuarios.rol_id = 1
    )
  );
