-- Script de diagnóstico de permisos
-- Ejecuta esto en el SQL Editor de Supabase

-- 1. Ver tu usuario actual
SELECT
  auth.uid() as auth_user_id,
  u.id as usuario_id,
  u.email,
  u.rol_id,
  r.nombre as rol_nombre
FROM usuarios u
LEFT JOIN roles r ON r.id = u.rol_id
WHERE u.auth_user_id = auth.uid();

-- 2. Verificar las funciones de permisos
SELECT
  'is_editor()' as funcion,
  is_editor() as resultado
UNION ALL
SELECT
  'can_manage_books()' as funcion,
  can_manage_books() as resultado
UNION ALL
SELECT
  'can_view_all()' as funcion,
  can_view_all() as resultado;

-- 3. Probar el UPDATE directamente
UPDATE libros
SET titulo = 'TEST UPDATE - Configuración del estado constitucional en España',
    isbn = '9788491482871'
WHERE id = 249128
RETURNING *;

-- 4. Verificar políticas RLS activas en libros
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'libros'
ORDER BY cmd, policyname;
