-- =====================================================================================
-- G · search_books más rápido (buscador de «Gestión de Libros» y catálogo de la web)
--
-- Problema: con palabras cortas y frecuentes («el beso», «la casa») search_books tardaba
-- 4-10 s. Las sesiones con usuario tienen statement_timeout = 8 s (anon, 3 s): la llamada
-- se cortaba y la web mostraba «0 libros encontrados» (libroService trata el error como vacío).
--
-- Causa: cada palabra se resolvía con 5 subconsultas UNION (código, ISBN, título, autor,
-- editorial) y luego «l.id IN (...)»; con «el» cada subconsulta devuelve cientos de miles de ids.
--
-- Cambio: mismo nombre, parámetros, columnas, coincidencias y orden. Solo cambia el plan,
-- igual que buscar_catalogo (E1): las editoriales que casan se resuelven antes como lista de
-- ids y cada palabra es un OR directo sobre libros, para que Postgres combine sus índices.
-- Además: comodines % y \ escritos por el usuario se tratan como texto (antes, «%» hacía
-- casar todo el catálogo) y search_path fijo (función SECURITY DEFINER).
-- La versión anterior completa está en maintenance/2026-10-21_G_search_books_anterior.sql.
-- =====================================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.search_books(search_term text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0, p_min_price numeric DEFAULT NULL::numeric, p_max_price numeric DEFAULT NULL::numeric, p_category_id integer DEFAULT NULL::integer, p_editorial_id integer DEFAULT NULL::integer, p_stock_status text DEFAULT NULL::text, p_is_visible boolean DEFAULT true, p_sort_by text DEFAULT 'relevance'::text)
 RETURNS TABLE(id integer, legacy_id text, isbn text, titulo text, autor text, editorial_id integer, categoria_id integer, anio integer, paginas integer, descripcion text, precio numeric, precio_original numeric, stock integer, ubicacion text, imagen_url text, activo boolean, destacado boolean, novedad boolean, oferta boolean, descatalogado boolean, estado text, idioma text, created_at timestamp with time zone, updated_at timestamp with time zone, editorial_nombre text, categoria_nombre text)
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    where_clauses text[] := ARRAY['true'];
    order_clause text;
    clean_search text := btrim(coalesce(search_term, ''));
    word text;
    raw_pat text;
    plain_pat text;
    publisher_ids integer[];
BEGIN
    -- 1. Filtros fijos (idénticos a la versión anterior)
    IF p_is_visible IS NOT NULL THEN where_clauses := array_append(where_clauses, format('l.activo = %L', p_is_visible)); END IF;
    IF p_min_price IS NOT NULL THEN where_clauses := array_append(where_clauses, format('l.precio >= %L', p_min_price)); END IF;
    IF p_max_price IS NOT NULL THEN where_clauses := array_append(where_clauses, format('l.precio <= %L', p_max_price)); END IF;
    IF p_category_id IS NOT NULL THEN where_clauses := array_append(where_clauses, format('l.categoria_id = %L', p_category_id)); END IF;
    IF p_editorial_id IS NOT NULL THEN where_clauses := array_append(where_clauses, format('l.editorial_id = %L', p_editorial_id)); END IF;
    IF p_stock_status = 'in_stock' THEN where_clauses := array_append(where_clauses, 'l.stock > 0');
    ELSIF p_stock_status = 'out_of_stock' THEN where_clauses := array_append(where_clauses, 'l.stock <= 0');
    END IF;

    -- 2. Texto: cada palabra debe aparecer en código, ISBN, título, autor o editorial
    IF clean_search <> '' THEN
        FOREACH word IN ARRAY regexp_split_to_array(clean_search, '[[:space:],.:;()/_-]+') LOOP
            CONTINUE WHEN word = '';
            raw_pat := '%' || replace(replace(word, chr(92), chr(92) || chr(92)), '%', chr(92) || '%') || '%';
            plain_pat := '%' || replace(replace(public.f_unaccent(lower(word)), chr(92), chr(92) || chr(92)), '%', chr(92) || '%') || '%';
            SELECT coalesce(array_agg(e.id), '{}'::integer[]) INTO publisher_ids
            FROM public.editoriales e WHERE public.f_unaccent(lower(e.nombre)) ILIKE plain_pat;
            where_clauses := array_append(where_clauses, format(
                '(l.legacy_id ILIKE %1$L OR l.isbn ILIKE %1$L OR public.f_unaccent(lower(l.titulo)) ILIKE %2$L
                  OR public.f_unaccent(lower(l.autor)) ILIKE %2$L OR l.editorial_id = ANY (%3$L::integer[]))',
                raw_pat, plain_pat, publisher_ids));
        END LOOP;
    END IF;

    -- 3. Orden (idéntico a la versión anterior)
    IF clean_search <> '' THEN
        order_clause := format('CASE WHEN l.legacy_id ILIKE %L THEN 0 WHEN public.f_unaccent(lower(l.titulo)) LIKE %L THEN 1 ELSE 2 END, ',
            clean_search, public.f_unaccent(lower(clean_search)) || '%');
    ELSE
        order_clause := '';
    END IF;
    IF p_sort_by = 'price_asc' THEN order_clause := order_clause || 'l.precio ASC';
    ELSIF p_sort_by = 'price_desc' THEN order_clause := order_clause || 'l.precio DESC';
    ELSIF p_sort_by = 'newest' THEN order_clause := order_clause || 'l.created_at DESC NULLS LAST';
    ELSIF p_sort_by = 'title' THEN order_clause := order_clause || 'l.titulo ASC';
    ELSE order_clause := order_clause || 'l.id DESC';
    END IF;

    RETURN QUERY EXECUTE format(
        'SELECT l.id::integer, l.legacy_id::text, l.isbn::text, l.titulo::text, l.autor::text, l.editorial_id::integer,
                l.categoria_id::integer, l.anio::integer, l.paginas::integer, l.descripcion::text, l.precio::numeric,
                l.precio_original::numeric, l.stock::integer, l.ubicacion::text, l.imagen_url::text, l.activo::boolean,
                l.destacado::boolean, l.novedad::boolean, l.oferta::boolean, l.descatalogado::boolean, l.estado::text,
                l.idioma::text, l.created_at, l.updated_at, e.nombre::text AS editorial_nombre, c.nombre::text AS categoria_nombre
         FROM public.libros l
         LEFT JOIN public.editoriales e ON l.editorial_id = e.id
         LEFT JOIN public.categorias c ON l.categoria_id = c.id
         WHERE %s
         ORDER BY %s
         LIMIT %L OFFSET %L',
        array_to_string(where_clauses, ' AND '), order_clause, p_limit, p_offset);
END;
$function$;

NOTIFY pgrst, 'reload schema';

COMMIT;
-- Marcha atrás: ejecutar maintenance/2026-10-21_G_search_books_anterior.sql
