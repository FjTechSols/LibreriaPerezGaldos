SELECT count(*) as featured_count
FROM libros
WHERE destacado = true;
SELECT id,
    titulo,
    autor,
    stock
FROM libros
WHERE destacado = true;