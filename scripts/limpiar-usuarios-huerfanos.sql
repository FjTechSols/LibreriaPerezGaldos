-- ============================================
-- SOLUCIÓN DEFINITIVA: Usar TRIGGER automático
-- ============================================

/*
  PROBLEMA ACTUAL:
  - El código hace INSERT manual en tabla usuarios después de auth.signUp()
  - Ese INSERT está fallando con "Database error saving new user"

  SOLUCIÓN:
  - Crear un TRIGGER que se dispare automáticamente cuando se crea un usuario en auth.users
  - El trigger inserta en la tabla usuarios automáticamente
  - No necesitamos INSERT manual ni políticas complicadas
*/

-- ============================================
-- PASO 1: Crear función para el trigger
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insertar en tabla usuarios cuando se crea en auth.users
  INSERT INTO public.usuarios (auth_user_id, username, email, rol_id, activo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    2,  -- rol_id = 2 (usuario normal por defecto)
    true
  );

  RETURN NEW;
END;
$$;

-- ============================================
-- PASO 2: Crear trigger en auth.users
-- ============================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- PASO 3: Verificar que el trigger se creó
-- ============================================

SELECT
  tgname as trigger_name,
  tgenabled as enabled,
  pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- ============================================
-- PASO 4: Eliminar política INSERT (ya no necesaria)
-- ============================================

DROP POLICY IF EXISTS "Allow user registration" ON usuarios;

-- ============================================
-- PASO 5: Limpiar datos anteriores
-- ============================================

DELETE FROM usuarios;
SELECT COUNT(*) as usuarios_restantes FROM usuarios;

-- ============================================
-- PASO 6: AHORA REGÍSTRATE EN LA APP
-- ============================================

/*
  INSTRUCCIONES:

  1. Ve a tu aplicación web
  2. Haz clic en "Registrarse"
  3. Completa el formulario:
     - Email: fjtechsols@gmail.com (o cualquier otro)
     - Nombre: Admin
     - Contraseña: Una segura que recuerdes
  4. Haz clic en "Registrarse"
  5. ✅ El TRIGGER creará el usuario automáticamente

  NOTA: Si aún dice "email ya existe", usa un email diferente:
  - admin@exlibris.com
  - test@test.com
  - info@tudominio.com
*/

-- ============================================
-- PASO 7: Convertir a administrador
-- ============================================

-- Ver el usuario que acabas de crear
SELECT
  u.id,
  u.auth_user_id,
  u.username,
  u.email,
  r.nombre as rol,
  u.activo
FROM usuarios u
LEFT JOIN roles r ON r.id = u.rol_id
ORDER BY u.fecha_registro DESC;

-- Convertir a admin (cambia el email por el que usaste)
UPDATE usuarios
SET rol_id = 1
WHERE email = 'fjtechsols@gmail.com';  -- Cambia esto

-- Verificar
SELECT
  u.username,
  u.email,
  r.nombre as rol
FROM usuarios u
LEFT JOIN roles r ON r.id = u.rol_id
WHERE email = 'fjtechsols@gmail.com';  -- Cambia esto

-- Debe mostrar: rol = 'admin'

-- ============================================
-- RESUMEN
-- ============================================

/*
  ✅ TRIGGER creado: handle_new_user()
  ✅ Se dispara automáticamente al crear usuario en auth.users
  ✅ Crea registro en tabla usuarios con rol_id=2
  ✅ Ya NO necesitas INSERT manual en el código
  ✅ Ya NO necesitas políticas INSERT complicadas

  IMPORTANTE:
  Ahora debes ACTUALIZAR AuthContext.tsx para eliminar el INSERT manual
  Ver instrucciones abajo.
*/
