-- ============================================================
-- PARCHE CRÍTICO: CORREGIR FUNCIONES DE PERMISOS
-- ============================================================
-- Problema: Las funciones están buscando tabla rol_permisos que NO existe
-- Solución: Recrear todas las funciones usando SOLO usuarios y roles
-- ============================================================

-- PASO 1: ELIMINAR todas las funciones anteriores (pueden estar rotas)
DROP FUNCTION IF EXISTS obtener_permisos_usuario() CASCADE;
DROP FUNCTION IF EXISTS is_super_admin() CASCADE;
DROP FUNCTION IF EXISTS is_admin() CASCADE;
DROP FUNCTION IF EXISTS is_editor() CASCADE;
DROP FUNCTION IF EXISTS can_manage_books() CASCADE;
DROP FUNCTION IF EXISTS can_manage_users() CASCADE;
DROP FUNCTION IF EXISTS can_manage_orders() CASCADE;
DROP FUNCTION IF EXISTS can_manage_invoices() CASCADE;
DROP FUNCTION IF EXISTS can_view_all() CASCADE;

-- PASO 2: VERIFICAR que las tablas necesarias existen
SELECT 
  'VERIFICACIÓN TABLAS' as paso,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'usuarios') as tabla_usuarios_existe,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') as tabla_roles_existe,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'rol_permisos') as tabla_rol_permisos_existe;

-- PASO 3: CREAR función principal obtener_permisos_usuario
-- Esta función SOLO usa las tablas usuarios y roles
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
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.auth_user_id as user_id,
    u.username::text,
    u.email::text,
    r.nombre::text as rol_nombre,
    r.display_name::text as rol_display_name,
    r.nivel_jerarquia,
    (r.nombre = 'super_admin')::boolean as is_super_admin,
    (r.nombre IN ('super_admin', 'admin'))::boolean as is_admin,
    (r.nombre IN ('super_admin', 'admin', 'editor'))::boolean as is_editor,
    (r.nombre IN ('super_admin', 'admin', 'editor'))::boolean as can_manage_books,
    (r.nombre IN ('super_admin', 'admin'))::boolean as can_manage_users,
    (r.nombre IN ('super_admin', 'admin', 'editor'))::boolean as can_manage_orders,
    (r.nombre IN ('super_admin', 'admin', 'editor', 'visualizador'))::boolean as can_manage_invoices,
    (r.nombre IN ('super_admin', 'admin', 'editor', 'visualizador'))::boolean as can_view_all
  FROM usuarios u
  INNER JOIN roles r ON u.rol_id = r.id
  WHERE u.auth_user_id = auth.uid()
    AND u.activo = true;
END;
$$;

-- PASO 4: CREAR funciones helper individuales
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM usuarios u
    INNER JOIN roles r ON u.rol_id = r.id
    WHERE u.auth_user_id = auth.uid()
      AND u.activo = true
      AND r.nombre = 'super_admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM usuarios u
    INNER JOIN roles r ON u.rol_id = r.id
    WHERE u.auth_user_id = auth.uid()
      AND u.activo = true
      AND r.nombre IN ('super_admin', 'admin')
  );
END;
$$;

CREATE OR REPLACE FUNCTION is_editor()
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM usuarios u
    INNER JOIN roles r ON u.rol_id = r.id
    WHERE u.auth_user_id = auth.uid()
      AND u.activo = true
      AND r.nombre IN ('super_admin', 'admin', 'editor')
  );
END;
$$;

CREATE OR REPLACE FUNCTION can_manage_books()
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM usuarios u
    INNER JOIN roles r ON u.rol_id = r.id
    WHERE u.auth_user_id = auth.uid()
      AND u.activo = true
      AND r.nombre IN ('super_admin', 'admin', 'editor')
  );
END;
$$;

CREATE OR REPLACE FUNCTION can_manage_users()
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM usuarios u
    INNER JOIN roles r ON u.rol_id = r.id
    WHERE u.auth_user_id = auth.uid()
      AND u.activo = true
      AND r.nombre IN ('super_admin', 'admin')
  );
END;
$$;

CREATE OR REPLACE FUNCTION can_manage_orders()
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM usuarios u
    INNER JOIN roles r ON u.rol_id = r.id
    WHERE u.auth_user_id = auth.uid()
      AND u.activo = true
      AND r.nombre IN ('super_admin', 'admin', 'editor')
  );
END;
$$;

CREATE OR REPLACE FUNCTION can_manage_invoices()
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM usuarios u
    INNER JOIN roles r ON u.rol_id = r.id
    WHERE u.auth_user_id = auth.uid()
      AND u.activo = true
      AND r.nombre IN ('super_admin', 'admin', 'editor', 'visualizador')
  );
END;
$$;

CREATE OR REPLACE FUNCTION can_view_all()
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM usuarios u
    INNER JOIN roles r ON u.rol_id = r.id
    WHERE u.auth_user_id = auth.uid()
      AND u.activo = true
      AND r.nombre IN ('super_admin', 'admin', 'editor', 'visualizador')
  );
END;
$$;

-- PASO 5: OTORGAR permisos para ejecutar las funciones
GRANT EXECUTE ON FUNCTION obtener_permisos_usuario() TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_editor() TO authenticated;
GRANT EXECUTE ON FUNCTION can_manage_books() TO authenticated;
GRANT EXECUTE ON FUNCTION can_manage_users() TO authenticated;
GRANT EXECUTE ON FUNCTION can_manage_orders() TO authenticated;
GRANT EXECUTE ON FUNCTION can_manage_invoices() TO authenticated;
GRANT EXECUTE ON FUNCTION can_view_all() TO authenticated;

-- PASO 6: VERIFICACIÓN - Ver tu usuario
SELECT 
  'TU USUARIO' as verificacion,
  auth.uid() as auth_uid,
  u.id,
  u.username,
  u.email,
  u.activo,
  r.nombre as rol
FROM usuarios u
LEFT JOIN roles r ON u.rol_id = r.id
WHERE u.auth_user_id = auth.uid();

-- PASO 7: VERIFICACIÓN - Probar la función principal
SELECT 
  'FUNCIÓN PRINCIPAL' as verificacion,
  * 
FROM obtener_permisos_usuario();

-- PASO 8: VERIFICACIÓN - Probar funciones individuales
SELECT 
  'FUNCIONES INDIVIDUALES' as verificacion,
  is_super_admin() as es_super_admin,
  is_admin() as es_admin,
  is_editor() as es_editor,
  can_manage_books() as puede_gestionar_libros,
  can_view_all() as puede_ver_todo;

-- PASO 9: VERIFICACIÓN - Listar todas las funciones creadas
SELECT 
  'FUNCIONES DISPONIBLES' as verificacion,
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'obtener_permisos_usuario',
    'is_super_admin',
    'is_admin',
    'is_editor',
    'can_manage_books',
    'can_manage_users',
    'can_manage_orders',
    'can_manage_invoices',
    'can_view_all'
  )
ORDER BY routine_name;
