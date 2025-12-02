-- ============================================
-- LIMPIAR USUARIOS HUÉRFANOS
-- ============================================
-- Este script elimina usuarios que existen en la tabla usuarios
-- pero NO existen en auth.users (Authentication)

-- 1. VER USUARIOS ACTUALES EN LA TABLA USUARIOS
-- ============================================

SELECT
  id,
  auth_user_id,
  username,
  email,
  rol_id,
  activo,
  fecha_registro
FROM usuarios
ORDER BY fecha_registro DESC;

-- 2. VERIFICAR SI HAY USUARIOS HUÉRFANOS
-- ============================================
-- Estos son usuarios en la tabla 'usuarios' cuyo auth_user_id
-- no existe en auth.users

SELECT
  u.id,
  u.auth_user_id,
  u.username,
  u.email,
  u.rol_id,
  'HUÉRFANO - No existe en auth.users' as estado
FROM usuarios u
WHERE NOT EXISTS (
  SELECT 1
  FROM auth.users au
  WHERE au.id = u.auth_user_id
);

-- 3. BORRAR TODOS LOS USUARIOS DE LA TABLA USUARIOS
-- ============================================
-- Esto borra TODOS los usuarios de la tabla usuarios
-- Úsalo con precaución

DELETE FROM usuarios;

-- 4. VERIFICAR QUE SE BORRARON
-- ============================================

SELECT COUNT(*) as usuarios_restantes FROM usuarios;

-- Debe mostrar 0

-- 5. VERIFICAR QUE AUTHENTICATION ESTÁ VACÍO
-- ============================================

SELECT
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users;

-- Si aparecen usuarios aquí, necesitas borrarlos manualmente
-- desde el Dashboard: Authentication → Users → Borrar cada uno


-- ============================================
-- DESPUÉS DE LIMPIAR TODO:
-- ============================================

/*
  PASOS SIGUIENTES:

  1. ✅ Ya ejecutaste este script y borraste todos los usuarios de la tabla usuarios

  2. ⚠️ Ve al Dashboard de Supabase:
     - Authentication → Users
     - Borra TODOS los usuarios que aparezcan ahí
     - (Los usuarios en auth.users no se pueden borrar con SQL)

  3. ✅ Verifica que ambas tablas estén vacías:
     - Ejecuta las consultas de verificación abajo

  4. ✅ Ahora puedes registrar tu usuario:
     - Ve a tu aplicación web
     - Haz clic en "Registrarse"
     - Email: fjtechsols@gmail.com (o FjTechSols@gmail.com, es case-insensitive)
     - Contraseña: La que quieras (guárdala bien)

  5. ✅ Convierte el usuario en admin:
     - Ejecuta el script de conversión a admin
*/


-- ============================================
-- VERIFICACIONES FINALES
-- ============================================

-- Verificar tabla usuarios está vacía
SELECT 'Usuarios en tabla usuarios:' as verificacion, COUNT(*) as cantidad
FROM usuarios;

-- Verificar Authentication (puede dar error de permisos, es normal)
SELECT 'Usuarios en auth.users:' as verificacion, COUNT(*) as cantidad
FROM auth.users;

-- Ver estructura de la tabla usuarios (confirmar que existe)
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'usuarios'
ORDER BY ordinal_position;


-- ============================================
-- SCRIPT PARA DESPUÉS DEL REGISTRO
-- ============================================

/*
  Ejecuta esto DESPUÉS de registrarte en la aplicación:
*/

-- Ver el usuario que acabas de crear
SELECT
  id,
  auth_user_id,
  username,
  email,
  rol_id,
  activo,
  fecha_registro
FROM usuarios
WHERE email ILIKE '%fjtechsols%';

-- Convertir a administrador
UPDATE usuarios
SET rol_id = 1
WHERE email ILIKE '%fjtechsols%';

-- Verificar que ahora es admin
SELECT
  u.id,
  u.username,
  u.email,
  r.nombre as rol,
  u.activo
FROM usuarios u
JOIN roles r ON r.id = u.rol_id
WHERE email ILIKE '%fjtechsols%';

-- Debe mostrar rol = 'admin'
