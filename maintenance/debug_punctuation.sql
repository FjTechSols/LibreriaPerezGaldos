-- DEBUG PUNCTUATION
-- Verificar cómo Postgres divide la cadena 'diarios:morla' con nuestra regex

-- 1. Test de Regex Split
SELECT 
    'diarios:morla' as input,
    regexp_split_to_array(trim('diarios:morla'), E'[\\s,.:;()_/-]+') as tokens;

-- 2. Test manual de la lógica generada
-- Esto simula lo que haría el bucle FOREACH
SELECT id, titulo, autor 
FROM libros l
WHERE 
    (
        l.legacy_id ILIKE '%diarios%' OR
        l.isbn ILIKE '%diarios%' OR
        public.f_unaccent(lower(l.titulo)) ILIKE ('%' || public.f_unaccent(lower('diarios')) || '%') OR
        public.f_unaccent(lower(l.autor)) ILIKE ('%' || public.f_unaccent(lower('diarios')) || '%')
    )
    AND
    (
        l.legacy_id ILIKE '%morla%' OR
        l.isbn ILIKE '%morla%' OR
        public.f_unaccent(lower(l.titulo)) ILIKE ('%' || public.f_unaccent(lower('morla')) || '%') OR
        public.f_unaccent(lower(l.autor)) ILIKE ('%' || public.f_unaccent(lower('morla')) || '%')
    );

-- 3. Llamada actual a la RPC con el término conflictivo
SELECT * FROM public.search_books('diarios:morla', 10, 0);
