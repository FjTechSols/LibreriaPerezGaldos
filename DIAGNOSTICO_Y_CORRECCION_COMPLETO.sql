-- ==========================================
-- DIAGNÓSTICO Y CORRECCIÓN COMPLETO
-- Para usuario super_admin
-- ==========================================

-- 1. Ver tu auth.uid() actual
SELECT
  'Tu auth.uid() actual' as descripcion,
  auth.uid() as valor;

-- 2. Ver tu email en auth.users
SELECT
  'Tu usuario en auth.users' as descripcion,
  id,
  email,
  created_at
FROM auth.users
WHERE email ILIKE '%admin%'
ORDER BY created_at DESC;

-- 3. Ver si existes en la tabla usuarios
SELECT
  'Tu usuario en tabla usuarios' as descripcion,
  id,
  auth_user_id,
  nombre,
  email,
  rol_id,
  activo
FROM usuarios
WHERE email ILIKE '%admin%'
   OR auth_user_id = auth.uid();

-- 4. Ver todos los roles disponibles
SELECT
  'Roles disponibles' as descripcion,
  id,
  nombre,
  descripcion
FROM roles
ORDER BY id;

-- 5. Verificar si tu auth_user_id coincide
SELECT
  'Verificación de coincidencia' as descripcion,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_user_id = auth.uid()
    ) THEN 'SÍ - Usuario existe con auth_user_id correcto'
    ELSE 'NO - Usuario NO existe o auth_user_id no coincide'
  END as estado;

-- ==========================================
-- CORRECCIÓN: Ejecutar SOLO si el diagnóstico muestra problemas
-- ==========================================

-- Si el usuario existe en auth.users pero NO en usuarios, crear entrada:
-- DESCOMENTA Y EJECUTA ESTO:
/*
INSERT INTO usuarios (auth_user_id, nombre, email, rol_id, activo)
SELECT
  id,
  'Super Admin',
  email,
  1, -- Rol Admin
  true
FROM auth.users
WHERE email = 'TU_EMAIL_AQUI' -- REEMPLAZA con tu email
ON CONFLICT (auth_user_id) DO NOTHING;
*/

-- Si el usuario existe pero tiene rol_id incorrecto, actualizar:
-- DESCOMENTA Y EJECUTA ESTO:
/*
UPDATE usuarios
SET rol_id = 1, -- Rol Admin
    nombre = 'Super Admin',
    activo = true
WHERE auth_user_id = auth.uid();
*/

-- Si el auth_user_id no coincide, corregir:
-- DESCOMENTA Y EJECUTA ESTO:
/*
UPDATE usuarios
SET auth_user_id = auth.uid()
WHERE email = 'TU_EMAIL_AQUI'; -- REEMPLAZA con tu email
*/

-- ==========================================
-- VERIFICACIÓN FINAL
-- ==========================================

-- Después de ejecutar la corrección, verifica:
SELECT
  'Estado final del usuario' as descripcion,
  u.id,
  u.auth_user_id,
  u.nombre,
  u.email,
  u.rol_id,
  r.nombre as rol_nombre,
  u.activo,
  CASE
    WHEN u.auth_user_id = auth.uid() THEN '✓ CORRECTO'
    ELSE '✗ NO COINCIDE'
  END as verificacion_auth
FROM usuarios u
LEFT JOIN roles r ON u.rol_id = r.id
WHERE u.auth_user_id = auth.uid();

-- Probar las funciones nuevamente:
SELECT
  'Resultado de funciones' as descripcion,
  is_admin() as es_admin,
  is_editor() as es_editor,
  can_manage_books() as puede_gestionar_libros,
  can_view_all() as puede_ver_todo;
