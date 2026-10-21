-- =====================================================================================
-- Migración E1 (aditiva, SOLO LECTURA): catálogo con filtros para la app móvil
-- Proyecto weaihscsaqxadxjgsfbt · 2026-10-21
--
-- Por qué hace falta: search_books (SECURITY DEFINER) no soporta idioma, estado físico,
-- destacados, ofertas, novedades ni descatalogados, y no devuelve total. Estos filtros
-- replican EXACTAMENTE lo que hace la web en libroService.obtenerLibros (ruta sin texto):
--   Destacados      -> libros.destacado = true
--   Ofertas         -> libros.oferta = true   (flag del libro; NO usa global_discounts)
--   Novedades       -> libros.novedad = true
--   Descatalogados  -> descatalogado = true (la web solo filtra al marcarlo; desmarcado = todos)
--   Idioma          -> idioma ILIKE '%valor%'
--   Estado Nuevo    -> lower(estado) = 'nuevo'
--   Estado Usado    -> lower(estado) IN ('leido','buen_estado')   (decisión del usuario; la web solo usa 'leido')
--   Precio          -> precio >= min / precio <= max
--   Solo con stock  -> stock > 0 (valor por defecto de la web)
--   Categoría/Editorial -> igualdad por id
--   Texto           -> mismas reglas que search_books: cada palabra debe aparecer en
--                      legacy_id, isbn, título, autor o editorial (sin acentos/mayúsculas)
-- A diferencia de la web (que con texto ignora idioma/estado/destacados/etc.), aquí TODOS
-- los filtros se combinan siempre con AND, también con texto.
--
-- Seguridad: las funciones públicas son SECURITY DEFINER (search_path fijo) por rendimiento:
-- con RLS activa, Postgres no puede usar los índices trigram sobre f_unaccent(...) (la función
-- no es leakproof) y la búsqueda de texto pasa de ~0,1 s a ~3-5 s con 417.000 libros (medido).
-- search_books ya es DEFINER por la misma razón. La exposición es la misma que hoy: el SQL
-- fija activo = true (nunca devuelve libros inactivos, ni siquiera a personal), solo devuelve
-- columnas públicas de catálogo, las entradas de texto solo entran como literales (%L),
-- el orden pasa por lista blanca y los límites están acotados (1..100).
-- El helper catalogo_filtros_sql es interno (solo lee editoriales, tabla pública) y NO se concede a anon/authenticated.
--

-- Crea:
--   1. catalogo_filtros_sql(...)   helper interno que construye el WHERE (una sola fuente)
--   2. buscar_catalogo(...)        página de resultados (sin total, rápida)
--   3. contar_catalogo(...)        total para los mismos filtros (una vez por cambio de filtros)
--   4. catalogo_editoriales(...)   buscador de editoriales con libros visibles
--   5. catalogo_idiomas()          idiomas con libros visibles (para el panel)
-- Las categorías se leen directamente de la tabla categorias (87 filas, activa = true).
--
-- Deshacer: bloque "ROLLBACK" al final.
-- =====================================================================================

BEGIN;

-- 1. Helper: WHERE común --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.catalogo_filtros_sql(
    p_texto text, p_categoria_id integer, p_editorial_id integer, p_idioma text,
    p_precio_min numeric, p_precio_max numeric, p_estado text, p_solo_stock boolean,
    p_destacados boolean, p_ofertas boolean, p_novedades boolean, p_descatalogados boolean
) RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
    c text[] := ARRAY['l.activo = true'];
    texto text := btrim(coalesce(p_texto, ''));
    palabra text;
    raw_pat text;
    sin_acentos_pat text;
    editoriales_ids integer[];
    estado text := lower(btrim(coalesce(p_estado, '')));
