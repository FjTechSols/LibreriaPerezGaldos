-- Test rápido: Insertar un registro de prueba en abebooks_sync_log
-- Ejecutar en Supabase Dashboard > SQL Editor

INSERT INTO abebooks_sync_log (
  sync_date,
  status,
  books_exported,
  workflow_run_id,
  duration_seconds
) VALUES (
  NOW(),
  'success',
  150,
  'test-manual-' || NOW()::text,
  45
) RETURNING *;

-- Luego ejecuta esto para verificar que se insertó:
SELECT 
  id,
  sync_date,
  status,
  books_exported,
  workflow_run_id,
  duration_seconds
FROM abebooks_sync_log 
ORDER BY sync_date DESC 
LIMIT 1;
