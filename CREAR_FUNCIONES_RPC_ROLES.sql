/*
  # Crear Funciones RPC para Sistema de Roles y Permisos

  Este script crea todas las funciones RPC necesarias para el sistema de roles.

  ## Instrucciones de Aplicación:
  1. Ve a Supabase Dashboard → SQL Editor
  2. Crea una nueva query
  3. Copia y pega TODO este contenido
  4. Ejecuta la query

  ## Funciones que se crean:
  - obtener_permisos_usuario: Obtiene todos los permisos de un usuario
  - tiene_permiso: Verifica si un usuario tiene un permiso específico
  - obtener_rol_principal: Obtiene el rol principal de un usuario
  - obtener_roles_usuario: Obtiene todos los roles de un usuario

  ## Nota:
  - Este script primero agrega las columnas necesarias a la tabla roles si no existen
*/

-- =========================
-- Paso 1: Agregar columnas a la tabla roles si no existen
-- =========================

DO $$
BEGIN
  -- Agregar display_name si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roles' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE roles ADD COLUMN display_name VARCHAR(100);
    UPDATE roles SET display_name = nombre WHERE display_name IS NULL;
    ALTER TABLE roles ALTER COLUMN display_name SET NOT NULL;
  END IF;

  -- Agregar nivel_jerarquia si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roles' AND column_name = 'nivel_jerarquia'
  ) THEN
    ALTER TABLE roles ADD COLUMN nivel_jerarquia INTEGER DEFAULT 999;
    -- Asignar niveles jerárquicos por defecto
    UPDATE roles SET nivel_jerarquia = 1 WHERE nombre = 'webmaster';
    UPDATE roles SET nivel_jerarquia = 2 WHERE nombre = 'admin';
    UPDATE roles SET nivel_jerarquia = 3 WHERE nombre = 'gerente';
    UPDATE roles SET nivel_jerarquia = 4 WHERE nombre = 'empleado';
    UPDATE roles SET nivel_jerarquia = 5 WHERE nombre = 'cliente';
    ALTER TABLE roles ALTER COLUMN nivel_jerarquia SET NOT NULL;
  END IF;
END $$;

-- =========================
-- Función: obtener_permisos_usuario
-- Retorna los permisos de un usuario
-- =========================

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

-- =========================
-- Función: tiene_permiso
-- Verifica si un usuario tiene un permiso específico
-- =========================

DROP FUNCTION IF EXISTS tiene_permiso(UUID, TEXT);

CREATE OR REPLACE FUNCTION tiene_permiso(usuario_id UUID, permiso_codigo TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    -- Verificar en usuarios_roles (sistema nuevo)
    SELECT 1
    FROM permisos p
    INNER JOIN roles_permisos rp ON p.id = rp.permiso_id
    INNER JOIN usuarios_roles ur ON rp.rol_id = ur.rol_id
    WHERE ur.user_id = usuario_id
      AND p.codigo = permiso_codigo
      AND ur.activo = true
  ) OR EXISTS (
    -- Verificar en usuarios.rol_id (sistema legacy)
    SELECT 1
    FROM permisos p
    INNER JOIN roles_permisos rp ON p.id = rp.permiso_id
    INNER JOIN usuarios u ON u.rol_id = rp.rol_id
    WHERE u.auth_user_id = usuario_id
      AND p.codigo = permiso_codigo
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- =========================
-- Función: obtener_rol_principal
-- Obtiene el rol principal de un usuario (el de mayor jerarquía)
-- =========================

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

-- =========================
-- Función: obtener_roles_usuario
-- Obtiene todos los roles activos de un usuario
-- =========================

DROP FUNCTION IF EXISTS obtener_roles_usuario(UUID);

CREATE OR REPLACE FUNCTION obtener_roles_usuario(usuario_id UUID)
RETURNS TABLE(
  rol_id INTEGER,
  rol_nombre TEXT,
  rol_display_name TEXT,
  nivel_jerarquia INTEGER,
  asignado_en TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  -- Roles desde usuarios_roles (sistema nuevo)
  SELECT
    r.id,
    r.nombre::TEXT,
    r.display_name::TEXT,
    r.nivel_jerarquia,
    ur.created_at
  FROM roles r
  INNER JOIN usuarios_roles ur ON r.id = ur.rol_id
  WHERE ur.user_id = usuario_id
    AND ur.activo = true

  UNION

  -- Rol desde usuarios.rol_id (sistema legacy)
  SELECT
    r.id,
    r.nombre::TEXT,
    r.display_name::TEXT,
    r.nivel_jerarquia,
    u.fecha_registro
  FROM roles r
  INNER JOIN usuarios u ON u.rol_id = r.id
  WHERE u.auth_user_id = usuario_id

  ORDER BY nivel_jerarquia ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- =========================
-- Comentarios sobre las funciones
-- =========================

COMMENT ON FUNCTION obtener_permisos_usuario(UUID) IS
'Obtiene todos los códigos de permisos activos de un usuario. Busca en usuarios_roles y usuarios.rol_id para compatibilidad.';

COMMENT ON FUNCTION tiene_permiso(UUID, TEXT) IS
'Verifica si un usuario tiene un permiso específico. Retorna true si el usuario tiene el permiso, false en caso contrario.';

COMMENT ON FUNCTION obtener_rol_principal(UUID) IS
'Obtiene el rol principal (de mayor jerarquía) de un usuario. Busca primero en usuarios_roles, luego en usuarios.rol_id.';

COMMENT ON FUNCTION obtener_roles_usuario(UUID) IS
'Obtiene todos los roles activos asignados a un usuario, ordenados por nivel de jerarquía.';
