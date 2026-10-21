-- Verificación de G: compara search_books antes y después en la misma transacción. TERMINA EN ROLLBACK.
-- Uso: BEGIN; <este bloque A> ; <migración G sin BEGIN/COMMIT> ; <bloque B> ; ROLLBACK;
SELECT set_config('statement_timeout', '0', true);
CREATE TEMP TABLE _casos (n int, termino text, lim int, off int, vis boolean, stock text, cat int, orden text) ON COMMIT DROP;
INSERT INTO _casos VALUES
 (1,'el beso',21,0,true,'all',NULL,'relevance'), (2,'beso',21,0,true,'all',NULL,'relevance'), (3,'la casa',21,0,true,'all',NULL,'relevance'),
 (4,'galdos',50,0,true,'all',NULL,'relevance'), (5,'Galdós',50,0,true,'all',NULL,'relevance'), (6,'perez galdos',50,0,true,'all',NULL,'relevance'),
 (7,'don quijote',50,0,true,'in_stock',NULL,'relevance'), (8,'don quijote',50,0,true,'out_of_stock',NULL,'relevance'),
 (9,'alianza',30,0,true,'all',NULL,'relevance'), (10,'9788420',30,0,true,'all',NULL,'relevance'), (11,'el beso',21,21,true,'all',NULL,'relevance'),
 (12,'el beso',21,0,NULL,'all',NULL,'relevance'), (13,'historia',30,0,true,'all',NULL,'newest'), (14,'historia',30,0,true,'all',NULL,'price_asc'),
 (15,'historia',30,0,true,'all',NULL,'price_desc'), (16,'historia',30,0,true,'all',NULL,'title'), (17,'novela',30,0,true,'all',(SELECT categoria_id FROM libros WHERE activo AND categoria_id IS NOT NULL GROUP BY 1 ORDER BY count(*) DESC LIMIT 1),'relevance'),
 (18,'',21,0,true,'in_stock',NULL,'relevance'), (19,'zzzqqxx',21,0,true,'all',NULL,'relevance'), (20,'Pérez-Galdós, Benito',30,0,true,'all',NULL,'relevance');
CREATE TEMP TABLE _res (fase text, n int, ids int[], claves text[], ms int) ON COMMIT DROP;
CREATE FUNCTION pg_temp.medir(p_fase text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE c record; t0 timestamptz; v_ids int[]; v_claves text[]; BEGIN
  FOR c IN SELECT * FROM _casos ORDER BY n LOOP
    t0 := clock_timestamp();
    SELECT array_agg(r.id ORDER BY o), array_agg(CASE c.orden WHEN 'price_asc' THEN r.precio::text WHEN 'price_desc' THEN r.precio::text WHEN 'title' THEN r.titulo ELSE r.id::text END ORDER BY o)
      INTO v_ids, v_claves
      FROM search_books(c.termino, c.lim, c.off, NULL, NULL, c.cat, NULL, c.stock, c.vis, c.orden) WITH ORDINALITY AS r(id, legacy_id, isbn, titulo, autor, editorial_id, categoria_id, anio, paginas, descripcion, precio, precio_original, stock, ubicacion, imagen_url, activo, destacado, novedad, oferta, descatalogado, estado, idioma, created_at, updated_at, editorial_nombre, categoria_nombre, o);
    INSERT INTO _res VALUES (p_fase, c.n, coalesce(v_ids, '{}'), coalesce(v_claves, '{}'), round(extract(epoch FROM clock_timestamp() - t0) * 1000));
  END LOOP;
END $$;
-- (El archivo completo de verificación se ejecuta con la migración en medio; ver q33.) ROLLBACK;
