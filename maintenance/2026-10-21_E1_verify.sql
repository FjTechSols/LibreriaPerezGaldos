-- Verificación de la migración E1 (catálogo móvil). SOLO LECTURA y termina en ROLLBACK.
-- Requiere que 2026-10-21_E1_catalogo_movil.sql ya esté aplicada (o ejecutarse concatenada tras ella
-- dentro de una transacción, como en el dry-run). Todas las pruebas corren con el rol anon.
-- Cada caso compara contra consultas directas a la tabla que replican el filtrado de la web
-- (libroService.obtenerLibros) o contra search_books (texto). Resultado esperado: todas las filas ok = true.
-- En el editor SQL de Supabase el resultado puede no mostrarse (lo último es el ROLLBACK); ejecutarlo vía CLI.
BEGIN;
CREATE TEMP TABLE _r (n serial, caso text, esperado text, obtenido text, ok boolean) ON COMMIT DROP;
GRANT ALL ON _r TO anon;
GRANT USAGE ON SEQUENCE _r_n_seq TO anon;
CREATE TEMP TABLE _ctx (k text PRIMARY KEY, v text) ON COMMIT DROP;
GRANT ALL ON _ctx TO anon;
INSERT INTO _ctx VALUES
  ('inactivo_legacy', (SELECT legacy_id FROM libros WHERE activo = false AND legacy_id IS NOT NULL ORDER BY id LIMIT 1)),
  ('inactivo_id', (SELECT id::text FROM libros WHERE activo = false AND legacy_id IS NOT NULL ORDER BY id LIMIT 1));

CREATE FUNCTION pg_temp.chk(p_caso text, p_esperado text, p_obtenido text) RETURNS void LANGUAGE sql AS $$
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES (p_caso, p_esperado, p_obtenido, p_esperado IS NOT DISTINCT FROM p_obtenido);
$$;
GRANT EXECUTE ON FUNCTION pg_temp.chk(text, text, text) TO anon;

-- Ids de una página como texto, para comparar páginas completas y su orden.
CREATE FUNCTION pg_temp.ids(p_ids integer[]) RETURNS text LANGUAGE sql AS $$ SELECT coalesce(array_to_string(p_ids, ','), '') $$;
GRANT EXECUTE ON FUNCTION pg_temp.ids(integer[]) TO anon;

SET LOCAL ROLE anon;

-- 1. Vista por defecto (la web: availability = inStock, id DESC en la app) ---------------------------
SELECT pg_temp.chk('defecto: total', (SELECT count(*) FROM libros WHERE activo AND stock > 0)::text, contar_catalogo()::text);
SELECT pg_temp.chk('defecto: página 1 (id DESC)',
  pg_temp.ids(ARRAY(SELECT id FROM libros WHERE activo AND stock > 0 ORDER BY id DESC LIMIT 24)),
  pg_temp.ids(ARRAY(SELECT id FROM buscar_catalogo())));
SELECT pg_temp.chk('defecto: página 2 (offset 24)',
  pg_temp.ids(ARRAY(SELECT id FROM libros WHERE activo AND stock > 0 ORDER BY id DESC LIMIT 24 OFFSET 24)),
  pg_temp.ids(ARRAY(SELECT id FROM buscar_catalogo(p_desplazamiento => 24))));
SELECT pg_temp.chk('sin solo-stock: total', (SELECT count(*) FROM libros WHERE activo)::text, contar_catalogo(p_solo_stock => false)::text);

-- 2. Accesos rápidos (flags de la tabla, no global_discounts) -----------------------------------------
SELECT pg_temp.chk('destacados (con stock)', (SELECT count(*) FROM libros WHERE activo AND stock > 0 AND destacado = true)::text, contar_catalogo(p_destacados => true)::text);
SELECT pg_temp.chk('destacados (todos)', (SELECT count(*) FROM libros WHERE activo AND destacado = true)::text, contar_catalogo(p_destacados => true, p_solo_stock => false)::text);
SELECT pg_temp.chk('ofertas (todos)', (SELECT count(*) FROM libros WHERE activo AND oferta = true)::text, contar_catalogo(p_ofertas => true, p_solo_stock => false)::text);
SELECT pg_temp.chk('novedades (con stock)', (SELECT count(*) FROM libros WHERE activo AND stock > 0 AND novedad = true)::text, contar_catalogo(p_novedades => true)::text);
SELECT pg_temp.chk('novedades: página 1',
  pg_temp.ids(ARRAY(SELECT id FROM libros WHERE activo AND stock > 0 AND novedad = true ORDER BY id DESC LIMIT 24)),
  pg_temp.ids(ARRAY(SELECT id FROM buscar_catalogo(p_novedades => true))));
