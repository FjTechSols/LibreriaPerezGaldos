-- ========================================
-- DIAGNÓSTICO COMPLETO UNIFICADO
-- ========================================
-- Este script muestra TODA la información en una sola salida

WITH
-- 1. Tu ID de usuario actual
mi_uid AS (
  SELECT auth.uid() as user_id
),

-- 2. Información de auth.users
auth_info AS (
  SELECT
    'AUTH_USER' as tipo,
    id::text as identificador,
    email as dato_1,
    COALESCE(raw_user_meta_data->>'role', 'sin_rol') as dato_2,
    COALESCE(raw_app_meta_data->>'role', 'sin_rol_app') as dato_3
  FROM auth.users
  WHERE id = (SELECT user_id FROM mi_uid)
),

-- 3. Información de tabla usuarios
usuarios_info AS (
  SELECT
    'TABLA_USUARIOS' as tipo,
    id::text as identificador,
    email as dato_1,
    rol_id::text as dato_2,
    COALESCE(metadata->>'role', 'sin_metadata') as dato_3
  FROM usuarios
  WHERE id = (SELECT user_id FROM mi_uid)
),

-- 4. Todos los roles disponibles
roles_info AS (
  SELECT
    'ROLES_DISPONIBLES' as tipo,
    id::text as identificador,
    nombre as dato_1,
    NULL::text as dato_2,
    NULL::text as dato_3
  FROM roles
  ORDER BY jerarquia DESC
),

-- 5. Verificar funciones
funciones_info AS (
  SELECT
    'FUNCIONES' as tipo,
    'is_admin' as identificador,
    is_admin()::text as dato_1,
    NULL::text as dato_2,
    NULL::text as dato_3
  UNION ALL
  SELECT
    'FUNCIONES' as tipo,
    'is_editor' as identificador,
    is_editor()::text as dato_1,
    NULL::text as dato_2,
    NULL::text as dato_3
  UNION ALL
  SELECT
    'FUNCIONES' as tipo,
    'can_manage_books' as identificador,
    can_manage_books()::text as dato_1,
    NULL::text as dato_2,
    NULL::text as dato_3
  UNION ALL
  SELECT
    'FUNCIONES' as tipo,
    'can_view_all' as identificador,
    can_view_all()::text as dato_1,
    NULL::text as dato_2,
    NULL::text as dato_3
),

-- 6. Información de estructura
estructura_info AS (
  SELECT
    'ESTRUCTURA_USUARIOS' as tipo,
    column_name::text as identificador,
    data_type as dato_1,
    is_nullable as dato_2,
    column_default as dato_3
  FROM information_schema.columns
  WHERE table_name = 'usuarios'
    AND table_schema = 'public'
)

-- Combinar todo
SELECT * FROM auth_info
UNION ALL
SELECT * FROM usuarios_info
UNION ALL
SELECT * FROM roles_info
UNION ALL
SELECT * FROM funciones_info
UNION ALL
SELECT * FROM estructura_info
ORDER BY
  CASE tipo
    WHEN 'AUTH_USER' THEN 1
    WHEN 'TABLA_USUARIOS' THEN 2
    WHEN 'ROLES_DISPONIBLES' THEN 3
    WHEN 'FUNCIONES' THEN 4
    WHEN 'ESTRUCTURA_USUARIOS' THEN 5
    ELSE 6
  END,
  identificador;
