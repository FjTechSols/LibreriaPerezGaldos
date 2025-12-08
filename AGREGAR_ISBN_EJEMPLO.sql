/*
  # Agregar ISBNs de ejemplo a libros existentes

  Este script agrega ISBNs de ejemplo a los primeros libros de la base de datos
  para verificar que se muestran correctamente en el frontend.

  SOLO EJECUTAR SI LOS LIBROS NO TIENEN ISBN
*/

-- Verificar primero qué libros no tienen ISBN
SELECT
  id,
  titulo,
  autor,
  isbn
FROM libros
WHERE activo = true
  AND (isbn IS NULL OR isbn = '')
ORDER BY id ASC
LIMIT 10;

-- Agregar ISBNs de ejemplo a los primeros 10 libros sin ISBN
-- (SOLO EJECUTAR DESPUÉS DE VERIFICAR QUE REALMENTE NO TIENEN ISBN)

DO $$
DECLARE
  libro_record RECORD;
  isbn_ejemplo TEXT;
  contador INT := 0;
BEGIN
  FOR libro_record IN
    SELECT id, titulo
    FROM libros
    WHERE activo = true
      AND (isbn IS NULL OR isbn = '')
    ORDER BY id ASC
    LIMIT 10
  LOOP
    -- Generar un ISBN-13 de ejemplo (978 seguido de 10 dígitos)
    isbn_ejemplo := '978' || LPAD((libro_record.id::TEXT), 10, '0');

    -- Actualizar el libro con el ISBN de ejemplo
    UPDATE libros
    SET isbn = isbn_ejemplo,
        updated_at = now()
    WHERE id = libro_record.id;

    contador := contador + 1;

    RAISE NOTICE 'Libro % (%): ISBN asignado: %',
      libro_record.id,
      libro_record.titulo,
      isbn_ejemplo;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'Total de libros actualizados: %', contador;
  RAISE NOTICE '';
  RAISE NOTICE 'Ahora recarga la página del libro en el navegador para ver el ISBN.';
END $$;

-- Verificar que se actualizaron correctamente
SELECT
  id,
  titulo,
  autor,
  isbn,
  'ISBN actualizado' as estado
FROM libros
WHERE activo = true
  AND isbn IS NOT NULL
  AND isbn != ''
ORDER BY updated_at DESC
LIMIT 10;