BEGIN
    IF texto <> '' THEN
        FOREACH palabra IN ARRAY regexp_split_to_array(texto, '[[:space:],.:;()/_-]+') LOOP
            IF palabra = '' THEN CONTINUE; END IF;
            raw_pat := '%' || replace(replace(replace(palabra, chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%';
            sin_acentos_pat := '%' || replace(replace(replace(public.f_unaccent(lower(palabra)), chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%';
            -- Editoriales que casan con la palabra: se resuelven aparte y entran como lista de ids,
            -- así Postgres puede combinar los índices trigram de libros con un OR. (La versión con
            -- subconsultas UNION de search_books tarda ~4,6 s con palabras comunes como "de".)
            SELECT coalesce(array_agg(e.id), '{}'::integer[]) INTO editoriales_ids
            FROM public.editoriales e WHERE public.f_unaccent(lower(e.nombre)) ILIKE sin_acentos_pat;
            c := array_append(c, format(
                '(l.legacy_id ILIKE %1$L OR l.isbn ILIKE %1$L OR public.f_unaccent(lower(l.titulo)) ILIKE %2$L
                  OR public.f_unaccent(lower(l.autor)) ILIKE %2$L OR l.editorial_id = ANY (%3$L::integer[]))',
                raw_pat, sin_acentos_pat, editoriales_ids));
        END LOOP;
    END IF;

    IF p_categoria_id IS NOT NULL THEN c := array_append(c, format('l.categoria_id = %L', p_categoria_id)); END IF;
    IF p_editorial_id IS NOT NULL THEN c := array_append(c, format('l.editorial_id = %L', p_editorial_id)); END IF;
    IF nullif(btrim(coalesce(p_idioma, '')), '') IS NOT NULL THEN
        c := array_append(c, format('l.idioma ILIKE %L',
            '%' || replace(replace(replace(btrim(p_idioma), chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%'));
    END IF;
    IF p_precio_min IS NOT NULL AND p_precio_min > 0 THEN c := array_append(c, format('l.precio >= %L', p_precio_min)); END IF;
    IF p_precio_max IS NOT NULL THEN c := array_append(c, format('l.precio <= %L', p_precio_max)); END IF;
    IF estado = 'nuevo' THEN c := array_append(c, 'lower(l.estado) = ''nuevo''');
    ELSIF estado = 'usado' THEN c := array_append(c, 'lower(l.estado) IN (''leido'', ''buen_estado'')');
    ELSIF estado <> '' THEN RAISE EXCEPTION 'Estado no válido: %', p_estado USING ERRCODE = '22023';
    END IF;
    IF coalesce(p_solo_stock, false) THEN c := array_append(c, 'l.stock > 0'); END IF;
    IF coalesce(p_destacados, false) THEN c := array_append(c, 'l.destacado = true'); END IF;
    IF coalesce(p_ofertas, false) THEN c := array_append(c, 'l.oferta = true'); END IF;
    IF coalesce(p_novedades, false) THEN c := array_append(c, 'l.novedad = true'); END IF;
    IF coalesce(p_descatalogados, false) THEN c := array_append(c, 'l.descatalogado = true'); END IF;
    RETURN array_to_string(c, ' AND ');
END;
$function$;

-- 2. Página de resultados -------------------------------------------------------------
-- p_orden: relevancia (defecto) | recientes_desc | recientes_asc | titulo_asc | titulo_desc
--          | precio_asc | precio_desc. Cualquier otro valor se trata como relevancia.
-- relevancia: sin texto = más nuevos primero (id DESC); con texto = código exacto, título
-- que empieza por el texto, resto (igual que search_books), y después id DESC.
CREATE OR REPLACE FUNCTION public.buscar_catalogo(
    p_texto text DEFAULT NULL,
    p_categoria_id integer DEFAULT NULL,
    p_editorial_id integer DEFAULT NULL,
    p_idioma text DEFAULT NULL,
    p_precio_min numeric DEFAULT NULL,
    p_precio_max numeric DEFAULT NULL,
    p_estado text DEFAULT NULL,
    p_solo_stock boolean DEFAULT true,
    p_destacados boolean DEFAULT false,
    p_ofertas boolean DEFAULT false,
    p_novedades boolean DEFAULT false,
    p_descatalogados boolean DEFAULT false,
    p_orden text DEFAULT 'relevancia',
    p_limite integer DEFAULT 24,
    p_desplazamiento integer DEFAULT 0
) RETURNS TABLE (
    id integer, titulo text, autor text, precio numeric, precio_original numeric, stock integer,
    imagen_url text, destacado boolean, novedad boolean, oferta boolean, descatalogado boolean,
    estado text, idioma text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    texto text := btrim(coalesce(p_texto, ''));
    orden text;
BEGIN
    orden := CASE lower(coalesce(p_orden, 'relevancia'))
        WHEN 'recientes_desc' THEN 'l.created_at DESC, l.id DESC'
        WHEN 'recientes_asc'  THEN 'l.created_at ASC, l.id ASC'
        WHEN 'titulo_asc'     THEN 'l.titulo ASC, l.id DESC'
        WHEN 'titulo_desc'    THEN 'l.titulo DESC, l.id DESC'
        WHEN 'precio_asc'     THEN 'l.precio ASC NULLS LAST, l.id DESC'
        WHEN 'precio_desc'    THEN 'l.precio DESC NULLS LAST, l.id DESC'
        ELSE NULL
    END;
    IF orden IS NULL THEN
        IF texto <> '' THEN
            orden := format(
                'CASE WHEN l.legacy_id ILIKE %L THEN 0 WHEN public.f_unaccent(lower(l.titulo)) LIKE %L THEN 1 ELSE 2 END, l.id DESC',
                replace(replace(replace(texto, chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_'),
                replace(replace(replace(public.f_unaccent(lower(texto)), chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%');
        ELSE
            orden := 'l.id DESC';
        END IF;
    END IF;

    RETURN QUERY EXECUTE format(
        'SELECT l.id::integer, l.titulo::text, l.autor::text, l.precio::numeric, l.precio_original::numeric,
                l.stock::integer, l.imagen_url::text, l.destacado::boolean, l.novedad::boolean,
                l.oferta::boolean, l.descatalogado::boolean, l.estado::text, l.idioma::text
         FROM public.libros l WHERE %s ORDER BY %s LIMIT %s OFFSET %s',
        public.catalogo_filtros_sql(p_texto, p_categoria_id, p_editorial_id, p_idioma, p_precio_min, p_precio_max,
            p_estado, p_solo_stock, p_destacados, p_ofertas, p_novedades, p_descatalogados),
        orden,
        least(greatest(coalesce(p_limite, 24), 1), 100),
        greatest(coalesce(p_desplazamiento, 0), 0));
END;
$function$;

-- 3. Total ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.contar_catalogo(
    p_texto text DEFAULT NULL,
    p_categoria_id integer DEFAULT NULL,
    p_editorial_id integer DEFAULT NULL,
    p_idioma text DEFAULT NULL,
    p_precio_min numeric DEFAULT NULL,
    p_precio_max numeric DEFAULT NULL,
    p_estado text DEFAULT NULL,
    p_solo_stock boolean DEFAULT true,
    p_destacados boolean DEFAULT false,
    p_ofertas boolean DEFAULT false,
    p_novedades boolean DEFAULT false,
    p_descatalogados boolean DEFAULT false
) RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE total bigint;
BEGIN
    EXECUTE 'SELECT count(*) FROM public.libros l WHERE ' || public.catalogo_filtros_sql(
        p_texto, p_categoria_id, p_editorial_id, p_idioma, p_precio_min, p_precio_max,
        p_estado, p_solo_stock, p_destacados, p_ofertas, p_novedades, p_descatalogados)
    INTO total;
    RETURN total;
END;
$function$;

-- 4. Editoriales con libros visibles (acentos y mayúsculas indiferentes) ---------------
CREATE OR REPLACE FUNCTION public.catalogo_editoriales(p_texto text DEFAULT NULL, p_limite integer DEFAULT 30)
RETURNS TABLE (id integer, nombre text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
    SELECT e.id::integer, e.nombre::text
    FROM public.editoriales e
    WHERE (nullif(btrim(coalesce(p_texto, '')), '') IS NULL
           OR public.f_unaccent(lower(e.nombre)) ILIKE '%' || replace(replace(replace(public.f_unaccent(lower(btrim(p_texto))), chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%')
      AND EXISTS (SELECT 1 FROM public.libros l WHERE l.editorial_id = e.id AND l.activo = true)
    ORDER BY e.nombre
    LIMIT least(greatest(coalesce(p_limite, 30), 1), 100);
$function$;

-- 5. Idiomas con libros visibles ------------------------------------------------------
-- Se descartan valores basura (más de 30 caracteres, por ejemplo una URL pegada en el campo).
CREATE OR REPLACE FUNCTION public.catalogo_idiomas()
RETURNS TABLE (idioma text, total bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
    SELECT l.idioma::text, count(*)
    FROM public.libros l
    WHERE l.activo = true AND l.idioma IS NOT NULL AND btrim(l.idioma) <> '' AND length(l.idioma) <= 30
    GROUP BY l.idioma
    ORDER BY count(*) DESC, l.idioma;
$function$;

REVOKE ALL ON FUNCTION public.catalogo_filtros_sql(text, integer, integer, text, numeric, numeric, text, boolean, boolean, boolean, boolean, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.buscar_catalogo(text, integer, integer, text, numeric, numeric, text, boolean, boolean, boolean, boolean, boolean, text, integer, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.contar_catalogo(text, integer, integer, text, numeric, numeric, text, boolean, boolean, boolean, boolean, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.catalogo_editoriales(text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.catalogo_idiomas() TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- =====================================================================================
-- ROLLBACK (manual)
-- =====================================================================================
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.catalogo_idiomas();
-- DROP FUNCTION IF EXISTS public.catalogo_editoriales(text, integer);
-- DROP FUNCTION IF EXISTS public.contar_catalogo(text, integer, integer, text, numeric, numeric, text, boolean, boolean, boolean, boolean, boolean);
-- DROP FUNCTION IF EXISTS public.buscar_catalogo(text, integer, integer, text, numeric, numeric, text, boolean, boolean, boolean, boolean, boolean, text, integer, integer);
-- DROP FUNCTION IF EXISTS public.catalogo_filtros_sql(text, integer, integer, text, numeric, numeric, text, boolean, boolean, boolean, boolean, boolean);
-- NOTIFY pgrst, 'reload schema';
-- COMMIT;
