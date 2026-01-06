-- ============================================
-- PRODUCTION DATABASE ANALYSIS SCRIPT
-- Execute this in Supabase Production SQL Editor
-- ============================================

-- 1. Check if legacy_id has UNIQUE constraint
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'libros' 
    AND tc.table_schema = 'public'
    AND kcu.column_name = 'legacy_id';

-- 2. Count books without legacy_id
SELECT 
    COUNT(*) as total_libros,
    COUNT(legacy_id) as con_legacy_id,
    COUNT(*) - COUNT(legacy_id) as sin_legacy_id
FROM public.libros;

-- 3. Check for duplicate legacy_id values
SELECT 
    legacy_id,
    COUNT(*) as duplicados
FROM public.libros
WHERE legacy_id IS NOT NULL
GROUP BY legacy_id
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC
LIMIT 20;

-- 4. Count total duplicates
SELECT COUNT(*) as total_legacy_ids_duplicados
FROM (
    SELECT legacy_id
    FROM public.libros
    WHERE legacy_id IS NOT NULL
    GROUP BY legacy_id
    HAVING COUNT(*) > 1
) duplicates;

-- 5. Check books referenced in pedidos (critical data)
SELECT 
    COUNT(DISTINCT pd.libro_id) as libros_en_pedidos,
    COUNT(DISTINCT l.id) as total_libros_activos
FROM public.libros l
LEFT JOIN public.pedido_detalles pd ON l.id = pd.libro_id;

-- 6. Sample of books without legacy_id (if any)
SELECT id, titulo, autor, created_at
FROM public.libros
WHERE legacy_id IS NULL
LIMIT 10;

-- 7. Check current table size
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename = 'libros' AND schemaname = 'public';
