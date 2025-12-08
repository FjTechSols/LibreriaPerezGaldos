/*
  # Diagnóstico y Corrección Completa del Sistema de Roles

  Este script realiza un diagnóstico completo y corrige todos los problemas
  del sistema de roles y permisos para fjtechsols@gmail.com

  Ejecutar en Supabase SQL Editor
*/

-- ============================================
-- PARTE 1: DIAGNÓSTICO INICIAL
-- ============================================

DO $$
DECLARE
  v_auth_user_id uuid;
  v_usuario_id uuid;
  v_rol_id integer;
  v_tiene_usuarios_roles boolean;
  v_tiene_funciones_rpc boolean;
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'DIAGNÓSTICO DEL SISTEMA DE ROLES';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';

  -- Verificar usuario en auth.users
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE email = 'fjtechsols@gmail.com'
  LIMIT 1;

  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario fjtechsols@gmail.com NO encontrado en auth.users';
  END IF;

  RAISE NOTICE '✓ Usuario encontrado en auth.users';
  RAISE NOTICE '  Auth User ID: %', v_auth_user_id;
  RAISE NOTICE '';

  -- Verificar tabla usuarios
  SELECT id, rol_id INTO v_usuario_id, v_rol_id
  FROM usuarios
  WHERE auth_user_id = v_auth_user_id
  LIMIT 1;

  IF v_usuario_id IS NULL THEN
    RAISE NOTICE '✗ Usuario NO encontrado en tabla usuarios';
  ELSE
    RAISE NOTICE '✓ Usuario encontrado en tabla usuarios';
    RAISE NOTICE '  Usuario ID: %', v_usuario_id;
    RAISE NOTICE '  Rol ID: %', v_rol_id;

    IF v_rol_id IS NOT NULL THEN
      RAISE NOTICE '  Rol asignado: %', (SELECT nombre FROM roles WHERE id = v_rol_id);
    END IF;
  END IF;
  RAISE NOTICE '';

  -- Verificar tabla usuarios_roles
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'usuarios_roles'
  ) INTO v_tiene_usuarios_roles;

  IF v_tiene_usuarios_roles THEN
    RAISE NOTICE '✓ Tabla usuarios_roles existe';

    -- Verificar asignaciones en usuarios_roles
    IF EXISTS (
      SELECT 1 FROM usuarios_roles
      WHERE user_id = v_auth_user_id
    ) THEN
      RAISE NOTICE '  Roles asignados en usuarios_roles:';
      FOR v_rol_id IN
        SELECT ur.rol_id
        FROM usuarios_roles ur
        WHERE ur.user_id = v_auth_user_id
      LOOP
        RAISE NOTICE '    - % (Activo: %)',
          (SELECT nombre FROM roles WHERE id = v_rol_id),
          (SELECT activo FROM usuarios_roles WHERE user_id = v_auth_user_id AND rol_id = v_rol_id);
      END LOOP;
    ELSE
      RAISE NOTICE '  ✗ NO hay roles asignados en usuarios_roles';
    END IF;
  ELSE
    RAISE NOTICE '✗ Tabla usuarios_roles NO existe';
  END IF;
  RAISE NOTICE '';

  -- Verificar funciones RPC
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'obtener_roles_usuario'
  ) INTO v_tiene_funciones_rpc;

  IF v_tiene_funciones_rpc THEN
    RAISE NOTICE '✓ Función obtener_roles_usuario existe';
  ELSE
    RAISE NOTICE '✗ Función obtener_roles_usuario NO existe';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'obtener_permisos_usuario') THEN
    RAISE NOTICE '✓ Función obtener_permisos_usuario existe';
  ELSE
    RAISE NOTICE '✗ Función obtener_permisos_usuario NO existe';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'obtener_rol_principal') THEN
    RAISE NOTICE '✓ Función obtener_rol_principal existe';
  ELSE
    RAISE NOTICE '✗ Función obtener_rol_principal NO existe';
  END IF;
  RAISE NOTICE '';

END $$;

-- ============================================
-- PARTE 2: CORRECCIONES
-- ============================================

