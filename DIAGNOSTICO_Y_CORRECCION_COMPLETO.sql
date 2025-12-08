-- ============================================================
-- DIAGNÓSTICO Y CORRECCIÓN: Crear usuario faltante
-- ============================================================

-- PASO 1: Ver tu auth.uid() actual
SELECT 
  'TU AUTH UID ACTUAL' as diagnostico,
  auth.uid() as tu_auth_uid,
  auth.email() as tu_email;

-- PASO 2: Ver TODOS los usuarios en auth.users (tabla de Supabase Auth)
SELECT 
  'USUARIOS EN AUTH.USERS' as diagnostico,
  id as auth_id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;

-- PASO 3: Ver TODOS los usuarios en la tabla usuarios
SELECT 
  'USUARIOS EN TABLA USUARIOS' as diagnostico,
  u.id,
  u.auth_user_id,
  u.username,
  u.email,
  u.activo,
  r.nombre as rol_nombre
FROM usuarios u
LEFT JOIN roles r ON u.rol_id = r.id
ORDER BY u.created_at DESC;

-- PASO 4: Ver si hay coincidencias entre auth.users y usuarios
SELECT 
  'COINCIDENCIAS' as diagnostico,
  au.id as auth_id,
  au.email as auth_email,
  u.id as usuario_id,
  u.email as usuario_email,
  CASE 
    WHEN u.id IS NULL THEN 'FALTA EN TABLA USUARIOS'
    ELSE 'OK'
  END as estado
FROM auth.users au
LEFT JOIN usuarios u ON au.id = u.auth_user_id
ORDER BY au.created_at DESC;

-- PASO 5: Ver todos los roles disponibles
SELECT 
  'ROLES DISPONIBLES' as diagnostico,
  id,
  nombre,
  display_name,
  nivel_jerarquia
FROM roles
ORDER BY nivel_jerarquia DESC;

-- PASO 6: Crear función helper para crear usuarios faltantes
CREATE OR REPLACE FUNCTION crear_usuario_desde_auth()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_uid uuid;
  v_email text;
  v_username text;
  v_rol_admin_id integer;
BEGIN
  -- Obtener datos del usuario actual
  v_auth_uid := auth.uid();
  v_email := auth.email();
  
  -- Extraer username del email (parte antes del @)
  v_username := split_part(v_email, '@', 1);
  
  -- Obtener el ID del rol admin
  SELECT id INTO v_rol_admin_id
  FROM roles
  WHERE nombre = 'admin'
  LIMIT 1;
  
  -- Si no existe el rol admin, usar el primer rol disponible
  IF v_rol_admin_id IS NULL THEN
    SELECT id INTO v_rol_admin_id
    FROM roles
    ORDER BY nivel_jerarquia DESC
    LIMIT 1;
  END IF;
  
  -- Insertar usuario si no existe
  INSERT INTO usuarios (auth_user_id, username, email, rol_id, activo)
  VALUES (v_auth_uid, v_username, v_email, v_rol_admin_id, true)
  ON CONFLICT (auth_user_id) DO NOTHING;
  
  RAISE NOTICE 'Usuario creado/verificado: % (auth_uid: %)', v_email, v_auth_uid;
END;
$$;

-- PASO 7: Ejecutar la función para crear tu usuario
SELECT crear_usuario_desde_auth();

-- PASO 8: VERIFICAR que tu usuario ahora existe
SELECT 
  'VERIFICACIÓN USUARIO CREADO' as diagnostico,
  auth.uid() as auth_uid,
  u.id,
  u.auth_user_id,
  u.username,
  u.email,
  u.activo,
  r.nombre as rol,
  r.display_name
FROM usuarios u
INNER JOIN roles r ON u.rol_id = r.id
WHERE u.auth_user_id = auth.uid();

-- PASO 9: VERIFICAR permisos del usuario
SELECT 
  'PERMISOS DEL USUARIO' as diagnostico,
  * 
FROM obtener_permisos_usuario();

-- PASO 10: VERIFICAR funciones individuales
SELECT 
  'FUNCIONES INDIVIDUALES' as diagnostico,
  is_super_admin() as es_super_admin,
  is_admin() as es_admin,
  is_editor() as es_editor,
  can_manage_books() as puede_gestionar_libros,
  can_manage_users() as puede_gestionar_usuarios,
  can_view_all() as puede_ver_todo;
