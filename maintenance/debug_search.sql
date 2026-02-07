-- DEBUG SEARCH (Ejecutar en SQL Editor)

-- 1. Verificación de Datos Existentes
-- Buscar manualmente libros que tengan 'tactica' (ignorando case/accents por un momento con ilike simple)
SELECT id, titulo, autor, activo, stock, precio 
FROM libros 
WHERE titulo ILIKE '%tactica%' OR titulo ILIKE '%táctica%'
LIMIT 5;

-- 2. Prueba de la función RPC (Simulando llamada Frontend)
-- Parámetros copiados de la lógica de libroService.ts
SELECT * FROM public.search_books(
    'tactica',       -- search_term
    10,              -- limit
    0,               -- offset
    NULL,            -- min_price
    NULL,            -- max_price
    NULL,            -- category_id
    NULL,            -- editorial_id
    'all',           -- stock_status (Enviamos 'all' para descartar filtro de stock)
    true,            -- is_visible (activo = true)
    'relevance'      -- sort_by
);

-- 3. Prueba de la función f_unaccent dentro de una query simple
SELECT id, titulo, public.f_unaccent(lower(titulo)) as titulo_limpio
FROM libros 
WHERE public.f_unaccent(lower(titulo)) LIKE '%tactica%'
LIMIT 5;
