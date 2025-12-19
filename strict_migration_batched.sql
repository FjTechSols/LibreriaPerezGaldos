-- MIGRACIÓN ESTRICTA OPTIMIZADA (POR LOTES)
-- Este script está diseñado para evitar el "Statement Timeout" partiendo el trabajo en trozos pequeños.
-- INSTRUCCIONES:
-- 1. Ejecuta este script.
-- 2. Mira la pestaña "Results" o "Messages".
-- 3. Si ves que dice "Rows affected" > 0, VUELVE A EJECUTARLO (DALE AL RUN OTRA VEZ).
-- 4. Repite hasta que todas las sentencias digan "Rows affected: 0".
-- --- PARTE 1: MOVER LIBROS A SU SITIO (Lotes de 5000) ---
-- Mover a Hortaleza (Terminados en H)
WITH batch AS (
    SELECT id
    FROM libros
    WHERE legacy_id ~* '^\d+H$'
        AND ubicacion NOT ILIKE '%Hortaleza%'
    LIMIT 5000
)
UPDATE libros
SET ubicacion = 'Hortaleza'
WHERE id IN (
        SELECT id
        FROM batch
    );
-- Mover a Reina (Terminados en R)
WITH batch AS (
    SELECT id
    FROM libros
    WHERE legacy_id ~* '^\d+R$'
        AND ubicacion NOT ILIKE '%Reina%'
    LIMIT 5000
)
UPDATE libros
SET ubicacion = 'Reina'
WHERE id IN (
        SELECT id
        FROM batch
    );
-- Mover a Galeon (Terminados en G)
WITH batch AS (
    SELECT id
    FROM libros
    WHERE legacy_id ~* '^\d+G$'
        AND ubicacion NOT ILIKE '%Galeon%'
    LIMIT 5000
)
UPDATE libros
SET ubicacion = 'Galeon'
WHERE id IN (
        SELECT id
        FROM batch
    );
-- --- PARTE 2: EXPULSAR INTRUSOS A GENERAL (Lotes de 5000) ---
-- Limpiar Hortaleza
WITH batch AS (
    SELECT id
    FROM libros
    WHERE ubicacion ILIKE '%Hortaleza%'
        AND legacy_id !~* '^\d+H$'
    LIMIT 5000
)
UPDATE libros
SET ubicacion = 'General'
WHERE id IN (
        SELECT id
        FROM batch
    );
-- Limpiar Reina
WITH batch AS (
    SELECT id
    FROM libros
    WHERE ubicacion ILIKE '%Reina%'
        AND legacy_id !~* '^\d+R$'
    LIMIT 5000
)
UPDATE libros
SET ubicacion = 'General'
WHERE id IN (
        SELECT id
        FROM batch
    );
-- Limpiar Galeon
WITH batch AS (
    SELECT id
    FROM libros
    WHERE ubicacion ILIKE '%Galeon%'
        AND legacy_id !~* '^\d+G$'
    LIMIT 5000
)
UPDATE libros
SET ubicacion = 'General'
WHERE id IN (
        SELECT id
        FROM batch
    );
-- Limpiar Almacen
WITH batch AS (
    SELECT id
    FROM libros
    WHERE (
            ubicacion ILIKE '%Almacen%'
            OR ubicacion ILIKE '%Almacén%'
        )
        AND legacy_id !~* '^\d+$'
    LIMIT 5000
)
UPDATE libros
SET ubicacion = 'General'
WHERE id IN (
        SELECT id
        FROM batch
    );