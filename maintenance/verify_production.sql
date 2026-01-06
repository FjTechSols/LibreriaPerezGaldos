-- PRODUCTION DATA VERIFICATION QUERIES
-- Run these against Supabase Production to verify UPSERT success

-- 1. TOTAL COUNT (Should be ~412,697)
SELECT COUNT(*) as total_libros FROM public.libros;

-- 2. STOCK DISTRIBUTION
SELECT 
    CASE 
        WHEN stock = 0 THEN 'Sin Stock'
        WHEN stock BETWEEN 1 AND 5 THEN '1-5 unidades'
        WHEN stock BETWEEN 6 AND 20 THEN '6-20 unidades'
        ELSE 'Más de 20'
    END as rango_stock,
    COUNT(*) as cantidad
FROM public.libros
GROUP BY rango_stock
ORDER BY rango_stock;

-- 3. UBICACION MAPPING VERIFICATION (by legacy_id pattern)
SELECT 
    u.nombre as ubicacion,
    COUNT(l.id) as total_libros,
    CASE 
        WHEN u.id = 1 THEN 'A-series (Almacén)'
        WHEN u.id = 2 THEN 'G-series (Galeón)'
        WHEN u.id = 3 THEN 'H-series (Hortaleza)'
        WHEN u.id = 4 THEN 'R-series (Reina)'
        WHEN u.id = 5 THEN 'Numeric (General)'
    END as patron_esperado
FROM public.libros l
JOIN public.ubicaciones u ON l.ubicacion_id = u.id
GROUP BY u.id, u.nombre
ORDER BY u.id;

-- 4. SAMPLE VERIFICATION (Check specific legacy_id patterns)
SELECT 
    legacy_id,
    titulo,
    stock,
    ubicacion_id,
    precio
FROM public.libros
WHERE legacy_id IN ('A-00001', 'G-00001', 'H-00001', 'R-00001', '00001')
ORDER BY legacy_id;

-- 5. DATA QUALITY CHECK (Missing critical fields)
SELECT 
    COUNT(*) FILTER (WHERE titulo IS NULL OR titulo = '''') as sin_titulo,
    COUNT(*) FILTER (WHERE autor IS NULL OR autor = '''') as sin_autor,
    COUNT(*) FILTER (WHERE precio IS NULL OR precio <= 0) as sin_precio,
    COUNT(*) FILTER (WHERE ubicacion_id IS NULL) as sin_ubicacion
FROM public.libros;

-- 6. LEGACY_ID UNIQUENESS
SELECT COUNT(DISTINCT legacy_id) as unique_legacy_ids,
       COUNT(*) as total_records
FROM public.libros;
