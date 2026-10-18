-- Read-only regression checks for the advanced-search RPC.
BEGIN;
DO $checks$
DECLARE
    expected_count bigint;
    actual_count bigint;
    sample record;
    matches bigint;
BEGIN
    SELECT count(*) INTO expected_count FROM public.libros l
    WHERE l.activo AND l.stock > 0
      AND public.f_unaccent(lower(l.titulo)) ILIKE '%historia%'
      AND public.f_unaccent(lower(l.titulo)) ILIKE '%universal%';
    SELECT s.total_count INTO actual_count FROM public.search_books_advanced(
        p_titulo => 'historia universal', p_stock_status => 'in_stock', p_limit => 1) s;
    IF actual_count IS DISTINCT FROM expected_count OR actual_count = 0 THEN
        RAISE EXCEPTION 'Title count mismatch: % / %', actual_count, expected_count;
    END IF;
    SELECT s.total_count INTO actual_count FROM public.search_books_advanced(
        p_titulo => E'  ÚNIVERSAL\n HÍSTORIA  ', p_stock_status => 'in_stock', p_limit => 1) s;
    IF actual_count IS DISTINCT FROM expected_count THEN RAISE EXCEPTION 'Accent/word-order/whitespace mismatch'; END IF;

    SELECT * INTO sample FROM public.search_books_advanced(
        p_titulo => 'historia universal', p_stock_status => 'in_stock', p_limit => 1);
    SELECT count(*) INTO matches FROM public.search_books_advanced(
        p_titulo => 'historia universal', p_autor => sample.autor,
        p_legacy_id => sample.legacy_id, p_publisher => sample.editorial_nombre,
        p_stock_status => 'in_stock', p_limit => 1000) s WHERE s.id = sample.id;
    IF matches <> 1 THEN RAISE EXCEPTION 'Combined title/author/publisher/code mismatch'; END IF;

    SELECT count(*) INTO matches FROM public.search_books_advanced(
        p_titulo => 'historia universal', p_legacy_id => 'NO-EXISTE-AUDITORIA-2026') s;
    IF matches <> 0 THEN RAISE EXCEPTION 'Internal code ignored'; END IF;

    IF EXISTS (SELECT 1 FROM public.search_books_advanced(p_titulo => 'historia', p_stock_status => 'out_of_stock') s WHERE s.stock > 0) THEN
        RAISE EXCEPTION 'Stock filter ignored';
    END IF;
    IF EXISTS (SELECT 1 FROM public.search_books_advanced(p_titulo => 'historia', p_cover_status => 'without_cover') s WHERE nullif(s.imagen_url, '') IS NOT NULL) THEN
        RAISE EXCEPTION 'Cover filter ignored';
    END IF;
    IF EXISTS (SELECT 1 FROM public.search_books_advanced(p_titulo => 'historia', p_featured => true) s WHERE s.destacado IS DISTINCT FROM true) THEN
        RAISE EXCEPTION 'Featured filter ignored';
    END IF;
    IF EXISTS (
        SELECT s.id FROM public.search_books_advanced(p_titulo => 'historia universal', p_limit => 10) s
        INTERSECT SELECT s.id FROM public.search_books_advanced(p_titulo => 'historia universal', p_limit => 10, p_offset => 10) s
    ) THEN RAISE EXCEPTION 'Pages overlap'; END IF;

    SELECT l.* INTO sample FROM public.libros l
    WHERE l.activo AND l.isbn ~ '^[0-9]{10,13}$' AND l.stock > 0 LIMIT 1;
    SELECT count(*) INTO matches FROM public.search_books_advanced(
        p_isbn => substr(sample.isbn, 1, 3) || '- ' || substr(sample.isbn, 4), p_legacy_id => sample.legacy_id,
        p_limit => 1000) s WHERE s.id = sample.id;
    IF matches <> 1 THEN RAISE EXCEPTION 'ISBN with separators failed'; END IF;
    RAISE NOTICE 'Advanced-search checks passed; historia universal: % in-stock books', expected_count;
END;
$checks$;
SET LOCAL ROLE authenticated;
SELECT id, titulo, total_count FROM public.search_books_advanced(p_titulo => 'historia universal', p_stock_status => 'in_stock', p_limit => 3);
ROLLBACK;