-- Paso 1: Agregar columnas necesarias a la tabla roles
DO $$
BEGIN
  -- Agregar display_name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roles' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE roles ADD COLUMN display_name VARCHAR(100);
    UPDATE roles SET display_name = nombre WHERE display_name IS NULL;
    ALTER TABLE roles ALTER COLUMN display_name SET NOT NULL;
    RAISE NOTICE '✓ Columna display_name agregada a tabla roles';
  END IF;

  -- Agregar nivel_jerarquia
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roles' AND column_name = 'nivel_jerarquia'
  ) THEN
    ALTER TABLE roles ADD COLUMN nivel_jerarquia INTEGER DEFAULT 999;
    UPDATE roles SET nivel_jerarquia = 1 WHERE nombre = 'super_admin';
    UPDATE roles SET nivel_jerarquia = 2 WHERE nombre = 'webmaster';
    UPDATE roles SET nivel_jerarquia = 3 WHERE nombre = 'admin';
    UPDATE roles SET nivel_jerarquia = 4 WHERE nombre = 'gerente';
    UPDATE roles SET nivel_jerarquia = 5 WHERE nombre = 'empleado';
    UPDATE roles SET nivel_jerarquia = 6 WHERE nombre = 'cliente';
    ALTER TABLE roles ALTER COLUMN nivel_jerarquia SET NOT NULL;
    RAISE NOTICE '✓ Columna nivel_jerarquia agregada a tabla roles';
  END IF;
END $$;

-- Paso 2: Crear funciones RPC si no existen
-- Función: obtener_permisos_usuario
DROP FUNCTION IF EXISTS obtener_permisos_usuario(UUID);

CREATE OR REPLACE FUNCTION obtener_permisos_usuario(usuario_id UUID)
RETURNS TABLE(permiso_codigo TEXT)
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  -- Permisos desde usuarios_roles (sistema nuevo)
  SELECT DISTINCT p.codigo
  FROM permisos p
  INNER JOIN roles_permisos rp ON p.id = rp.permiso_id
  INNER JOIN usuarios_roles ur ON rp.rol_id = ur.rol_id
  WHERE ur.user_id = usuario_id
    AND ur.activo = true

  UNION

  -- Permisos desde usuarios.rol_id (sistema legacy)
  SELECT DISTINCT p.codigo
  FROM permisos p
  INNER JOIN roles_permisos rp ON p.id = rp.permiso_id
  INNER JOIN usuarios u ON u.rol_id = rp.rol_id
  WHERE u.auth_user_id = usuario_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Función: obtener_rol_principal
DROP FUNCTION IF EXISTS obtener_rol_principal(UUID);

CREATE OR REPLACE FUNCTION obtener_rol_principal(usuario_id UUID)
RETURNS TABLE(
  rol_nombre TEXT,
  rol_display_name TEXT,
  nivel_jerarquia INTEGER
)
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  -- Primero buscar en usuarios_roles (sistema nuevo)
  SELECT r.nombre::TEXT, r.display_name::TEXT, r.nivel_jerarquia
  FROM roles r
  INNER JOIN usuarios_roles ur ON r.id = ur.rol_id
  WHERE ur.user_id = usuario_id
    AND ur.activo = true
  ORDER BY r.nivel_jerarquia ASC
  LIMIT 1;

  -- Si no hay resultado, buscar en usuarios.rol_id (sistema legacy)
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT r.nombre::TEXT, r.display_name::TEXT, r.nivel_jerarquia
    FROM roles r
    INNER JOIN usuarios u ON u.rol_id = r.id
    WHERE u.auth_user_id = usuario_id
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Función: obtener_roles_usuario
DROP FUNCTION IF EXISTS obtener_roles_usuario(UUID);

CREATE OR REPLACE FUNCTION obtener_roles_usuario(usuario_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'nombre', r.nombre,
        'display_name', r.display_name,
        'nivel_jerarquia', r.nivel_jerarquia,
        'activo', true
      )
      ORDER BY r.nivel_jerarquia
    ),
    '[]'::jsonb
  ) INTO result
  FROM (
    -- Roles desde usuarios_roles (sistema nuevo)
    SELECT DISTINCT r.id, r.nombre, r.display_name, r.nivel_jerarquia
    FROM roles r
    INNER JOIN usuarios_roles ur ON r.id = ur.rol_id
    WHERE ur.user_id = usuario_id
      AND ur.activo = true

    UNION

    -- Rol desde usuarios.rol_id (sistema legacy)
    SELECT DISTINCT r.id, r.nombre, r.display_name, r.nivel_jerarquia
    FROM roles r
    INNER JOIN usuarios u ON u.rol_id = r.id
    WHERE u.auth_user_id = usuario_id
  ) r;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- Paso 3: Asignar rol super_admin a fjtechsols@gmail.com
