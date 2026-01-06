-- ====================================================================
-- SCRIPT DE REPARACIÓN DE PERMISOS PARA GESTIÓN DE CLIENTES
-- Instrucciones: Ejecuta este script en el SQL EDITOR de Supabase.
-- ====================================================================

-- 1. DIAGNÓSTICO: Buscar el usuario específico y ver su rol actual
SELECT 
    u.id, 
    u.auth_user_id, 
    u.email, 
    u.rol_id, 
    r.nombre as rol_nombre,
    r.display_name as rol_display
FROM usuarios u
LEFT JOIN roles r ON u.rol_id = r.id
WHERE u.email = 'pedidogaleon@gmail.com';

-- 2. ASEGURAR QUE LAS FUNCIONES DE SEGURIDAD SON CORRECTAS
-- is_admin debería incluir SuperAdmin (1) y Admin (2)
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
    RETURN COALESCE(user_rol IN (1, 2), false);
END;
$$;

-- is_editor debería incluir SuperAdmin (1), Admin (2) y Editor (3)
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

-- 3. REPARAR POLÍTICAS DE LA TABLA CLIENTES
-- Habilitar RLS (por seguridad)
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas antiguas para evitar conflictos
DROP POLICY IF EXISTS "Todos pueden ver clientes activos" ON clientes;
DROP POLICY IF EXISTS "Solo super_admin y admin pueden gestionar clientes" ON clientes;
DROP POLICY IF EXISTS "Admins and Editors can insert clients" ON clientes;
DROP POLICY IF EXISTS "Admins and Editors can update clients" ON clientes;
DROP POLICY IF EXISTS "Admins can delete clients" ON clientes;
DROP POLICY IF EXISTS "Admin and staff can view all clients" ON clientes;

-- Crear nuevas políticas granulares
-- A) SELECT: Todos los administradores, editores y visualizadores pueden ver clientes
CREATE POLICY "Admin and staff can view all clients"
    ON clientes FOR SELECT
    TO authenticated
    USING (is_editor() OR EXISTS (
        SELECT 1 FROM usuarios u 
        WHERE u.auth_user_id = auth.uid() 
        AND u.rol_id = 4 -- Visualizador (ID 4 según MIGRACION_ROLES_PERMISOS_EXTENDIDA.sql)
    ));

-- B) INSERT: Solo SuperAdmin, Admin y Editor pueden crear clientes
CREATE POLICY "Admins and Editors can insert clients"
    ON clientes FOR INSERT
    TO authenticated
    WITH CHECK (is_editor());

-- C) UPDATE: Solo SuperAdmin, Admin y Editor pueden modificar clientes
CREATE POLICY "Admins and Editors can update clients"
    ON clientes FOR UPDATE
    TO authenticated
    USING (is_editor())
    WITH CHECK (is_editor());

-- D) DELETE: Solo SuperAdmin y Admin pueden eliminar clientes (más restrictivo)
CREATE POLICY "Admins can delete clients"
    ON clientes FOR DELETE
    TO authenticated
    USING (is_admin());

-- 4. VERIFICACIÓN FINAL: Listar políticas actuales de la tabla clientes
SELECT 
    schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'clientes';