SELECT pg_temp.chk('descatalogados (todos)', (SELECT count(*) FROM libros WHERE activo AND descatalogado = true)::text, contar_catalogo(p_descatalogados => true, p_solo_stock => false)::text);
SELECT pg_temp.chk('descatalogados (con stock)', (SELECT count(*) FROM libros WHERE activo AND stock > 0 AND descatalogado = true)::text, contar_catalogo(p_descatalogados => true)::text);

-- 3. Idioma (ILIKE %valor%), estado (ilike exacto), precio, categoría, editorial -----------------------
SELECT pg_temp.chk('idioma Inglés', (SELECT count(*) FROM libros WHERE activo AND stock > 0 AND idioma ILIKE '%Inglés%')::text, contar_catalogo(p_idioma => 'Inglés')::text);
SELECT pg_temp.chk('idioma Francés: página 1',
  pg_temp.ids(ARRAY(SELECT id FROM libros WHERE activo AND stock > 0 AND idioma ILIKE '%Francés%' ORDER BY id DESC LIMIT 24)),
  pg_temp.ids(ARRAY(SELECT id FROM buscar_catalogo(p_idioma => 'Francés'))));
SELECT pg_temp.chk('estado nuevo', (SELECT count(*) FROM libros WHERE activo AND stock > 0 AND estado ILIKE 'nuevo')::text, contar_catalogo(p_estado => 'nuevo')::text);
SELECT pg_temp.chk('estado usado = leido + buen_estado', (SELECT count(*) FROM libros WHERE activo AND stock > 0 AND lower(estado) IN ('leido','buen_estado'))::text, contar_catalogo(p_estado => 'usado')::text);
SELECT pg_temp.chk('precio 5-20', (SELECT count(*) FROM libros WHERE activo AND stock > 0 AND precio >= 5 AND precio <= 20)::text, contar_catalogo(p_precio_min => 5, p_precio_max => 20)::text);
SELECT pg_temp.chk('precio solo mínimo 100', (SELECT count(*) FROM libros WHERE activo AND stock > 0 AND precio >= 100)::text, contar_catalogo(p_precio_min => 100)::text);
SELECT pg_temp.chk('precio solo máximo 3', (SELECT count(*) FROM libros WHERE activo AND stock > 0 AND precio <= 3)::text, contar_catalogo(p_precio_max => 3)::text);
SELECT pg_temp.chk('categoría 5: página 1',
  pg_temp.ids(ARRAY(SELECT id FROM libros WHERE activo AND stock > 0 AND categoria_id = 5 ORDER BY id DESC LIMIT 24)),
  pg_temp.ids(ARRAY(SELECT id FROM buscar_catalogo(p_categoria_id => 5))));
SELECT pg_temp.chk('editorial más grande',
  (SELECT count(*) FROM libros WHERE activo AND stock > 0 AND editorial_id = (SELECT editorial_id FROM libros WHERE activo AND editorial_id IS NOT NULL GROUP BY 1 ORDER BY count(*) DESC LIMIT 1))::text,
  contar_catalogo(p_editorial_id => (SELECT editorial_id FROM libros WHERE activo AND editorial_id IS NOT NULL GROUP BY 1 ORDER BY count(*) DESC LIMIT 1))::text);
SELECT pg_temp.chk('combinado: usado + Inglés + cat 5 + precio ≤ 30 + sin solo-stock',
  (SELECT count(*) FROM libros WHERE activo AND lower(estado) IN ('leido','buen_estado') AND idioma ILIKE '%Inglés%' AND categoria_id = 5 AND precio <= 30)::text,
  contar_catalogo(p_estado => 'usado', p_idioma => 'Inglés', p_categoria_id => 5, p_precio_max => 30, p_solo_stock => false)::text);
