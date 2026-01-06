-- NORMALIZE UBICACION VALUES IN PRODUCTION
-- Fix case inconsistencies and invalid values

BEGIN;

-- 1. Fix case variations of "Almacén"
UPDATE public.libros 
SET ubicacion = 'Almacén'
WHERE ubicacion IN ('almacen', 'Almacen');

-- 2. Fix "Galeon" to "Galeón" (with accent)
UPDATE public.libros 
SET ubicacion = 'Galeón'
WHERE ubicacion = 'Galeon';

-- 3. Fix invalid values (-1, 0) to 'General' (default)
UPDATE public.libros 
SET ubicacion = 'General'
WHERE ubicacion IN ('-1', '0');

-- 4. Fix NULL values to 'General'
UPDATE public.libros 
SET ubicacion = 'General'
WHERE ubicacion IS NULL OR ubicacion = '';

-- 5. Fix the XXX... placeholder to 'General'
UPDATE public.libros 
SET ubicacion = 'General'
WHERE ubicacion LIKE 'XXX%';

-- Verification query
SELECT 
    ubicacion,
    COUNT(*) as total
FROM public.libros
GROUP BY ubicacion
ORDER BY ubicacion;

COMMIT;

-- Expected result after fix:
-- Almacén: ~242,818 (242,800 + 3 + 15)
-- Galeón: 3,559
-- General: ~151,074 (151,069 + 1 + 2 + 1 + 1)
-- Hortaleza: 1,284
-- Reina: 14,108
