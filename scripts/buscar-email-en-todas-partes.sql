-- ============================================
-- DIAGNÓSTICO COMPLETO: Database error saving new user
-- ============================================

-- PASO 1: Verificar estructura de tabla usuarios
-- ============================================
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'usuarios'
ORDER BY ordinal_position;

-- PASO 2: Verificar constraints (UNIQUE, FK, etc.)
-- ============================================
SELECT
  con.conname as constraint_name,
  con.contype as constraint_type,
  pg_get_constraintdef(con.oid) as definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'usuarios';

-- PASO 3: Verificar políticas RLS actuales
-- ============================================
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'usuarios'
ORDER BY policyname;

-- PASO 4: Ver si el email ya existe en auth.users
-- ============================================
SELECT
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at,
  deleted_at
FROM auth.users
WHERE email ILIKE 'fjtechsols@gmail.com'
ORDER BY created_at DESC;

-- PASO 5: Verificar roles existen
-- ============================================
SELECT * FROM roles ORDER BY id;

-- Debe mostrar:
-- id=1, nombre='admin'
-- id=2, nombre='usuario'

-- PASO 6: Verificar si hay triggers
-- ============================================
SELECT
  tgname as trigger_name,
  tgenabled as enabled,
  pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgrelid = 'usuarios'::regclass
AND tgisinternal = false;
