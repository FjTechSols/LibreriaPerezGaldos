-- ========================================
-- DIAGNÓSTICO DE PERMISOS - PASO A PASO
-- ========================================

-- PASO 1: Ver la estructura de la tabla usuarios
SELECT
  '1_ESTRUCTURA_USUARIOS' as paso,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'usuarios'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- PASO 2: Tu usuario actual
SELECT
  '2_MI_UID' as paso,
  auth.uid()::text as mi_user_id,
  current_user as postgres_user,
  session_user as session;

-- PASO 3: Tu información en auth.users
SELECT
  '3_AUTH_USERS' as paso,
  id::text,
  email,
  COALESCE(raw_user_meta_data->>'role', 'sin_rol') as user_meta_role,
  COALESCE(raw_app_meta_data->>'role', 'sin_rol_app') as app_meta_role
FROM auth.users
WHERE id = auth.uid();

-- PASO 4: Todos los roles disponibles
SELECT
  '4_ROLES_DISPONIBLES' as paso,
  id::text,
  nombre,
  jerarquia
FROM roles
ORDER BY jerarquia DESC;

-- PASO 5: Verificar funciones de permisos
SELECT
  '5_FUNCIONES' as paso,
  'is_admin' as funcion,
  is_admin()::text as resultado
UNION ALL
SELECT
  '5_FUNCIONES',
  'is_editor',
  is_editor()::text
UNION ALL
SELECT
  '5_FUNCIONES',
  'can_manage_books',
  can_manage_books()::text
UNION ALL
SELECT
  '5_FUNCIONES',
  'can_view_all',
  can_view_all()::text;
