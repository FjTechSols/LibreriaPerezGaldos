-- ==========================================
-- DIAGNÓSTICO SIMPLIFICADO
-- ==========================================

-- 1. Ver estructura de tabla usuarios
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'usuarios'
ORDER BY ordinal_position;

-- 2. Ver estructura de tabla roles
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'roles'
ORDER BY ordinal_position;

-- 3. Tu auth.uid()
SELECT auth.uid() as mi_auth_uid;

-- 4. Usuarios en auth.users (solo admin)
SELECT id, email
FROM auth.users
WHERE email ILIKE '%admin%';

-- 5. Todos los datos de tabla usuarios
SELECT * FROM usuarios;

-- 6. Todos los roles
SELECT * FROM roles;

-- 7. Verificar funciones
SELECT
  is_admin() as es_admin,
  is_editor() as es_editor,
  can_manage_books() as puede_gestionar_libros,
  can_view_all() as puede_ver_todo;
