/*
  # Actualizar Políticas RLS para usar el Nuevo Sistema de Permisos

  ## Problema Identificado
    - La función is_admin() verifica rol_id = 1 (sistema antiguo)
    - No funciona con el nuevo sistema de roles (super_admin = rol_id 5)
    - No verifica la tabla usuarios_roles
    - Los UPDATEs fallan silenciosamente por políticas RLS restrictivas

  ## Solución
    - Crear nuevas funciones RLS que usen el sistema de permisos
    - Actualizar todas las políticas de libros, editoriales, categorías, etc.
    - Verificar permisos usando las funciones RPC correctas

  ## Funciones RLS Actualizadas
    - can_manage_books(): Verifica permiso para gestionar libros
    - can_manage_users(): Verifica permiso para gestionar usuarios
    - can_manage_orders(): Verifica permiso para gestionar pedidos
    - can_manage_invoices(): Verifica permiso para gestionar facturas
    - is_editor(): Verifica si el usuario tiene rol editor o superior
    - is_admin(): Actualizada para funcionar con el nuevo sistema
*/

-- =====================================================
-- Eliminar funciones RLS antiguas
-- =====================================================

DROP FUNCTION IF EXISTS is_admin();
DROP FUNCTION IF EXISTS is_editor();
DROP FUNCTION IF EXISTS can_manage_books();
DROP FUNCTION IF EXISTS can_manage_users();
DROP FUNCTION IF EXISTS can_manage_orders();
DROP FUNCTION IF EXISTS can_manage_invoices();
DROP FUNCTION IF EXISTS can_view_all();

-- =====================================================
-- Función: is_admin
-- Verifica si el usuario es admin o super_admin
-- =====================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  tiene_rol BOOLEAN;
BEGIN
  -- Verificar en usuarios_roles (sistema nuevo)
  SELECT EXISTS (
    SELECT 1
    FROM roles r
    INNER JOIN usuarios_roles ur ON r.id = ur.rol_id
    WHERE ur.user_id = auth.uid()
      AND r.nombre IN ('super_admin', 'admin')
      AND ur.activo = true
      AND r.activo = true
  ) INTO tiene_rol;

  IF tiene_rol THEN
    RETURN true;
  END IF;

  -- Verificar en usuarios.rol_id (sistema legacy)
  SELECT EXISTS (
    SELECT 1
    FROM usuarios u
    INNER JOIN roles r ON u.rol_id = r.id
    WHERE u.auth_user_id = auth.uid()
      AND r.nombre IN ('super_admin', 'admin')
      AND u.activo = true
      AND r.activo = true
  ) INTO tiene_rol;

  RETURN COALESCE(tiene_rol, false);
END;
$$;

-- =====================================================
-- Función: is_editor
-- Verifica si el usuario tiene permisos de editor o superior
-- =====================================================

CREATE OR REPLACE FUNCTION is_editor()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  tiene_rol BOOLEAN;
BEGIN
  -- Verificar en usuarios_roles (sistema nuevo)
  SELECT EXISTS (
    SELECT 1
    FROM roles r
    INNER JOIN usuarios_roles ur ON r.id = ur.rol_id
    WHERE ur.user_id = auth.uid()
      AND r.nombre IN ('super_admin', 'admin', 'editor')
      AND ur.activo = true
      AND r.activo = true
  ) INTO tiene_rol;

  IF tiene_rol THEN
    RETURN true;
  END IF;

  -- Verificar en usuarios.rol_id (sistema legacy)
  SELECT EXISTS (
    SELECT 1
    FROM usuarios u
    INNER JOIN roles r ON u.rol_id = r.id
    WHERE u.auth_user_id = auth.uid()
      AND r.nombre IN ('super_admin', 'admin', 'editor')
      AND u.activo = true
      AND r.activo = true
  ) INTO tiene_rol;

  RETURN COALESCE(tiene_rol, false);
END;
$$;

-- =====================================================
-- Función: can_manage_books
-- Verifica si puede gestionar libros
-- =====================================================

CREATE OR REPLACE FUNCTION can_manage_books()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN is_editor();
END;
$$;

-- =====================================================
-- Función: can_manage_users
-- Verifica si puede gestionar usuarios
-- =====================================================

CREATE OR REPLACE FUNCTION can_manage_users()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN is_admin();
END;
$$;

