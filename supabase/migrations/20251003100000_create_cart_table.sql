/*
  # Tabla de Carrito de Compras

  ## 1. Nueva Tabla
    - `carritos`
      - `id` (uuid, clave primaria)
      - `user_id` (uuid, referencia a usuarios)
      - `libro_id` (int, referencia a libros)
      - `cantidad` (int, cantidad en el carrito)
      - `created_at` (timestamptz, fecha de creación)
      - `updated_at` (timestamptz, fecha de actualización)

  ## 2. Seguridad
    - RLS habilitado
    - Usuario solo puede ver y modificar su propio carrito
    - Restricción: un libro solo puede estar una vez por usuario

  ## 3. Índices
    - Índice único en (user_id, libro_id)
    - Índice en user_id para búsquedas rápidas

  ## 4. Funcionalidad
    - Permite persistir el carrito del usuario
    - Sincronización automática entre dispositivos
    - Validación de cantidad > 0
*/

-- =========================
-- Crear tabla carritos
-- =========================
CREATE TABLE IF NOT EXISTS carritos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  libro_id INT NOT NULL REFERENCES libros(id) ON DELETE CASCADE,
  cantidad INT NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, libro_id)
);

-- =========================
-- Índices
-- =========================
CREATE INDEX IF NOT EXISTS idx_carritos_user_id ON carritos(user_id);
CREATE INDEX IF NOT EXISTS idx_carritos_libro_id ON carritos(libro_id);

-- =========================
-- Trigger para actualizar updated_at
-- =========================
CREATE OR REPLACE FUNCTION update_carritos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_carritos_updated_at_trigger ON carritos;
CREATE TRIGGER update_carritos_updated_at_trigger
  BEFORE UPDATE ON carritos
  FOR EACH ROW
  EXECUTE FUNCTION update_carritos_updated_at();

-- =========================
-- Habilitar RLS
-- =========================
ALTER TABLE carritos ENABLE ROW LEVEL SECURITY;

-- =========================
-- Políticas RLS
-- =========================

-- SELECT: Usuario solo puede ver su propio carrito
CREATE POLICY "Users can view own cart"
  ON carritos FOR SELECT
  TO authenticated
  USING (user_id = get_current_user_id());

-- INSERT: Usuario solo puede agregar a su propio carrito
CREATE POLICY "Users can add to own cart"
  ON carritos FOR INSERT
  TO authenticated
  WITH CHECK (user_id = get_current_user_id());

-- UPDATE: Usuario solo puede actualizar su propio carrito
CREATE POLICY "Users can update own cart"
  ON carritos FOR UPDATE
  TO authenticated
  USING (user_id = get_current_user_id())
  WITH CHECK (user_id = get_current_user_id());

-- DELETE: Usuario solo puede eliminar de su propio carrito
CREATE POLICY "Users can delete from own cart"
  ON carritos FOR DELETE
  TO authenticated
  USING (user_id = get_current_user_id());

-- =========================
-- Comentarios
-- =========================
COMMENT ON TABLE carritos IS 'Almacena los items del carrito de compra de cada usuario';
COMMENT ON COLUMN carritos.user_id IS 'ID del usuario propietario del carrito';
COMMENT ON COLUMN carritos.libro_id IS 'ID del libro en el carrito';
COMMENT ON COLUMN carritos.cantidad IS 'Cantidad de unidades del libro en el carrito';
