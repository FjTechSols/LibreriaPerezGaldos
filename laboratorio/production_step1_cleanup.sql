-- ============================================
-- PRODUCTION UPDATE SCRIPT - PART 1: CLEANUP
-- Execute in Supabase Production SQL Editor
-- ============================================

-- PASO 1: Crear backup de seguridad
CREATE TABLE IF NOT EXISTS public.libros_backup_20260105 AS 
SELECT * FROM public.libros;

-- Verificar backup
SELECT COUNT(*) as registros_respaldados FROM public.libros_backup_20260105;

-- PASO 2: Eliminar los 11 libros sin legacy_id (duplicados de prueba)
DELETE FROM public.libros 
WHERE legacy_id IS NULL;

-- Verificar eliminación
SELECT COUNT(*) as libros_eliminados 
FROM public.libros_backup_20260105 
WHERE legacy_id IS NULL;

-- PASO 3: Verificar estado actual
SELECT 
    COUNT(*) as total_libros,
    COUNT(legacy_id) as con_legacy_id,
    COUNT(*) - COUNT(legacy_id) as sin_legacy_id
FROM public.libros;

-- Resultado esperado: 412719 total, 412719 con legacy_id, 0 sin legacy_id
