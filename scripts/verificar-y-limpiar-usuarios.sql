-- ============================================
-- VERIFICAR Y LIMPIAR USUARIOS
-- ============================================

-- 1. VERIFICAR QUE EL TRIGGER EXISTE
-- ============================================

SELECT
  t.tgname as trigger_name,
  c.relname as table_name,
  p.proname as function_name,
  pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname = 'on_auth_user_created';

-- Resultado esperado: Debe mostrar el trigger 'on_auth_user_created' en la tabla 'users'


-- 2. VERIFICAR QUE LA FUNCIÓN EXISTE
-- ============================================

SELECT
  proname as function_name,
  prosrc as function_source
FROM pg_proc
WHERE proname = 'handle_new_auth_user';

-- Resultado esperado: Debe mostrar la función 'handle_new_auth_user'


-- 3. LIMPIAR USUARIOS DE LA TABLA USUARIOS
-- ============================================

-- Ver usuarios actuales en la tabla usuarios
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

-- Borrar TODOS los usuarios de la tabla usuarios
DELETE FROM usuarios;

-- Verificar que se borraron
SELECT COUNT(*) as usuarios_restantes FROM usuarios;


-- 4. INSTRUCCIONES PARA BORRAR DE AUTHENTICATION
-- ============================================

/*
  ⚠️ IMPORTANTE: Borrar usuarios de Authentication (auth.users)

  No podemos borrar usuarios de auth.users con SQL directamente.
  Debes hacerlo manualmente desde el Dashboard:

  1. Ve a Supabase Dashboard → Authentication → Users
  2. Selecciona cada usuario
  3. Haz clic en los 3 puntos → Delete user
  4. O usa "Delete all users" si está disponible

  ⚠️ NOTA: auth.users está en un schema protegido y solo el dashboard
  tiene permisos para eliminación directa.
*/


-- 5. VERIFICAR QUE NO HAY USUARIOS
-- ============================================

-- Contar usuarios en la tabla usuarios
SELECT COUNT(*) as usuarios_en_tabla FROM usuarios;

-- Ver usuarios en auth.users (esto puede fallar por permisos)
-- Si falla, verifica manualmente en el Dashboard
SELECT COUNT(*) as usuarios_en_auth
FROM auth.users;


-- 6. PRUEBA DEL TRIGGER (después de limpiar)
-- ============================================

/*
  Para probar el trigger:

  1. Ve a la aplicación web
  2. Haz clic en "Registrarse"
  3. Crea un nuevo usuario:
     - Nombre: TestUser
     - Email: test@test.com
     - Contraseña: Test1234!
  4. Ejecuta esta consulta:
*/

SELECT
  u.id,
  u.auth_user_id,
  u.username,
  u.email,
  u.rol_id,
  r.nombre as rol_nombre,
  u.activo,
  u.fecha_registro
FROM usuarios u
LEFT JOIN roles r ON r.id = u.rol_id
WHERE u.email = 'test@test.com';

-- Resultado esperado:
-- - Debe mostrar el usuario creado automáticamente
-- - rol_id debe ser 2 (usuario normal)
-- - activo debe ser true
-- - username debe ser 'TestUser'


-- 7. CREAR USUARIO ADMINISTRADOR (después de registrarlo)
-- ============================================

/*
  Una vez que hayas creado tu usuario fjtechsols@gmail.com
  desde el formulario de registro, conviértelo en admin:
*/

UPDATE usuarios
SET rol_id = 1, username = 'Admin'
WHERE email = 'fjtechsols@gmail.com';

-- Verificar que ahora es admin
SELECT
  id,
  username,
  email,
  rol_id,
  activo
FROM usuarios
WHERE email = 'fjtechsols@gmail.com';


-- 8. RESUMEN DE VERIFICACIÓN FINAL
-- ============================================

-- Ver todos los usuarios con sus roles
SELECT
  u.id,
  u.username,
  u.email,
  r.nombre as rol,
  u.activo,
  u.fecha_registro
FROM usuarios u
LEFT JOIN roles r ON r.id = u.rol_id
ORDER BY u.fecha_registro DESC;

-- Ver estadísticas
SELECT
  r.nombre as rol,
  COUNT(u.id) as cantidad
FROM roles r
LEFT JOIN usuarios u ON u.rol_id = r.id
GROUP BY r.id, r.nombre
ORDER BY r.id;
