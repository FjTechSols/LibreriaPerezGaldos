-- Script de Verificación de Búsqueda y Unaccent
-- Ejecuta esto en el SQL Editor de Supabase

-- 1. Verificar qué hace f_unaccent con 'Táctica'
SELECT 'Prueba unitaria f_unaccent' as test, public.f_unaccent('Táctica') as resultado;
-- Debería retornar 'Tactica'

-- 2. Verificar que la extensión unaccent está buscando el archivo de reglas correcto
SELECT * FROM pg_ts_dict WHERE dictname = 'unaccent';

-- 3. Probar la RPC directamente con 'tactica' (sin acento)
-- Debería encontrar libros que tengan 'táctica' en el título
SELECT id, titulo 
FROM public.search_books(
    'tactica', -- search_term
    5, -- limit
    0, -- offset
    NULL, NULL, NULL, NULL, NULL, true, 'relevance'
);

-- 4. Probar la RPC directamente con 'táctica' (con acento)
SELECT id, titulo 
FROM public.search_books(
    'táctica', -- search_term
    5, -- limit
    0, -- offset
    NULL, NULL, NULL, NULL, NULL, true, 'relevance'
);