-- =====================================================
-- Función: can_manage_orders
-- Verifica si puede gestionar pedidos
-- =====================================================

CREATE OR REPLACE FUNCTION can_manage_orders()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN is_editor();
END;
$$;

-- =====================================================
-- Función: can_manage_invoices
-- Verifica si puede gestionar facturas
-- =====================================================

CREATE OR REPLACE FUNCTION can_manage_invoices()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  tiene_rol BOOLEAN;
BEGIN
  -- Verificar en usuarios_roles (sistema nuevo)
  SELECT EXISTS (
    SELECT 1
    FROM roles r
    INNER JOIN usuarios_roles ur ON r.id = ur.rol_id
    WHERE ur.user_id = auth.uid()
      AND r.nombre IN ('super_admin', 'admin', 'editor', 'visualizador')
      AND ur.activo = true
      AND r.activo = true
  ) INTO tiene_rol;

  IF tiene_rol THEN
    RETURN true;
  END IF;

  -- Verificar en usuarios.rol_id (sistema legacy)
  SELECT EXISTS (
    SELECT 1
    FROM usuarios u
    INNER JOIN roles r ON u.rol_id = r.id
    WHERE u.auth_user_id = auth.uid()
      AND r.nombre IN ('super_admin', 'admin', 'editor', 'visualizador')
      AND u.activo = true
      AND r.activo = true
  ) INTO tiene_rol;

  RETURN COALESCE(tiene_rol, false);
END;
$$;

-- =====================================================
-- Función: can_view_all
-- Verifica si puede ver todo
-- =====================================================

CREATE OR REPLACE FUNCTION can_view_all()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN can_manage_invoices();
END;
$$;

-- =====================================================
-- Actualizar políticas RLS de LIBROS
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can view active books" ON libros;
DROP POLICY IF EXISTS "Anonymous users can view active books" ON libros;
DROP POLICY IF EXISTS "Public can view active books" ON libros;
DROP POLICY IF EXISTS "Admin can insert books" ON libros;
DROP POLICY IF EXISTS "Editor can insert books" ON libros;
DROP POLICY IF EXISTS "Admin can update books" ON libros;
DROP POLICY IF EXISTS "Editor can update books" ON libros;
DROP POLICY IF EXISTS "Admin can delete books" ON libros;

-- Permitir a usuarios ANÓNIMOS ver libros activos (para la página principal)
CREATE POLICY "Public can view active books"
  ON libros FOR SELECT
  TO public
  USING (activo = true);

-- Permitir a usuarios AUTENTICADOS ver libros activos o todos si son editores
CREATE POLICY "Authenticated users can view books"
  ON libros FOR SELECT
  TO authenticated
  USING (activo = true OR can_manage_books());

CREATE POLICY "Editor can insert books"
  ON libros FOR INSERT
  TO authenticated
  WITH CHECK (can_manage_books());

CREATE POLICY "Editor can update books"
  ON libros FOR UPDATE
  TO authenticated
  USING (can_manage_books())
  WITH CHECK (can_manage_books());

CREATE POLICY "Admin can delete books"
  ON libros FOR DELETE
  TO authenticated
  USING (is_admin());

-- =====================================================
-- Actualizar políticas RLS de EDITORIALES
-- =====================================================

DROP POLICY IF EXISTS "Anyone authenticated can view editoriales" ON editoriales;
DROP POLICY IF EXISTS "Public can view editoriales" ON editoriales;
DROP POLICY IF EXISTS "Admin can insert editoriales" ON editoriales;
DROP POLICY IF EXISTS "Editor can insert editoriales" ON editoriales;
DROP POLICY IF EXISTS "Admin can update editoriales" ON editoriales;
DROP POLICY IF EXISTS "Editor can update editoriales" ON editoriales;
DROP POLICY IF EXISTS "Admin can delete editoriales" ON editoriales;

-- Permitir a TODOS (anónimos y autenticados) ver editoriales
CREATE POLICY "Public can view editoriales"
  ON editoriales FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Editor can insert editoriales"
  ON editoriales FOR INSERT
  TO authenticated
  WITH CHECK (can_manage_books());

CREATE POLICY "Editor can update editoriales"
  ON editoriales FOR UPDATE
  TO authenticated
  USING (can_manage_books())
  WITH CHECK (can_manage_books());

