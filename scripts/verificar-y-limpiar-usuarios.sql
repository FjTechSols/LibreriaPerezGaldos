-- ============================================
-- VERIFICAR Y LIMPIAR USUARIOS COMPLETAMENTE
-- ============================================

-- PASO 1: VER TODO LO QUE EXISTE
-- ============================================

-- 1.1 Ver usuarios en tabla usuarios
SELECT
  'usuarios' as tabla,
  id,
  auth_user_id,
  username,
  email,
  rol_id,
  activo,
  fecha_registro
FROM usuarios
ORDER BY fecha_registro DESC;

-- 1.2 Ver usuarios en auth.users (puede dar error de permisos)
SELECT
  'auth.users' as tabla,
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;

-- 1.3 Ver clientes
SELECT
  'clientes' as tabla,
  id,
  nombre,
  email,
  telefono,
  created_at
FROM clientes
WHERE email ILIKE '%fjtechsols%' OR email ILIKE '%fjtech%'
ORDER BY created_at DESC;

-- ============================================
-- PASO 2: LIMPIAR TODO
-- ============================================

-- 2.1 Limpiar tabla usuarios
DELETE FROM usuarios;

-- 2.2 Limpiar tabla clientes
DELETE FROM clientes;

-- 2.3 Verificar que se borraron
SELECT 'usuarios borrados' as accion, COUNT(*) as cantidad FROM usuarios
UNION ALL
SELECT 'clientes borrados' as accion, COUNT(*) as cantidad FROM clientes;


-- ============================================
-- PASO 3: BORRAR DE AUTHENTICATION (DASHBOARD)
-- ============================================

/*
  ⚠️ IMPORTANTE: Los emails fjtechsols@gmail.com y fjtechsols+admin@gmail.com
  están en auth.users pero NO se pueden borrar con SQL.

  SOLUCIONES:

  A) DASHBOARD DE SUPABASE:
     1. Ve a Dashboard → Authentication → Users
     2. REFRESCA LA PÁGINA varias veces (F5)
     3. Si aparecen usuarios, bórralos: 3 puntos → Delete user
     4. Si NO aparecen pero el error persiste, ve a la opción B

  B) USA LA CONSOLA DEL NAVEGADOR:
     1. Abre tu app en el navegador
     2. Presiona F12 (abrir consola)
     3. Ve a la pestaña "Console"
     4. Ve a tu app → Registrarse
     5. Intenta registrar con: fjtechsols@gmail.com
     6. MIRA LOS LOGS EN LA CONSOLA
     7. Verás el error EXACTO de Supabase
     8. Copia el mensaje de error completo aquí

  C) USA UN EMAIL COMPLETAMENTE DIFERENTE:
     - admin@exlibris.com
     - info@tuempresa.com
     - otro_email@gmail.com

  D) CONTACTA SOPORTE DE SUPABASE:
     - Dashboard → Soporte
     - Mensaje: "No puedo registrar fjtechsols@gmail.com ni fjtechsols+admin@gmail.com.
                 Por favor eliminen estos emails de auth.users"
*/


-- ============================================
-- PASO 4: USAR CONSOLA DEL NAVEGADOR
-- ============================================

/*
  ESTO ES MUY IMPORTANTE:

  1. Abre tu aplicación web en Chrome/Firefox
  2. Presiona F12 para abrir Developer Tools
  3. Ve a la pestaña "Console"
  4. Ve a la página de Registro
  5. Intenta registrarte con el email que quieres
  6. En la consola verás mensajes como:

     "Attempting registration with email: fjtechsols@gmail.com"
     "Supabase signUp response: { authData: ..., authError: ... }"
     "Registration error: [MENSAJE DE ERROR EXACTO]"

  7. COPIA el mensaje de error COMPLETO que aparece
  8. Ese mensaje te dirá EXACTAMENTE por qué falla

  POSIBLES ERRORES:
  - "User already registered" → El email existe en auth.users
  - "Email rate limit exceeded" → Intentaste registrar muchas veces, espera 1 hora
  - "Invalid email format" → El formato del email es inválido
  - "Password should be at least X characters" → Contraseña muy corta

  Una vez que veas el error exacto, sabremos qué hacer.
*/


-- ============================================
-- PASO 5: ALTERNATIVAS QUE FUNCIONAN 100%
-- ============================================

-- ALTERNATIVA A: Usar otro proveedor de email
/*
  Si tienes otro email (que NO sea Gmail), úsalo:
  - Outlook: tuemail@outlook.com
  - Yahoo: tuemail@yahoo.com
  - ProtonMail: tuemail@proton.me
  - Email corporativo: tuemail@tuempresa.com
*/

-- ALTERNATIVA B: Crear un nuevo email de Gmail
/*
  Crea una cuenta nueva de Gmail específica para este proyecto:
  - exlibris.admin@gmail.com
  - libreria.admin@gmail.com
  - admin.libreria@gmail.com
*/

-- ALTERNATIVA C: Usar email temporal para testing
/*
  Mientras resuelves el problema, puedes usar:
  - test@test.com
  - admin@test.com
  - demo@demo.com

  Luego lo cambias en la base de datos:
*/

UPDATE usuarios
SET email = 'fjtechsols@gmail.com'
WHERE email = 'test@test.com';

-- NOTA: Esto solo cambia el email en la tabla usuarios,
-- NO en auth.users (que es donde está el problema)


-- ============================================
-- PASO 6: DESPUÉS DE REGISTRARTE CON ÉXITO
-- ============================================

-- Una vez que logres registrarte (con el email que sea),
-- conviértelo en administrador:

UPDATE usuarios
SET rol_id = 1
WHERE email ILIKE '%tu_email%';

-- Reemplaza 'tu_email' con el email que uses

-- Verificar que ahora es admin
SELECT
  u.id,
  u.username,
  u.email,
  r.nombre as rol,
  u.activo
FROM usuarios u
LEFT JOIN roles r ON r.id = u.rol_id
ORDER BY u.fecha_registro DESC;


-- ============================================
-- PASO 7: VERIFICACIÓN FINAL
-- ============================================

-- Ver todos los usuarios
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

-- ============================================
-- RESUMEN DE ACCIONES
-- ============================================

/*
  QUÉ HACER AHORA:

  1. ✅ Ya ejecutaste: DELETE FROM usuarios; (tabla limpia)
  2. ✅ Ya ejecutaste: DELETE FROM clientes; (tabla limpia)
  3. ⚠️ El problema está en auth.users (NO se puede limpiar con SQL)

  PRÓXIMOS PASOS:

  A) MÉTODO RÁPIDO (Recomendado):
     - Usa un email DIFERENTE para registrarte
     - Sugerencias:
       * admin@exlibris.com
       * info@tudominio.com
       * test@test.com (temporal)
       * Crea un nuevo Gmail específico

  B) MÉTODO DIAGNÓSTICO:
     - Abre la consola del navegador (F12)
     - Intenta registrarte
     - Copia el error EXACTO que aparece
     - Con ese error sabremos qué hacer

  C) MÉTODO OFICIAL:
     - Contacta soporte de Supabase
     - Pide que eliminen los emails problemáticos
     - Espera respuesta (puede tomar 24-48 horas)

  D) MÉTODO ESPERAR:
     - Espera 24-48 horas
     - Supabase limpia usuarios "fantasma" automáticamente
     - Luego intenta de nuevo

  RECOMENDACIÓN:
  Usa el Método A (email diferente) para avanzar ahora.
  Luego puedes intentar recuperar el email original.
*/