DO $$
DECLARE
  v_auth_user_id uuid;
  v_rol_id integer;
  v_usuario_id uuid;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'ASIGNACIÓN DE ROL SUPER_ADMIN';
  RAISE NOTICE '================================================';

  -- Obtener auth_user_id
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE email = 'fjtechsols@gmail.com'
  LIMIT 1;

  -- Obtener ID del rol super_admin
  SELECT id INTO v_rol_id
  FROM roles
  WHERE nombre = 'super_admin'
  LIMIT 1;

  IF v_rol_id IS NULL THEN
    RAISE EXCEPTION 'Rol super_admin no encontrado';
  END IF;

  -- Verificar/crear registro en tabla usuarios
  SELECT id INTO v_usuario_id
  FROM usuarios
  WHERE auth_user_id = v_auth_user_id
  LIMIT 1;

  IF v_usuario_id IS NULL THEN
    INSERT INTO usuarios (auth_user_id, username, email, rol_id, fecha_registro, activo)
    VALUES (
      v_auth_user_id,
      'fjtechsols',
      'fjtechsols@gmail.com',
      v_rol_id,
      now(),
      true
    )
    RETURNING id INTO v_usuario_id;
    RAISE NOTICE '✓ Usuario creado en tabla usuarios';
  ELSE
    UPDATE usuarios
    SET rol_id = v_rol_id, activo = true
    WHERE auth_user_id = v_auth_user_id;
    RAISE NOTICE '✓ Usuario actualizado en tabla usuarios';
  END IF;

  -- Asignar en usuarios_roles si la tabla existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usuarios_roles') THEN
    INSERT INTO usuarios_roles (user_id, rol_id, activo, created_at)
    VALUES (v_auth_user_id, v_rol_id, true, now())
    ON CONFLICT (user_id, rol_id)
    DO UPDATE SET activo = true;
    RAISE NOTICE '✓ Rol asignado en usuarios_roles';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'ASIGNACIÓN COMPLETADA EXITOSAMENTE';
  RAISE NOTICE 'Usuario: fjtechsols@gmail.com';
  RAISE NOTICE 'Rol: super_admin';
END $$;

-- ============================================
-- PARTE 3: VERIFICACIÓN FINAL
-- ============================================

DO $$
DECLARE
  v_auth_user_id uuid;
  v_roles jsonb;
  v_rol_principal record;
  v_permisos text[];
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'VERIFICACIÓN FINAL';
  RAISE NOTICE '================================================';

  -- Obtener auth_user_id
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE email = 'fjtechsols@gmail.com'
  LIMIT 1;

  -- Verificar roles
  SELECT obtener_roles_usuario(v_auth_user_id) INTO v_roles;
  RAISE NOTICE 'Roles asignados: %', v_roles;

  -- Verificar rol principal
  SELECT * INTO v_rol_principal
  FROM obtener_rol_principal(v_auth_user_id);

  IF v_rol_principal IS NOT NULL THEN
    RAISE NOTICE 'Rol principal: %', v_rol_principal.rol_nombre;
    RAISE NOTICE 'Nivel de jerarquía: %', v_rol_principal.nivel_jerarquia;
  ELSE
    RAISE NOTICE '✗ NO se pudo obtener rol principal';
  END IF;

  -- Verificar permisos
  SELECT array_agg(permiso_codigo) INTO v_permisos
  FROM obtener_permisos_usuario(v_auth_user_id);

  IF v_permisos IS NOT NULL THEN
    RAISE NOTICE 'Total de permisos: %', array_length(v_permisos, 1);
  ELSE
    RAISE NOTICE 'Permisos: NINGUNO asignado';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'INSTRUCCIONES FINALES';
  RAISE NOTICE '================================================';
  RAISE NOTICE '1. Cierra sesión en la aplicación';
  RAISE NOTICE '2. Vuelve a iniciar sesión';
  RAISE NOTICE '3. Ahora deberías tener acceso al panel de administración';
  RAISE NOTICE '';
END $$;
