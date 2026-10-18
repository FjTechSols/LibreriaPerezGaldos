-- Restore the advanced-search RPC used by the book manager.
-- Fields are combined with AND; text words match within their own field,
-- independently of case, accents, order, and repeated whitespace.
CREATE OR REPLACE FUNCTION public.search_books_advanced(
    p_titulo text DEFAULT NULL,
    p_autor text DEFAULT NULL,
    p_descripcion text DEFAULT NULL,
    p_isbn text DEFAULT NULL,
    p_publisher text DEFAULT NULL,
    p_category_id integer DEFAULT NULL,
    p_min_price numeric DEFAULT NULL,
    p_max_price numeric DEFAULT NULL,
    p_stock_status text DEFAULT 'all',
    p_min_pages integer DEFAULT NULL,
    p_max_pages integer DEFAULT NULL,
    p_start_year integer DEFAULT NULL,
    p_end_year integer DEFAULT NULL,
    p_language text DEFAULT NULL,
    p_condition text DEFAULT NULL,
    p_location text DEFAULT NULL,
    p_is_visible boolean DEFAULT true,
    p_sort_by text DEFAULT 'newest',
    p_limit integer DEFAULT 20,
    p_offset integer DEFAULT 0,
    p_legacy_id text DEFAULT NULL,
    p_featured boolean DEFAULT false,
    p_is_new boolean DEFAULT false,
    p_is_on_sale boolean DEFAULT false,
    p_is_out_of_print boolean DEFAULT false,
    p_cover_status text DEFAULT 'all'
)
RETURNS TABLE (
    id integer, legacy_id text, isbn text, titulo text, autor text,
    editorial_id integer, categoria_id integer, anio integer, paginas integer,
    descripcion text, precio numeric, precio_original numeric, stock integer,
    ubicacion text, imagen_url text, activo boolean, destacado boolean,
    novedad boolean, oferta boolean, descatalogado boolean, estado text, idioma text,
    created_at timestamptz, updated_at timestamptz,
    editorial_nombre text, categoria_nombre text, total_count bigint
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
    clauses text[] := ARRAY['true'];
    field record;
    word text;
    pattern text;
    ordering text;
BEGIN
    IF p_is_visible IS NOT NULL THEN clauses := array_append(clauses, format('l.activo = %L', p_is_visible)); END IF;
    FOR field IN SELECT * FROM jsonb_each_text(jsonb_build_object(
        'titulo', p_titulo, 'autor', p_autor, 'descripcion', p_descripcion
    )) LOOP
        FOR word IN SELECT regexp_split_to_table(trim(coalesce(field.value, '')), '[[:space:],.;:()/_-]+') LOOP
            IF word = '' THEN CONTINUE; END IF;
            pattern := '%' || replace(replace(replace(public.f_unaccent(lower(word)), chr(92), chr(92)||chr(92)), '%', chr(92)||'%'), '_', chr(92)||'_') || '%';
            clauses := array_append(clauses, format('public.f_unaccent(lower(l.%I)) ILIKE %L', field.key, pattern));
        END LOOP;
    END LOOP;
    FOR field IN SELECT * FROM jsonb_each_text(jsonb_build_object(
        'e.nombre', p_publisher, 'l.legacy_id', p_legacy_id, 'l.idioma', p_language, 'l.ubicacion', p_location
    )) LOOP
        IF nullif(trim(field.value), '') IS NOT NULL THEN
            pattern := '%' || replace(replace(replace(public.f_unaccent(lower(trim(field.value))), chr(92), chr(92)||chr(92)), '%', chr(92)||'%'), '_', chr(92)||'_') || '%';
            clauses := array_append(clauses, format('public.f_unaccent(lower(%s)) ILIKE %L', field.key, pattern));
        END IF;
    END LOOP;
    IF nullif(trim(p_isbn), '') IS NOT NULL THEN
        pattern := '%' || replace(replace(replace(regexp_replace(p_isbn, '[-[:space:]]', '', 'g'), chr(92), chr(92)||chr(92)), '%', chr(92)||'%'), '_', chr(92)||'_') || '%';
        clauses := array_append(clauses, format('regexp_replace(l.isbn, ''[-[:space:]]'', '''', ''g'') ILIKE %L', pattern));
    END IF;
    IF p_category_id IS NOT NULL THEN clauses := array_append(clauses, format('l.categoria_id = %L', p_category_id)); END IF;
    IF p_min_price IS NOT NULL THEN clauses := array_append(clauses, format('l.precio >= %L', p_min_price)); END IF;
    IF p_max_price IS NOT NULL THEN clauses := array_append(clauses, format('l.precio <= %L', p_max_price)); END IF;
    IF p_min_pages IS NOT NULL THEN clauses := array_append(clauses, format('l.paginas >= %L', p_min_pages)); END IF;
    IF p_max_pages IS NOT NULL THEN clauses := array_append(clauses, format('l.paginas <= %L', p_max_pages)); END IF;
    IF p_start_year IS NOT NULL THEN clauses := array_append(clauses, format('l.anio >= %L', p_start_year)); END IF;
    IF p_end_year IS NOT NULL THEN clauses := array_append(clauses, format('l.anio <= %L', p_end_year)); END IF;
    IF p_stock_status = 'in_stock' THEN clauses := array_append(clauses, 'l.stock > 0');
    ELSIF p_stock_status = 'out_of_stock' THEN clauses := array_append(clauses, 'l.stock <= 0'); END IF;
    IF nullif(trim(p_condition), '') IS NOT NULL THEN clauses := array_append(clauses, format('lower(l.estado) = lower(%L)', trim(p_condition))); END IF;
    IF p_featured THEN clauses := array_append(clauses, 'l.destacado = true'); END IF;
    IF p_is_new THEN clauses := array_append(clauses, 'l.novedad = true'); END IF;
    IF p_is_on_sale THEN clauses := array_append(clauses, 'l.oferta = true'); END IF;
    IF p_is_out_of_print THEN clauses := array_append(clauses, 'l.descatalogado = true'); END IF;
    IF p_cover_status = 'with_cover' THEN clauses := array_append(clauses, 'nullif(l.imagen_url, '''') IS NOT NULL');
    ELSIF p_cover_status = 'without_cover' THEN clauses := array_append(clauses, 'nullif(l.imagen_url, '''') IS NULL'); END IF;
    ordering := CASE p_sort_by
        WHEN 'price_asc' THEN 'l.precio ASC, l.id DESC'
        WHEN 'price_desc' THEN 'l.precio DESC, l.id DESC'
        WHEN 'title' THEN 'l.titulo ASC, l.id DESC'
        WHEN 'title_desc' THEN 'l.titulo DESC, l.id DESC'
        WHEN 'oldest' THEN 'l.created_at ASC NULLS LAST, l.id ASC'
        WHEN 'newest' THEN 'l.created_at DESC NULLS LAST, l.id DESC'
        WHEN 'updated_asc' THEN 'l.updated_at ASC NULLS LAST, l.id ASC'
        WHEN 'updated_desc' THEN 'l.updated_at DESC NULLS LAST, l.id DESC'
        WHEN 'id_asc' THEN 'l.id ASC'
        ELSE 'l.id DESC'
    END;
    RETURN QUERY EXECUTE format(
        'SELECT l.id::integer, l.legacy_id::text, l.isbn::text, l.titulo::text, l.autor::text,
            l.editorial_id::integer, l.categoria_id::integer, l.anio::integer, l.paginas::integer,
            l.descripcion::text, l.precio::numeric, l.precio_original::numeric, l.stock::integer,
            l.ubicacion::text, l.imagen_url::text, l.activo::boolean, l.destacado::boolean,
            l.novedad::boolean, l.oferta::boolean, l.descatalogado::boolean, l.estado::text,
            l.idioma::text, l.created_at, l.updated_at, e.nombre::text, c.nombre::text,
            count(*) OVER ()
        FROM public.libros l
        LEFT JOIN public.editoriales e ON e.id = l.editorial_id
        LEFT JOIN public.categorias c ON c.id = l.categoria_id
        WHERE %s ORDER BY %s LIMIT %L OFFSET %L',
        array_to_string(clauses, ' AND '), ordering, greatest(coalesce(p_limit, 20), 1), greatest(coalesce(p_offset, 0), 0)
    );
END;
$function$;

NOTIFY pgrst, 'reload schema';
