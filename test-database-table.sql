-- SQL para verificar el estado de la tabla abebooks_sync_log
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Verificar que la tabla existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'abebooks_sync_log'
) AS table_exists;

-- 2. Ver estructura de la tabla
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'abebooks_sync_log'
ORDER BY ordinal_position;

-- 3. Contar registros totales
SELECT COUNT(*) AS total_registros FROM abebooks_sync_log;

-- 4. Ver últimos 5 registros
SELECT 
  id,
  sync_date,
  status,
  books_exported,
  error_message,
  workflow_run_id,
  duration_seconds,
  created_at
FROM abebooks_sync_log
ORDER BY sync_date DESC
LIMIT 5;

-- 5. Verificar políticas RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'abebooks_sync_log';

-- 6. Insertar un registro de prueba (para verificar que funciona)
INSERT INTO abebooks_sync_log (
  sync_date,
  status,
  books_exported,
  workflow_run_id
) VALUES (
  NOW(),
  'success',
  100,
  'test-manual-insert'
) RETURNING *;

-- 7. Verificar que el registro de prueba se insertó
SELECT * FROM abebooks_sync_log WHERE workflow_run_id = 'test-manual-insert';