SELECT pg_temp.chk('buen_estado cuenta como usado y no como nuevo', (SELECT count(*) FROM libros WHERE activo AND estado = 'buen_estado')::text, (contar_catalogo(p_estado => 'usado', p_solo_stock => false) - (SELECT count(*) FROM libros WHERE activo AND estado = 'leido'))::text);
SELECT pg_temp.chk('nuevo sigue siendo solo nuevo', (SELECT count(*) FROM libros WHERE activo AND estado = 'nuevo')::text, contar_catalogo(p_estado => 'nuevo', p_solo_stock => false)::text);
SELECT pg_temp.chk('combinado: novedades + nuevo',
  (SELECT count(*) FROM libros WHERE activo AND stock > 0 AND novedad = true AND estado ILIKE 'nuevo')::text,
  contar_catalogo(p_novedades => true, p_estado => 'nuevo')::text);

-- 4. Orden (la web: título, precio, más recientes + dirección; "por defecto" = id) ---------------------
SELECT pg_temp.chk('orden titulo_asc',
  pg_temp.ids(ARRAY(SELECT id FROM libros WHERE activo AND stock > 0 ORDER BY titulo ASC, id DESC LIMIT 24)),
  pg_temp.ids(ARRAY(SELECT id FROM buscar_catalogo(p_orden => 'titulo_asc'))));
SELECT pg_temp.chk('orden titulo_desc',
  pg_temp.ids(ARRAY(SELECT id FROM libros WHERE activo AND stock > 0 ORDER BY titulo DESC, id DESC LIMIT 24)),
  pg_temp.ids(ARRAY(SELECT id FROM buscar_catalogo(p_orden => 'titulo_desc'))));
SELECT pg_temp.chk('orden precio_asc',
  pg_temp.ids(ARRAY(SELECT id FROM libros WHERE activo AND stock > 0 ORDER BY precio ASC NULLS LAST, id DESC LIMIT 24)),
  pg_temp.ids(ARRAY(SELECT id FROM buscar_catalogo(p_orden => 'precio_asc'))));
SELECT pg_temp.chk('orden precio_desc (sin precios nulos delante)',
  pg_temp.ids(ARRAY(SELECT id FROM libros WHERE activo AND stock > 0 ORDER BY precio DESC NULLS LAST, id DESC LIMIT 24)),
  pg_temp.ids(ARRAY(SELECT id FROM buscar_catalogo(p_orden => 'precio_desc'))));
SELECT pg_temp.chk('orden recientes_desc',
  pg_temp.ids(ARRAY(SELECT id FROM libros WHERE activo AND stock > 0 ORDER BY created_at DESC, id DESC LIMIT 24)),
  pg_temp.ids(ARRAY(SELECT id FROM buscar_catalogo(p_orden => 'recientes_desc'))));
SELECT pg_temp.chk('orden recientes_asc',
  pg_temp.ids(ARRAY(SELECT id FROM libros WHERE activo AND stock > 0 ORDER BY created_at ASC, id ASC LIMIT 24)),
  pg_temp.ids(ARRAY(SELECT id FROM buscar_catalogo(p_orden => 'recientes_asc'))));
SELECT pg_temp.chk('orden desconocido = relevancia (id DESC)',
  pg_temp.ids(ARRAY(SELECT id FROM buscar_catalogo())),
  pg_temp.ids(ARRAY(SELECT id FROM buscar_catalogo(p_orden => 'x; DROP TABLE libros;--'))));

-- 5. Texto: mismas coincidencias y mismo orden de relevancia que search_books ---------------------------
SELECT pg_temp.chk('texto "galdos": página 1 = search_books',
  pg_temp.ids(ARRAY(SELECT id FROM search_books('galdos', 24, 0, NULL, NULL, NULL, NULL, 'in_stock', true, 'relevance'))),
  pg_temp.ids(ARRAY(SELECT id FROM buscar_catalogo(p_texto => 'galdos'))));
SELECT pg_temp.chk('texto "galdos": total = search_books',
  (SELECT count(*) FROM search_books('galdos', 100000, 0, NULL, NULL, NULL, NULL, 'in_stock', true, 'relevance'))::text,
  contar_catalogo(p_texto => 'galdos')::text);
