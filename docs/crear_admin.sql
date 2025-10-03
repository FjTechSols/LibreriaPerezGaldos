-- Script para crear cuenta de administrador
-- Usuario: PerezGaldosAdmin
-- Email: admin@perezgaldos.es
-- Contraseña: Galdos12345

-- IMPORTANTE: Este script debe ejecutarse desde el SQL Editor de Supabase
-- o usando el Admin API de Supabase

-- 1. Primero, crear el usuario en auth.users usando la función de Supabase
-- Esto se hace mejor desde el Dashboard de Supabase o usando el Admin SDK

-- Para crear desde SQL (requiere permisos de servicio):
-- Nota: Reemplaza 'TU_UUID_AQUI' con el UUID del usuario creado en auth.users

-- Si ya tienes el auth_user_id del usuario de auth.users:
-- INSERT INTO usuarios (auth_user_id, username, email, rol_id, activo)
-- VALUES (
--   'TU_UUID_AQUI',
--   'PerezGaldosAdmin',
--   'admin@perezgaldos.es',
--   1,  -- rol_id 1 = admin
--   true
-- );

-- ALTERNATIVA: Usar la función de Supabase para crear usuario completo
-- Ejecutar esto en el SQL Editor de Supabase:

DO $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Nota: Esta función requiere privilegios especiales
  -- Es mejor usar el Dashboard de Supabase: Authentication > Users > Add User

  -- Si el usuario ya existe en auth.users, obtener su ID
  SELECT id INTO new_user_id
  FROM auth.users
  WHERE email = 'admin@perezgaldos.es';

  -- Si no existe, mostrar mensaje
  IF new_user_id IS NULL THEN
    RAISE NOTICE 'Usuario no encontrado en auth.users. Por favor, créalo primero desde el Dashboard de Supabase.';
    RAISE NOTICE 'Dashboard > Authentication > Users > Add User';
    RAISE NOTICE 'Email: admin@perezgaldos.es';
    RAISE NOTICE 'Password: Galdos12345';
  ELSE
    -- Si existe, crear o actualizar en tabla usuarios
    INSERT INTO usuarios (auth_user_id, username, email, rol_id, activo)
    VALUES (
      new_user_id,
      'PerezGaldosAdmin',
      'admin@perezgaldos.es',
      1,
      true
    )
    ON CONFLICT (email)
    DO UPDATE SET
      username = 'PerezGaldosAdmin',
      rol_id = 1,
      activo = true;

    RAISE NOTICE 'Usuario administrador creado/actualizado correctamente';
  END IF;
END $$;
