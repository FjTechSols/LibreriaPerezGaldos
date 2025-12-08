/*
  # Verificación de ISBNs en la base de datos

  Este script verifica el estado de los ISBNs en la tabla libros
*/

-- ==================================
-- Verificar ISBNs en libros activos
-- ==================================

-- 1. Contar libros con ISBN
SELECT
  COUNT(*) FILTER (WHERE isbn IS NOT NULL AND isbn != '') as libros_con_isbn,
  COUNT(*) FILTER (WHERE isbn IS NULL OR isbn = '') as libros_sin_isbn,
  COUNT(*) as total_libros
FROM libros
WHERE activo = true;

-- 2. Mostrar ejemplos de libros con ISBN
SELECT
  id,
  titulo,
  autor,
  isbn,
  CASE
    WHEN isbn IS NULL THEN 'NULL'
    WHEN isbn = '' THEN 'VACÍO'
    ELSE 'TIENE ISBN'
  END as estado_isbn
FROM libros
WHERE activo = true
ORDER BY id ASC
LIMIT 20;

-- 3. Verificar un libro específico (cambiar el ID si es necesario)
SELECT
  id,
  titulo,
  autor,
  isbn,
  CASE
    WHEN isbn IS NULL THEN 'El campo ISBN es NULL'
    WHEN isbn = '' THEN 'El campo ISBN está vacío (cadena vacía)'
    ELSE CONCAT('ISBN encontrado: ', isbn)
  END as diagnostico
FROM libros
WHERE activo = true
  AND id = (SELECT MIN(id) FROM libros WHERE activo = true)
LIMIT 1;

-- 4. Estadísticas de ISBNs
SELECT
  'Resumen de ISBNs' as reporte,
  COUNT(*) as total,
  COUNT(isbn) as con_isbn_no_null,
  COUNT(*) FILTER (WHERE isbn IS NOT NULL AND LENGTH(isbn) > 0) as con_isbn_valido,
  COUNT(*) FILTER (WHERE isbn IS NULL) as isbn_null,
  COUNT(*) FILTER (WHERE isbn = '') as isbn_vacio,
  ROUND(
    (COUNT(*) FILTER (WHERE isbn IS NOT NULL AND LENGTH(isbn) > 0)::DECIMAL / COUNT(*)) * 100,
    2
  ) as porcentaje_con_isbn
FROM libros
WHERE activo = true;