SELECT pg_temp.chk('texto "perez galdos": página 1 = search_books',
  pg_temp.ids(ARRAY(SELECT id FROM search_books('perez galdos', 24, 0, NULL, NULL, NULL, NULL, 'in_stock', true, 'relevance'))),
  pg_temp.ids(ARRAY(SELECT id FROM buscar_catalogo(p_texto => 'perez galdos'))));
SELECT pg_temp.chk('texto "Don Quijote" (mayúsculas): total = search_books',
  (SELECT count(*) FROM search_books('Don Quijote', 100000, 0, NULL, NULL, NULL, NULL, 'in_stock', true, 'relevance'))::text,
  contar_catalogo(p_texto => 'Don Quijote')::text);
SELECT pg_temp.chk('texto "cervantes quijote": página 1 = search_books',
  pg_temp.ids(ARRAY(SELECT id FROM search_books('cervantes quijote', 24, 0, NULL, NULL, NULL, NULL, 'in_stock', true, 'relevance'))),
  pg_temp.ids(ARRAY(SELECT id FROM buscar_catalogo(p_texto => 'cervantes quijote'))));
SELECT pg_temp.chk('texto con acento "garcía márquez": total = search_books',
  (SELECT count(*) FROM search_books('garcía márquez', 100000, 0, NULL, NULL, NULL, NULL, 'in_stock', true, 'relevance'))::text,
  contar_catalogo(p_texto => 'garcía márquez')::text);
SELECT pg_temp.chk('texto = nombre de editorial "anaya": total = search_books',
  (SELECT count(*) FROM search_books('anaya', 100000, 0, NULL, NULL, NULL, NULL, 'in_stock', true, 'relevance'))::text,
  contar_catalogo(p_texto => 'anaya')::text);
SELECT pg_temp.chk('texto numérico (ISBN parcial) "9788420": página 1 = search_books',
  pg_temp.ids(ARRAY(SELECT id FROM search_books('9788420', 24, 0, NULL, NULL, NULL, NULL, 'in_stock', true, 'relevance'))),
  pg_temp.ids(ARRAY(SELECT id FROM buscar_catalogo(p_texto => '9788420'))));
SELECT pg_temp.chk('texto + precio: total = search_books',
  (SELECT count(*) FROM search_books('galdos', 100000, 0, 1, 50, NULL, NULL, 'in_stock', true, 'relevance'))::text,
  contar_catalogo(p_texto => 'galdos', p_precio_min => 1, p_precio_max => 50)::text);
SELECT pg_temp.chk('texto sin resultados', '0', contar_catalogo(p_texto => 'zzzqqxx')::text);
SELECT pg_temp.chk('texto + usado: subconjunto de texto',
  (SELECT count(*) FROM search_books('galdos', 100000, 0, NULL, NULL, NULL, NULL, 'in_stock', true, 'relevance') s WHERE lower(s.estado) IN ('leido','buen_estado'))::text,
  contar_catalogo(p_texto => 'galdos', p_estado => 'usado')::text);

-- 6. Seguridad y validación -------------------------------------------------------------------------------
CREATE FUNCTION pg_temp.prueba(p_campo text, p_valor text) RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  IF p_campo = 'texto' THEN PERFORM * FROM buscar_catalogo(p_texto => p_valor);
  ELSIF p_campo = 'idioma' THEN PERFORM * FROM buscar_catalogo(p_idioma => p_valor);
  ELSIF p_campo = 'estado' THEN PERFORM * FROM buscar_catalogo(p_estado => p_valor);
  END IF;
  RETURN 'sin error';
EXCEPTION WHEN OTHERS THEN RETURN SQLSTATE;
END $$;
GRANT EXECUTE ON FUNCTION pg_temp.prueba(text, text) TO anon;
SELECT pg_temp.chk('anon: libro inactivo no aparece por su código',
  '0', (SELECT count(*) FROM buscar_catalogo(p_texto => (SELECT v FROM _ctx WHERE k = 'inactivo_legacy'), p_solo_stock => false) WHERE id = (SELECT v::integer FROM _ctx WHERE k = 'inactivo_id'))::text);
SELECT pg_temp.chk('sin solo-stock el total son exactamente los activos',
  (SELECT count(*) FROM libros WHERE activo)::text, contar_catalogo(p_solo_stock => false)::text);
