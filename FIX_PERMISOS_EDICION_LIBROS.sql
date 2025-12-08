-- ==========================================
-- FIX: Funciones de permisos faltantes
-- ==========================================
-- Este script crea las funciones necesarias para que los editores
-- puedan actualizar libros correctamente.

-- FUNCIÓN: is_editor
-- Verifica si el usuario tiene rol de Admin (1), Editor (2) o Gestor (3)
CREATE OR REPLACE FUNCTION is_editor()
RETURNS BOOLEAN
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  user_rol INT;
BEGIN
  SELECT rol_id INTO user_rol
  FROM usuarios
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  RETURN COALESCE(user_rol IN (1, 2, 3), false);
END;
$$;

-- FUNCIÓN: can_manage_books
-- Verifica si el usuario puede gestionar libros
CREATE OR REPLACE FUNCTION can_manage_books()
RETURNS BOOLEAN
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN is_editor();
END;
$$;

-- FUNCIÓN: can_view_all
-- Verifica si el usuario puede ver todos los datos
CREATE OR REPLACE FUNCTION can_view_all()
RETURNS BOOLEAN
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN is_editor();
END;
$$;

-- FUNCIÓN: is_admin (actualizar sin eliminar por dependencias RLS)
-- Verifica si el usuario es Admin (rol_id = 1)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  user_rol INT;
BEGIN
  SELECT rol_id INTO user_rol
  FROM usuarios
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  RETURN COALESCE(user_rol = 1, false);
END;
$$;

-- ==========================================
-- VERIFICACIÓN: Probar las funciones
-- ==========================================

-- Ver tu usuario y rol actual
SELECT
  auth.uid() as auth_user_id,
  u.id as usuario_id,
  u.email,
  u.rol_id,
  r.nombre as rol_nombre
FROM usuarios u
LEFT JOIN roles r ON r.id = u.rol_id
WHERE u.auth_user_id = auth.uid();

-- Probar las funciones de permisos
SELECT
  'is_editor()' as funcion,
  is_editor() as resultado
UNION ALL
SELECT
  'can_manage_books()' as funcion,
  can_manage_books() as resultado
UNION ALL
SELECT
  'can_view_all()' as funcion,
  can_view_all() as resultado
UNION ALL
SELECT
  'is_admin()' as funcion,
  is_admin() as resultado;

-- ==========================================
-- RESULTADO ESPERADO:
-- ==========================================
-- Si tu usuario tiene rol_id = 1, 2 o 3:
--   is_editor() = true
--   can_manage_books() = true
--   can_view_all() = true
--
-- Si tu usuario tiene rol_id = 1:
--   is_admin() = true
-- ==========================================
