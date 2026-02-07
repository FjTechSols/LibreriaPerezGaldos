-- 1. Listar todos los índices de la tabla 'libros' (y otras tablas públicas)
-- Esto mostrará el comando CREATE INDEX completo, revelando si usan funciones (como lower(), unaccent()),
-- tipos de índice (btree, gin, gist) y columnas específicas.

SELECT
    tablename,
    indexname,
    indexdef
FROM
    pg_indexes
WHERE
    schemaname = 'public'
    AND tablename = 'libros' -- Enfocado en libros, puedes quitar esta línea para ver todo
ORDER BY
    tablename,
    indexname;

-- 2. Verificar extensiones instaladas (pg_trgm, unaccent)
SELECT * FROM pg_extension;

-- 3. Verificar estado de índices (tamaño y uso)
SELECT
    relname as table_name,
    indexrelname as index_name,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    idx_scan as number_of_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM
    pg_stat_user_indexes
JOIN
    pg_statio_user_indexes ON pg_stat_user_indexes.indexrelid = pg_statio_user_indexes.indexrelid
WHERE
    pg_stat_user_indexes.schemaname = 'public'
    AND relname = 'libros'
ORDER BY
    pg_relation_size(indexrelid) DESC;
