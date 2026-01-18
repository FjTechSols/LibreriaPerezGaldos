-- ====================================================================
-- ACTUALIZACIÓN DE PORTADAS ANTIGUAS POR PORTADA POR DEFECTO
-- ====================================================================

-- 1. VERIFICACIÓN: Ver cuántos libros tienen la imagen antigua de Pexels
-- (La que usamos anteriormente en libroService.ts)
SELECT count(*) as libros_con_imagen_antigua
FROM libros 
WHERE imagen_url LIKE '%pexels.com%';

-- 2. ACTUALIZACIÓN: Poner a NULL para que el frontend use automáticamente 
-- la constante DEFAULT_BOOK_COVER que hemos actualizado a '/default-book-cover.png'
UPDATE libros 
SET imagen_url = NULL 
WHERE imagen_url LIKE '%pexels.com%';

-- 3. LIMPIEZA ADICIONAL: Asegurar que los que tienen strings vacíos también usen la defecto
UPDATE libros 
SET imagen_url = NULL 
WHERE imagen_url = '';

-- VERIFICACIÓN FINAL
SELECT id, titulo, imagen_url 
FROM libros 
WHERE activo = true 
ORDER BY created_at DESC
LIMIT 20;
