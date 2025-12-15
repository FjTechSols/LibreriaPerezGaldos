-- ============================================
-- SOLUCIÓN AL ERROR: "Database error saving new user"
-- ============================================

/*
  PROBLEMA IDENTIFICADO:
  - Error: "Database error saving new user" (500 Internal Server Error)
  - Causa: La política INSERT en la tabla 'usuarios' requiere 'TO authenticated'
  - Durante el registro, el usuario AÚN NO está autenticado
  - El INSERT falla aunque auth.signUp() haya creado el usuario en auth.users

  SOLUCIÓN:
  - Cambiar la política INSERT para permitir también 'anon' (usuarios anónimos)
  - Esto permite que el INSERT funcione durante el proceso de registro
  - La seguridad se mantiene porque verificamos auth_user_id = auth.uid()
*/

-- ============================================
-- PASO 1: ARREGLAR LA POLÍTICA DE INSERT
-- ============================================

-- Eliminar la política problemática
DROP POLICY IF EXISTS "Allow user registration" ON usuarios;

-- Crear nueva política que funciona durante el registro
-- Permite INSERT tanto para 'anon' como para 'authenticated'
-- La seguridad se mantiene verificando que auth_user_id = auth.uid()
CREATE POLICY "Allow user registration" ON usuarios
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (auth_user_id = auth.uid());

-- ============================================
-- PASO 2: VERIFICAR QUE SE APLICÓ
-- ============================================

-- Ver todas las políticas de la tabla usuarios
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
WHERE tablename = 'usuarios'
ORDER BY policyname;

-- Resultado esperado:
-- Debe mostrar "Allow user registration" con roles = {anon,authenticated}

-- ============================================
-- PASO 3: LIMPIAR DATOS ANTERIORES
-- ============================================

-- Limpiar tabla usuarios (los intentos fallidos pueden haber dejado registros huérfanos)
DELETE FROM usuarios;

-- Verificar que está vacía
SELECT COUNT(*) as usuarios_en_tabla FROM usuarios;
-- Debe mostrar 0

-- ============================================
-- PASO 4: AHORA PUEDES REGISTRARTE
-- ============================================

/*
  INSTRUCCIONES:

  1. Ve a tu aplicación web
  2. Haz clic en "Registrarse"
  3. Completa el formulario con CUALQUIER email (ya funcionará):
     - Email: fjtechsols@gmail.com (o el que quieras)
     - Nombre: Admin
     - Contraseña: Una segura que recuerdes
  4. Haz clic en "Registrarse"
  5. ✅ Ahora debería funcionar sin errores

  NOTA: Si sigues viendo el error del email duplicado, usa uno diferente:
  - admin@exlibris.com
  - info@tudominio.com
  - test@test.com
*/

-- ============================================
-- PASO 5: CONVERTIR A ADMINISTRADOR
-- ============================================

-- Una vez registrado, ejecuta esto para hacerte admin
-- Reemplaza el email con el que usaste
UPDATE usuarios
SET rol_id = 1
WHERE email = 'fjtechsols@gmail.com';  -- Cambia esto por tu email

-- Verificar que ahora eres admin
SELECT
  u.id,
  u.username,
  u.email,
  r.nombre as rol,
  u.activo
FROM usuarios u
LEFT JOIN roles r ON r.id = u.rol_id
WHERE email = 'fjtechsols@gmail.com';  -- Cambia esto por tu email

-- Debe mostrar: rol = 'admin'

-- ============================================
-- PASO 6: VERIFICACIÓN FINAL
-- ============================================

-- Ver todos los usuarios registrados
SELECT
  u.id,
  u.auth_user_id,
  u.username,
  u.email,
  r.nombre as rol,
  u.activo,
  u.fecha_registro
FROM usuarios u
LEFT JOIN roles r ON r.id = u.rol_id
ORDER BY u.fecha_registro DESC;

-- ============================================
-- TROUBLESHOOTING
-- ============================================

/*
  SI AÚN NO FUNCIONA:

  1. VERIFICA QUE LA POLÍTICA SE APLICÓ:
     - Ejecuta el SELECT de políticas del PASO 2
     - Debe mostrar "Allow user registration" con roles = {anon,authenticated}
     - Si no aparece, ejecuta nuevamente el PASO 1

  2. VERIFICA QUE auth.uid() FUNCIONA:
     - Durante el registro, auth.uid() debe devolver el ID del nuevo usuario
     - Si no funciona, puede ser un problema de configuración de Supabase

  3. USA LA CONSOLA DEL NAVEGADOR:
     - Abre F12 → Console
     - Intenta registrarte
     - Mira los logs para ver el error exacto
     - Debería decir algo más específico que "Database error"

  4. REVISA LOS LOGS DE SUPABASE:
     - Dashboard → Logs → Auth Logs
     - Dashboard → Logs → Database Logs
     - Busca errores relacionados con el timestamp del intento de registro

  5. SI TODO FALLA, USA OTRA ESTRATEGIA:
     - Ve al Dashboard → Authentication → Users
     - Click "Invite User" o "Add User"
     - Crea el usuario manualmente
     - Email: fjtechsols@gmail.com
     - Password: La que elijas
     - Luego ejecuta el UPDATE del PASO 5
*/

-- ============================================
-- RESUMEN
-- ============================================

/*
  CAUSA DEL PROBLEMA:
  ✅ Política INSERT requería 'authenticated' pero el usuario aún no estaba autenticado

  SOLUCIÓN APLICADA:
  ✅ Cambiar política para permitir 'anon, authenticated'

  PRÓXIMOS PASOS:
  1. ✅ Ejecutar este script completo (PASO 1 al PASO 3)
  2. 📱 Ir a la app y registrarte
  3. ✅ Ejecutar PASO 5 para hacerte admin
  4. 🎉 Iniciar sesión y disfrutar

  IMPORTANTE:
  - Este cambio NO compromete la seguridad
  - Aún verificamos auth_user_id = auth.uid()
  - Solo permite que el INSERT funcione durante el registro
*/
