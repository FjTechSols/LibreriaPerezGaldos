-- ============================================================================
-- BORRAR TODOS LOS LIBROS Y RESETEAR IDs
-- ============================================================================
--
-- ⚠️  ADVERTENCIA: Este script borra TODOS los libros de la base de datos
--     y resetea el contador de IDs a 0. Úsalo con precaución.
--
-- Uso:
--   1. Abre Supabase Dashboard → SQL Editor
--   2. Copia y pega este script
--   3. Ejecuta
--
-- ============================================================================

-- Desactivar temporalmente las restricciones de foreign key
SET session_replication_role = 'replica';

-- 1. Borrar todos los registros de la tabla libros
DELETE FROM libros;

-- 2. Resetear la secuencia del ID para que empiece desde 1
ALTER SEQUENCE libros_id_seq RESTART WITH 1;

-- Reactivar las restricciones de foreign key
SET session_replication_role = 'origin';

-- Verificar que la tabla está vacía
SELECT COUNT(*) as total_libros FROM libros;

-- Verificar que la secuencia está en 1
SELECT last_value FROM libros_id_seq;

-- ============================================================================
-- ✅ Script completado
-- ============================================================================
-- Ahora puedes importar tus libros desde cero con IDs empezando en 1
