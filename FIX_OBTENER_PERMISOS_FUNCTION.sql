-- ============================================================
-- DIAGNÓSTICO Y CORRECCIÓN COMPLETA
-- ============================================================

-- PASO 1: Ver la estructura real de la tabla usuarios
SELECT 
  'ESTRUCTURA TABLA USUARIOS' as seccion,
  column_name,
  data_type,
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'usuarios'
ORDER BY ordinal_position;

-- PASO 2: Ver tu usuario actual con auth.uid()
SELECT 
  'TU USUARIO ACTUAL' as seccion,
  auth.uid() as tu_auth_uid,
  u.id,
  u.auth_user_id,
  u.username,
  u.email,
  u.activo,
  u.rol_id,
  r.nombre as rol_nombre,
  r.display_name,
  r.nivel_jerarquia
FROM usuarios u
LEFT JOIN roles r ON u.rol_id = r.id
WHERE u.auth_user_id = auth.uid();

-- PASO 3: Ver TODOS los usuarios (para debug)
SELECT 
  'TODOS LOS USUARIOS' as seccion,
  u.id,
  u.auth_user_id,
  u.username,
  u.email,
  u.activo,
  r.nombre as rol_nombre
FROM usuarios u
LEFT JOIN roles r ON u.rol_id = r.id
ORDER BY u.id;

-- PASO 4: Corregir la función obtener_permisos_usuario con tipos correctos
CREATE OR REPLACE FUNCTION obtener_permisos_usuario()
RETURNS TABLE (
  user_id uuid,
  username varchar,
  email varchar,
  rol_nombre varchar,
  rol_display_name varchar,
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
    u.username::varchar,
    u.email::varchar,
    r.nombre::varchar as rol_nombre,
    r.display_name::varchar as rol_display_name,
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

-- PASO 5: Probar la función corregida
SELECT * FROM obtener_permisos_usuario();

-- PASO 6: Probar las funciones individuales
SELECT 
  'FUNCIONES INDIVIDUALES' as titulo,
  is_super_admin() as es_super_admin,
  is_admin() as es_admin,
  is_editor() as es_editor,
  can_manage_books() as puede_gestionar_libros,
  can_view_all() as puede_ver_todo;
