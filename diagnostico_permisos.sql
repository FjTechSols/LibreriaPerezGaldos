-- ==========================================
-- DIAGNÓSTICO DE PERMISOS - VERSIÓN CORREGIDA
-- ==========================================

-- 1. Ver estructura de la tabla usuarios
SELECT 
  'Estructura tabla usuarios' as info,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'usuarios'
ORDER BY ordinal_position;

-- 2. Ver estructura de la tabla roles
SELECT 
  'Estructura tabla roles' as info,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'roles'
ORDER BY ordinal_position;

-- 3. Tu auth.uid() actual
SELECT
  'Tu auth.uid()' as descripcion,
  auth.uid() as valor;

-- 4. Ver todos los usuarios en auth.users
SELECT
  'Usuarios en auth.users' as descripcion,
  id,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 5. Ver todos los registros en tabla usuarios
SELECT
  'Registros en tabla usuarios' as descripcion,
  *
FROM usuarios
ORDER BY created_at DESC
LIMIT 5;

-- 6. Ver todos los roles
SELECT
  'Roles disponibles' as descripcion,
  *
FROM roles
ORDER BY id;

-- 7. Buscar tu usuario específicamente
SELECT
  'Tu usuario' as descripcion,
  u.*,
  r.*
FROM usuarios u
LEFT JOIN roles r ON u.rol_id = r.id
WHERE u.auth_user_id = auth.uid();