SELECT pg_temp.chk('estado inválido lanza error 22023', '22023', pg_temp.prueba('estado', 'roto'));
SELECT pg_temp.chk('inyección en texto: sin error', 'sin error', pg_temp.prueba('texto', chr(39) || '; DROP TABLE libros; --'));
SELECT pg_temp.chk('inyección en idioma: sin error', 'sin error', pg_temp.prueba('idioma', chr(39) || '; DROP TABLE libros; --'));
SELECT pg_temp.chk('inyección en texto no devuelve todo', '0', contar_catalogo(p_texto => chr(39) || ' OR 1=1 --')::text);
SELECT pg_temp.chk('comodín % en texto es literal (0 resultados)', '0', contar_catalogo(p_texto => '%%%')::text);
SELECT pg_temp.chk('límite acotado a 100', '100', (SELECT count(*) FROM buscar_catalogo(p_limite => 100000))::text);
SELECT pg_temp.chk('límite mínimo 1', '1', (SELECT count(*) FROM buscar_catalogo(p_limite => 0))::text);
SELECT pg_temp.chk('desplazamiento negativo = 0',
  pg_temp.ids(ARRAY(SELECT id FROM buscar_catalogo())), pg_temp.ids(ARRAY(SELECT id FROM buscar_catalogo(p_desplazamiento => -5))));
SELECT pg_temp.chk('anon puede ejecutar buscar_catalogo', 'true', has_function_privilege('anon', 'public.buscar_catalogo(text,integer,integer,text,numeric,numeric,text,boolean,boolean,boolean,boolean,boolean,text,integer,integer)', 'EXECUTE')::text);
SELECT pg_temp.chk('anon NO puede ejecutar el helper interno', 'false', has_function_privilege('anon', 'public.catalogo_filtros_sql(text,integer,integer,text,numeric,numeric,text,boolean,boolean,boolean,boolean,boolean)', 'EXECUTE')::text);
SELECT pg_temp.chk('authenticated NO puede ejecutar el helper interno', 'false', has_function_privilege('authenticated', 'public.catalogo_filtros_sql(text,integer,integer,text,numeric,numeric,text,boolean,boolean,boolean,boolean,boolean)', 'EXECUTE')::text);

-- 7. Editoriales e idiomas --------------------------------------------------------------------------------
SELECT pg_temp.chk('editoriales: todas tienen libros visibles', '0',
  (SELECT count(*) FROM catalogo_editoriales('a', 100) c WHERE NOT EXISTS (SELECT 1 FROM libros l WHERE l.editorial_id = c.id AND l.activo))::text);
SELECT pg_temp.chk('editoriales: sin acentos ni mayúsculas (PLANETÁ = planeta)',
  pg_temp.ids(ARRAY(SELECT id FROM catalogo_editoriales('planeta', 50))), pg_temp.ids(ARRAY(SELECT id FROM catalogo_editoriales('PLANETÁ', 50))));
SELECT pg_temp.chk('editoriales: "planeta" devuelve algo', 'true', (SELECT count(*) > 0 FROM catalogo_editoriales('planeta', 50))::text);
SELECT pg_temp.chk('editoriales: respeta el límite', '5', (SELECT count(*) FROM catalogo_editoriales(NULL, 5))::text);
SELECT pg_temp.chk('idiomas: incluye Español', 'true', (SELECT count(*) > 0 FROM catalogo_idiomas() WHERE idioma = 'Español')::text);
SELECT pg_temp.chk('idiomas: sin valores basura (más de 30 caracteres)', '0', (SELECT count(*) FROM catalogo_idiomas() WHERE length(idioma) > 30)::text);
SELECT pg_temp.chk('idiomas: total Español = libros activos con ese idioma',
  (SELECT count(*) FROM libros WHERE activo AND idioma = 'Español')::text, (SELECT total FROM catalogo_idiomas() WHERE idioma = 'Español')::text);

RESET ROLE;
SELECT n, ok, caso, esperado, obtenido FROM _r ORDER BY n;

-- Obligatorio: aunque no se haya escrito nada, el script siempre termina deshaciendo la transacción.
ROLLBACK;
