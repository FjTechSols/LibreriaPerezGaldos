/*
  # Corregir Funciones RPC del Sistema de Roles y Permisos

  1. Problema Identificado
    - Hay funciones RPC duplicadas con el mismo nombre
    - Las funciones tienen errores en las referencias de tablas
    - Las funciones no devuelven los datos esperados

  2. Solución
    - Eliminar todas las funciones existentes
    - Recrear las funciones con la lógica correcta
    - Asegurar que usen SECURITY DEFINER para evitar problemas RLS
    - Usar referencias correctas a tablas y columnas

  3. Funciones RPC
    - obtener_roles_usuario: Devuelve todos los roles de un usuario
    - obtener_rol_principal: Devuelve el rol principal (mayor jerarquía)
    - obtener_permisos_usuario: Devuelve los códigos de permisos
    - tiene_permiso: Verifica si un usuario tiene un permiso específico
*/

-- =====================================================
-- Eliminar funciones existentes
-- =====================================================

DROP FUNCTION IF EXISTS obtener_permisos_usuario(uuid);
DROP FUNCTION IF EXISTS obtener_permisos_usuario(text);
DROP FUNCTION IF EXISTS obtener_roles_usuario(uuid);
DROP FUNCTION IF EXISTS obtener_roles_usuario(text);
DROP FUNCTION IF EXISTS obtener_rol_principal(uuid);
DROP FUNCTION IF EXISTS obtener_rol_principal(text);
DROP FUNCTION IF EXISTS tiene_permiso(uuid, text);
DROP FUNCTION IF EXISTS tiene_permiso(text, text);

-- =====================================================
-- FUNCIÓN: obtener_roles_usuario
-- Devuelve todos los roles activos de un usuario
-- =====================================================

CREATE OR REPLACE FUNCTION obtener_roles_usuario(usuario_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
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
        'descripcion', r.descripcion,
        'nivel_jerarquia', r.nivel_jerarquia,
        'activo', r.activo,
        'es_sistema', r.es_sistema
      )
      ORDER BY r.nivel_jerarquia ASC
    ),
    '[]'::jsonb
  ) INTO result
  FROM (
    -- Roles desde usuarios_roles (sistema nuevo)
    SELECT DISTINCT
      r.id,
      r.nombre,
      r.display_name,
      r.descripcion,
      r.nivel_jerarquia,
      r.activo,
      r.es_sistema
    FROM roles r
    INNER JOIN usuarios_roles ur ON r.id = ur.rol_id
    WHERE ur.user_id = usuario_id
      AND ur.activo = true
      AND r.activo = true

    UNION

    -- Rol desde usuarios.rol_id (sistema legacy)
    SELECT DISTINCT
      r.id,
      r.nombre,
      r.display_name,
      r.descripcion,
      r.nivel_jerarquia,
      r.activo,
      r.es_sistema
    FROM roles r
    INNER JOIN usuarios u ON u.rol_id = r.id
    WHERE u.auth_user_id = usuario_id
      AND u.activo = true
      AND r.activo = true
  ) r;

  RETURN result;
END;
$$;

-- =====================================================
-- FUNCIÓN: obtener_rol_principal
-- Devuelve el rol con mayor jerarquía del usuario
-- =====================================================

CREATE OR REPLACE FUNCTION obtener_rol_principal(usuario_id UUID)
RETURNS TABLE (
  rol_nombre TEXT,
  rol_display_name TEXT,
  nivel_jerarquia INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.nombre::TEXT as rol_nombre,
    r.display_name::TEXT as rol_display_name,
    r.nivel_jerarquia
  FROM (
    -- Roles desde usuarios_roles (sistema nuevo)
    SELECT
      r.id,
      r.nombre,
      r.display_name,
      r.nivel_jerarquia
    FROM roles r
    INNER JOIN usuarios_roles ur ON r.id = ur.rol_id
    WHERE ur.user_id = usuario_id
      AND ur.activo = true
      AND r.activo = true

    UNION

    -- Rol desde usuarios.rol_id (sistema legacy)
    SELECT
      r.id,
      r.nombre,
      r.display_name,
      r.nivel_jerarquia
    FROM roles r
    INNER JOIN usuarios u ON u.rol_id = r.id
    WHERE u.auth_user_id = usuario_id
      AND u.activo = true
      AND r.activo = true
  ) r
  ORDER BY r.nivel_jerarquia ASC
  LIMIT 1;
END;
$$;

-- =====================================================
-- FUNCIÓN: obtener_permisos_usuario
-- Devuelve los códigos de todos los permisos del usuario
-- =====================================================

CREATE OR REPLACE FUNCTION obtener_permisos_usuario(usuario_id UUID)
RETURNS TABLE (permiso_codigo TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.codigo::TEXT
  FROM permisos p
  INNER JOIN roles_permisos rp ON p.id = rp.permiso_id
  WHERE rp.rol_id IN (
    -- Roles desde usuarios_roles (sistema nuevo)
    SELECT ur.rol_id
    FROM usuarios_roles ur
    WHERE ur.user_id = usuario_id
      AND ur.activo = true

    UNION

    -- Rol desde usuarios.rol_id (sistema legacy)
    SELECT u.rol_id
    FROM usuarios u
    WHERE u.auth_user_id = usuario_id
      AND u.activo = true
  )
  ORDER BY p.codigo::TEXT;
END;
$$;

-- =====================================================
-- FUNCIÓN: tiene_permiso
-- Verifica si un usuario tiene un permiso específico
-- =====================================================

CREATE OR REPLACE FUNCTION tiene_permiso(
  usuario_id UUID,
  permiso_codigo TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM permisos p
    INNER JOIN roles_permisos rp ON p.id = rp.permiso_id
    WHERE p.codigo = permiso_codigo
      AND rp.rol_id IN (
        -- Roles desde usuarios_roles (sistema nuevo)
        SELECT ur.rol_id
        FROM usuarios_roles ur
        WHERE ur.user_id = usuario_id
          AND ur.activo = true

        UNION

        -- Rol desde usuarios.rol_id (sistema legacy)
        SELECT u.rol_id
        FROM usuarios u
        WHERE u.auth_user_id = usuario_id
          AND u.activo = true
      )
  );
END;
$$;

-- =====================================================
-- Otorgar permisos de ejecución
-- =====================================================

GRANT EXECUTE ON FUNCTION obtener_roles_usuario(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION obtener_rol_principal(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION obtener_permisos_usuario(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION tiene_permiso(UUID, TEXT) TO authenticated;

-- =====================================================
-- Comentarios de documentación
-- =====================================================

COMMENT ON FUNCTION obtener_roles_usuario(UUID) IS
  'Devuelve todos los roles activos de un usuario en formato JSONB';

COMMENT ON FUNCTION obtener_rol_principal(UUID) IS
  'Devuelve el rol con mayor jerarquía (nivel más bajo) del usuario';

COMMENT ON FUNCTION obtener_permisos_usuario(UUID) IS
  'Devuelve los códigos de todos los permisos que tiene el usuario a través de sus roles';

COMMENT ON FUNCTION tiene_permiso(UUID, TEXT) IS
  'Verifica si un usuario tiene un permiso específico (devuelve boolean)';
