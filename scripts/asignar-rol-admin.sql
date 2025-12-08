-- Script para asignar rol de admin a un usuario
-- Reemplaza 'tu-email@ejemplo.com' con tu email real

-- 1. Primero, encuentra tu user_id
-- SELECT id, email FROM auth.users WHERE email = 'tu-email@ejemplo.com';

-- 2. Buscar el ID del rol admin
-- SELECT id, nombre FROM roles WHERE nombre = 'admin';

-- 3. Asignar el rol (reemplaza los IDs según corresponda)
-- IMPORTANTE: Reemplaza 'TU_USER_ID_AQUI' con el ID obtenido en el paso 1
-- IMPORTANTE: Reemplaza 'ROL_ADMIN_ID_AQUI' con el ID obtenido en el paso 2

DO $$
DECLARE
  v_user_id uuid;
  v_rol_admin_id uuid;
BEGIN
  -- Obtener el user_id del email (REEMPLAZA CON TU EMAIL)
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'tu-email@ejemplo.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado. Verifica el email.';
  END IF;

  -- Obtener el ID del rol admin
  SELECT id INTO v_rol_admin_id
  FROM roles
  WHERE nombre = 'admin'
  LIMIT 1;

  IF v_rol_admin_id IS NULL THEN
    RAISE EXCEPTION 'Rol admin no encontrado. Verifica que la tabla roles exista.';
  END IF;

  -- Eliminar asignaciones previas para este usuario
  DELETE FROM usuarios_roles WHERE user_id = v_user_id;

  -- Asignar el rol admin
  INSERT INTO usuarios_roles (user_id, rol_id, activo)
  VALUES (v_user_id, v_rol_admin_id, true)
  ON CONFLICT (user_id, rol_id)
  DO UPDATE SET activo = true;

  RAISE NOTICE 'Rol admin asignado exitosamente al usuario %', v_user_id;
END $$;
