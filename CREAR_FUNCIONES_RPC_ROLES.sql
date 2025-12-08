-- ============================================================
-- CORRECCIÓN FUNCIONES RPC - RECONOCER JERARQUÍA COMPLETA
-- ============================================================
-- Este script actualiza todas las funciones RPC para que
-- reconozcan correctamente super_admin, admin y editor
-- según la jerarquía de roles del sistema.
-- ============================================================

-- 1. Función: is_super_admin
-- Verifica si el usuario actual es super_admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM usuarios u
    INNER JOIN roles r ON u.rol_id = r.id
    WHERE u.auth_user_id = auth.uid()
      AND r.nombre = 'super_admin'
      AND u.activo = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Función: is_admin (actualizada)
-- Verifica si el usuario es admin O super_admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM usuarios u
    INNER JOIN roles r ON u.rol_id = r.id
    WHERE u.auth_user_id = auth.uid()
      AND r.nombre IN ('super_admin', 'admin')
      AND u.activo = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Función: is_editor (actualizada)
-- Verifica si el usuario es editor, admin O super_admin
CREATE OR REPLACE FUNCTION is_editor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM usuarios u
    INNER JOIN roles r ON u.rol_id = r.id
    WHERE u.auth_user_id = auth.uid()
      AND r.nombre IN ('super_admin', 'admin', 'editor')
      AND u.activo = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Función: can_manage_books (actualizada)
-- Verifica permisos para gestionar libros
CREATE OR REPLACE FUNCTION can_manage_books()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM usuarios u
    INNER JOIN roles r ON u.rol_id = r.id
    WHERE u.auth_user_id = auth.uid()
      AND r.nombre IN ('super_admin', 'admin', 'editor')
      AND u.activo = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Función: can_view_all (actualizada)
-- Verifica permisos para ver todo
CREATE OR REPLACE FUNCTION can_view_all()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM usuarios u
    INNER JOIN roles r ON u.rol_id = r.id
    WHERE u.auth_user_id = auth.uid()
      AND r.nombre IN ('super_admin', 'admin', 'editor', 'visualizador')
      AND u.activo = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Función: obtener_permisos_usuario (actualizada)
-- Retorna todos los permisos del usuario actual
CREATE OR REPLACE FUNCTION obtener_permisos_usuario()
RETURNS TABLE (
  user_id uuid,
  username text,
  email text,
  rol_nombre text,
  rol_display_name text,
  nivel_jerarquia integer,
  is_super_admin boolean,
  is_admin boolean,
  is_editor boolean,
  can_manage_books boolean,
  can_manage_users boolean,
  can_manage_orders boolean,
  can_manage_invoices boolean,
  can_view_all boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.auth_user_id as user_id,
    u.username,
    u.email,
    r.nombre as rol_nombre,
    r.display_name as rol_display_name,
    r.nivel_jerarquia,
    (r.nombre = 'super_admin') as is_super_admin,
    (r.nombre IN ('super_admin', 'admin')) as is_admin,
    (r.nombre IN ('super_admin', 'admin', 'editor')) as is_editor,
    (r.nombre IN ('super_admin', 'admin', 'editor')) as can_manage_books,
    (r.nombre IN ('super_admin', 'admin')) as can_manage_users,
    (r.nombre IN ('super_admin', 'admin', 'editor')) as can_manage_orders,
    (r.nombre IN ('super_admin', 'admin', 'editor')) as can_manage_invoices,
    (r.nombre IN ('super_admin', 'admin', 'editor', 'visualizador')) as can_view_all
  FROM usuarios u
  INNER JOIN roles r ON u.rol_id = r.id
  WHERE u.auth_user_id = auth.uid()
    AND u.activo = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. VERIFICACIÓN: Probar la función con tu usuario
SELECT 
  'VERIFICACIÓN DE PERMISOS DESPUÉS DE ACTUALIZAR' as titulo,
  *
FROM obtener_permisos_usuario();

-- 8. VERIFICACIÓN: Probar cada función individual
SELECT 
  'FUNCIONES INDIVIDUALES' as titulo,
  is_super_admin() as es_super_admin,
  is_admin() as es_admin,
  is_editor() as es_editor,
  can_manage_books() as puede_gestionar_libros,
  can_view_all() as puede_ver_todo;
