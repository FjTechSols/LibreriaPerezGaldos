CREATE OR REPLACE FUNCTION public.search_books(search_term text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0, p_min_price numeric DEFAULT NULL::numeric, p_max_price numeric DEFAULT NULL::numeric, p_category_id integer DEFAULT NULL::integer, p_editorial_id integer DEFAULT NULL::integer, p_stock_status text DEFAULT NULL::text, p_is_visible boolean DEFAULT true, p_sort_by text DEFAULT 'relevance'::text)
 RETURNS TABLE(id integer, legacy_id text, isbn text, titulo text, autor text, editorial_id integer, categoria_id integer, anio integer, paginas integer, descripcion text, precio numeric, precio_original numeric, stock integer, ubicacion text, imagen_url text, activo boolean, destacado boolean, novedad boolean, oferta boolean, descatalogado boolean, estado text, idioma text, created_at timestamp with time zone, updated_at timestamp with time zone, editorial_nombre text, categoria_nombre text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    base_query text;
    where_clauses text[] := ARRAY['true']; 
    order_clause text;
    
    clean_search text;
    words text[];
    word text;
    word_conditions text[] := ARRAY[]::text[]; -- INICIALIZACIÓN IMPORTANTE
BEGIN
    clean_search := trim(search_term);

    -- 1. Construir Cláusulas WHERE Fijas (Usando array_append para seguridad)
    IF p_is_visible IS NOT NULL THEN
        where_clauses := array_append(where_clauses, format('l.activo = %L', p_is_visible));
    END IF;

    IF p_min_price IS NOT NULL THEN
        where_clauses := array_append(where_clauses, format('l.precio >= %L', p_min_price));
    END IF;

    IF p_max_price IS NOT NULL THEN
        where_clauses := array_append(where_clauses, format('l.precio <= %L', p_max_price));
    END IF;

    IF p_category_id IS NOT NULL THEN
        where_clauses := array_append(where_clauses, format('l.categoria_id = %L', p_category_id));
    END IF;

    IF p_editorial_id IS NOT NULL THEN
        where_clauses := array_append(where_clauses, format('l.editorial_id = %L', p_editorial_id));
    END IF;

    IF p_stock_status = 'in_stock' THEN
        where_clauses := array_append(where_clauses, 'l.stock > 0');
    ELSIF p_stock_status = 'out_of_stock' THEN
        where_clauses := array_append(where_clauses, 'l.stock <= 0');
    END IF;

    -- 2. Lógica de Búsqueda de Texto
    IF clean_search <> '' THEN
        words := regexp_split_to_array(trim(clean_search), E'[\\s,.:;()_/-]+');
        
        FOREACH word IN ARRAY words
        LOOP
            IF length(word) > 0 THEN
               word_conditions := array_append(word_conditions, format(
                   '(
                       l.legacy_id ILIKE %1$L OR
                       l.isbn ILIKE %1$L OR
                       public.f_unaccent(lower(l.titulo)) ILIKE %2$L OR
                       public.f_unaccent(lower(l.autor)) ILIKE %2$L
                   )',
                   '%' || word || '%', 
                   '%' || public.f_unaccent(lower(word)) || '%' 
               ));
            END IF;
        END LOOP;
        
        -- Añadir el bloque AND de todas las palabras
        IF array_length(word_conditions, 1) > 0 THEN
             where_clauses := array_append(where_clauses, array_to_string(word_conditions, ' AND '));
        END IF;
    END IF;

    -- 3. Construir ORDER BY
    IF clean_search <> '' THEN
         order_clause := format(
            'CASE 
                WHEN l.legacy_id ILIKE %L THEN 0 
                WHEN public.f_unaccent(lower(l.titulo)) LIKE %L THEN 1
                ELSE 2 
             END, ',
             clean_search,
             public.f_unaccent(lower(clean_search)) || '%'
         );
    ELSE
         order_clause := '';
    END IF;

    IF p_sort_by = 'price_asc' THEN order_clause := order_clause || 'l.precio ASC';
    ELSIF p_sort_by = 'price_desc' THEN order_clause := order_clause || 'l.precio DESC';
    ELSIF p_sort_by = 'newest' THEN order_clause := order_clause || 'l.created_at DESC NULLS LAST';
    ELSIF p_sort_by = 'title' THEN order_clause := order_clause || 'l.titulo ASC';
    ELSE order_clause := order_clause || 'l.id DESC'; 
    END IF;

    -- 4. Construir Query Final
    base_query := format(
        'SELECT 
            l.id::integer, 
            l.legacy_id::text,
            l.isbn::text,
            l.titulo::text,
            l.autor::text,
            l.editorial_id::integer,
            l.categoria_id::integer,
            l.anio::integer,
            l.paginas::integer,
            l.descripcion::text,
            l.precio::numeric, 
            l.precio_original::numeric,
            l.stock::integer, 
            l.ubicacion::text,
            l.imagen_url::text,
            l.activo::boolean,
            l.destacado::boolean,
            l.novedad::boolean,
            l.oferta::boolean,
            l.descatalogado::boolean,
            l.estado::text,
            l.idioma::text,
            l.created_at,
            l.updated_at,
            e.nombre::text as editorial_nombre,
            c.nombre::text as categoria_nombre
        FROM libros l
        LEFT JOIN editoriales e ON l.editorial_id = e.id
        LEFT JOIN categorias c ON l.categoria_id = c.id
        WHERE %s
        ORDER BY %s
        LIMIT %L OFFSET %L',
        array_to_string(where_clauses, ' AND '),
        order_clause,
        p_limit,
        p_offset
    );

    RETURN QUERY EXECUTE base_query;

END;
$function$
