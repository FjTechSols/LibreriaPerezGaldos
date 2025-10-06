/*
  # Tabla de Lista de Deseos (Wishlist)

  ## 1. Nueva Tabla
    - `wishlist`
      - `id` (uuid, clave primaria)
      - `user_id` (uuid, referencia a usuarios)
      - `libro_id` (int, referencia a libros)
      - `created_at` (timestamptz, fecha de creación)

  ## 2. Seguridad
    - RLS habilitado
    - Usuario solo puede ver y modificar su propia wishlist
    - Restricción: un libro solo puede estar una vez por usuario

  ## 3. Índices
    - Índice único en (user_id, libro_id)
    - Índice en user_id para búsquedas rápidas

  ## 4. Funcionalidad
    - Permite guardar libros favoritos del usuario
    - Sincronización automática entre dispositivos
    - Acceso rápido a libros guardados
*/

-- =========================
-- Crear tabla wishlist
-- =========================
CREATE TABLE IF NOT EXISTS wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  libro_id INT NOT NULL REFERENCES libros(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, libro_id)
);

-- =========================
-- Índices
-- =========================
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_libro_id ON wishlist(libro_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_created_at ON wishlist(created_at DESC);

-- =========================
-- Habilitar RLS
-- =========================
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;

-- =========================
-- Políticas RLS
-- =========================

-- SELECT: Usuario solo puede ver su propia wishlist
CREATE POLICY "Users can view own wishlist"
  ON wishlist FOR SELECT
  TO authenticated
  USING (user_id = get_current_user_id());

-- INSERT: Usuario solo puede agregar a su propia wishlist
CREATE POLICY "Users can add to own wishlist"
  ON wishlist FOR INSERT
  TO authenticated
  WITH CHECK (user_id = get_current_user_id());

-- DELETE: Usuario solo puede eliminar de su propia wishlist
CREATE POLICY "Users can delete from own wishlist"
  ON wishlist FOR DELETE
  TO authenticated
  USING (user_id = get_current_user_id());

-- =========================
-- Comentarios
-- =========================
COMMENT ON TABLE wishlist IS 'Almacena los libros favoritos de cada usuario (lista de deseos)';
COMMENT ON COLUMN wishlist.user_id IS 'ID del usuario propietario de la wishlist';
COMMENT ON COLUMN wishlist.libro_id IS 'ID del libro en la wishlist';