CREATE POLICY "Admin can delete editoriales"
  ON editoriales FOR DELETE
  TO authenticated
  USING (is_admin());

-- =====================================================
-- Actualizar políticas RLS de CATEGORIAS
-- =====================================================

DROP POLICY IF EXISTS "Anyone authenticated can view categorias" ON categorias;
DROP POLICY IF EXISTS "Public can view categorias" ON categorias;
DROP POLICY IF EXISTS "Admin can insert categorias" ON categorias;
DROP POLICY IF EXISTS "Editor can insert categorias" ON categorias;
DROP POLICY IF EXISTS "Admin can update categorias" ON categorias;
DROP POLICY IF EXISTS "Editor can update categorias" ON categorias;
DROP POLICY IF EXISTS "Admin can delete categorias" ON categorias;

-- Permitir a TODOS (anónimos y autenticados) ver categorías
CREATE POLICY "Public can view categorias"
  ON categorias FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Editor can insert categorias"
  ON categorias FOR INSERT
  TO authenticated
  WITH CHECK (can_manage_books());

CREATE POLICY "Editor can update categorias"
  ON categorias FOR UPDATE
  TO authenticated
  USING (can_manage_books())
  WITH CHECK (can_manage_books());

CREATE POLICY "Admin can delete categorias"
  ON categorias FOR DELETE
  TO authenticated
  USING (is_admin());

-- =====================================================
-- Actualizar políticas RLS de USUARIOS
-- =====================================================

DROP POLICY IF EXISTS "Users can view own profile" ON usuarios;
DROP POLICY IF EXISTS "Users can update own profile" ON usuarios;
DROP POLICY IF EXISTS "Admin can view all users" ON usuarios;
DROP POLICY IF EXISTS "Admin can insert users" ON usuarios;
DROP POLICY IF EXISTS "Admin can update users" ON usuarios;
DROP POLICY IF EXISTS "Admin can delete users" ON usuarios;

CREATE POLICY "Users can view own profile"
  ON usuarios FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid() OR can_manage_users());

CREATE POLICY "Users can update own profile"
  ON usuarios FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Admin can view all users"
  ON usuarios FOR SELECT
  TO authenticated
  USING (can_manage_users());

CREATE POLICY "Admin can insert users"
  ON usuarios FOR INSERT
  TO authenticated
  WITH CHECK (can_manage_users());

CREATE POLICY "Admin can update users"
  ON usuarios FOR UPDATE
  TO authenticated
  USING (can_manage_users())
  WITH CHECK (can_manage_users());

CREATE POLICY "Admin can delete users"
  ON usuarios FOR DELETE
  TO authenticated
  USING (can_manage_users());

-- =====================================================
-- Otorgar permisos de ejecución
-- =====================================================

GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_editor() TO authenticated;
GRANT EXECUTE ON FUNCTION can_manage_books() TO authenticated;
GRANT EXECUTE ON FUNCTION can_manage_users() TO authenticated;
GRANT EXECUTE ON FUNCTION can_manage_orders() TO authenticated;
GRANT EXECUTE ON FUNCTION can_manage_invoices() TO authenticated;
GRANT EXECUTE ON FUNCTION can_view_all() TO authenticated;

-- =====================================================
-- Comentarios de documentación
-- =====================================================

COMMENT ON FUNCTION is_admin() IS
  'Verifica si el usuario tiene rol admin o super_admin (nivel_jerarquia <= 20)';

COMMENT ON FUNCTION is_editor() IS
  'Verifica si el usuario tiene rol editor, admin o super_admin';

COMMENT ON FUNCTION can_manage_books() IS
  'Verifica si el usuario puede gestionar libros (editor o superior)';

COMMENT ON FUNCTION can_manage_users() IS
  'Verifica si el usuario puede gestionar usuarios (admin o super_admin)';

COMMENT ON FUNCTION can_manage_orders() IS
  'Verifica si el usuario puede gestionar pedidos (editor o superior)';

COMMENT ON FUNCTION can_manage_invoices() IS
  'Verifica si el usuario puede gestionar facturas (visualizador o superior)';

COMMENT ON FUNCTION can_view_all() IS
  'Verifica si el usuario puede ver todos los datos (visualizador o superior)';
