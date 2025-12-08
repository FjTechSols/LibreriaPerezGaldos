-- =====================================================
-- Actualización del Sistema de Roles
-- =====================================================

-- FUNCIÓN: is_super_admin
DROP FUNCTION IF EXISTS is_super_admin();
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  user_rol INT;
BEGIN
  SELECT rol_id INTO user_rol
  FROM usuarios
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  RETURN COALESCE(user_rol = 1, false);
END;
$$;

-- FUNCIÓN: is_admin (actualizada)
DROP FUNCTION IF EXISTS is_admin();
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  user_rol INT;
BEGIN
  SELECT rol_id INTO user_rol
  FROM usuarios
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  RETURN COALESCE(user_rol IN (1, 2), false);
END;
$$;

-- FUNCIÓN: is_editor
DROP FUNCTION IF EXISTS is_editor();
CREATE OR REPLACE FUNCTION is_editor()
RETURNS BOOLEAN
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  user_rol INT;
BEGIN
  SELECT rol_id INTO user_rol
  FROM usuarios
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  RETURN COALESCE(user_rol IN (1, 2, 3), false);
END;
$$;

-- FUNCIÓN: can_manage_books
DROP FUNCTION IF EXISTS can_manage_books();
CREATE OR REPLACE FUNCTION can_manage_books()
RETURNS BOOLEAN
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN is_editor();
END;
$$;

-- FUNCIÓN: can_view_all
DROP FUNCTION IF EXISTS can_view_all();
CREATE OR REPLACE FUNCTION can_view_all()
RETURNS BOOLEAN
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  user_rol INT;
BEGIN
  SELECT rol_id INTO user_rol
  FROM usuarios
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  RETURN COALESCE(user_rol IN (1, 2, 3, 4), false);
END;
$$;

-- Actualizar política SELECT de libros
DROP POLICY IF EXISTS "Authenticated users can view active books" ON libros;
CREATE POLICY "Authenticated users can view active books"
  ON libros FOR SELECT
  TO authenticated
  USING (activo = true OR can_view_all());

-- Actualizar política UPDATE de libros
DROP POLICY IF EXISTS "Admin can update books" ON libros;
DROP POLICY IF EXISTS "Users with manage books permission can update books" ON libros;
CREATE POLICY "Users with manage books permission can update books"
  ON libros FOR UPDATE
  TO authenticated
  USING (can_manage_books())
  WITH CHECK (can_manage_books());

-- Actualizar política INSERT de libros
DROP POLICY IF EXISTS "Admin can insert books" ON libros;
DROP POLICY IF EXISTS "Users with manage books permission can insert books" ON libros;
CREATE POLICY "Users with manage books permission can insert books"
  ON libros FOR INSERT
  TO authenticated
  WITH CHECK (can_manage_books());

-- Actualizar política DELETE de libros
DROP POLICY IF EXISTS "Admin can delete books" ON libros;
DROP POLICY IF EXISTS "Admins can delete books" ON libros;
CREATE POLICY "Admins can delete books"
  ON libros FOR DELETE
  TO authenticated
  USING (is_admin());
