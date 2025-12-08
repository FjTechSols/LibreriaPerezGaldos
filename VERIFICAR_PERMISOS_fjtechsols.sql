-- ======================================
-- VERIFICACIÓN COMPLETA DE PERMISOS
-- Usuario: fjtechsols@gmail.com
-- Auth ID: 11390019-f7fc-4046-abe4-a55150e52392
-- ======================================

-- 1. VERIFICAR ESTRUCTURA DE TABLA ROLES
SELECT 
  '1. ESTRUCTURA TABLA ROLES' as paso,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'roles'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. VER TODOS LOS ROLES EXISTENTES
SELECT 
  '2. ROLES EXISTENTES' as paso,
  id,
  nombre,
  descripcion,
  CASE 
    WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='roles' AND column_name='nivel') 
    THEN (SELECT nivel FROM roles r WHERE r.id = roles.id)::text
    WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='roles' AND column_name='jerarquia')
    THEN (SELECT jerarquia FROM roles r WHERE r.id = roles.id)::text
    ELSE 'sin nivel'
  END as nivel_o_jerarquia
FROM roles
ORDER BY id;

-- 3. BUSCAR TU USUARIO EN LA TABLA USUARIOS
SELECT 
  '3. TU USUARIO EN TABLA USUARIOS' as paso,
  u.id::text,
  u.auth_user_id::text,
  u.username,
  u.email,
  u.rol_id,
  r.nombre as rol_nombre,
  u.activo,
  u.fecha_registro
FROM usuarios u
LEFT JOIN roles r ON u.rol_id = r.id
WHERE u.auth_user_id = '11390019-f7fc-4046-abe4-a55150e52392'::uuid;

-- 4. VERIFICAR SI TIENES ROL ADMIN (método directo)
SELECT 
  '4. VERIFICACIÓN DIRECTA ROL ADMIN' as paso,
  EXISTS (
    SELECT 1 FROM usuarios u
    INNER JOIN roles r ON u.rol_id = r.id
    WHERE u.auth_user_id = '11390019-f7fc-4046-abe4-a55150e52392'::uuid
      AND r.nombre = 'admin'
      AND u.activo = true
  )::text as tiene_rol_admin;

-- 5. VERIFICAR SI TIENES ROL EDITOR O ADMIN
SELECT 
  '5. VERIFICACIÓN ROL EDITOR O ADMIN' as paso,
  EXISTS (
    SELECT 1 FROM usuarios u
    INNER JOIN roles r ON u.rol_id = r.id
    WHERE u.auth_user_id = '11390019-f7fc-4046-abe4-a55150e52392'::uuid
      AND r.nombre IN ('admin', 'editor')
      AND u.activo = true
  )::text as tiene_permisos_edicion;

-- 6. VERIFICAR PERMISOS PARA GESTIONAR LIBROS
SELECT 
  '6. VERIFICACIÓN CAN_MANAGE_BOOKS' as paso,
  EXISTS (
    SELECT 1 FROM usuarios u
    INNER JOIN roles r ON u.rol_id = r.id
    WHERE u.auth_user_id = '11390019-f7fc-4046-abe4-a55150e52392'::uuid
      AND r.nombre IN ('admin', 'editor')
      AND u.activo = true
  )::text as puede_gestionar_libros;

-- 7. VERIFICAR PERMISOS PARA VER TODO
SELECT 
  '7. VERIFICACIÓN CAN_VIEW_ALL' as paso,
  EXISTS (
    SELECT 1 FROM usuarios u
    INNER JOIN roles r ON u.rol_id = r.id
    WHERE u.auth_user_id = '11390019-f7fc-4046-abe4-a55150e52392'::uuid
      AND r.nombre IN ('admin', 'editor')
      AND u.activo = true
  )::text as puede_ver_todo;
