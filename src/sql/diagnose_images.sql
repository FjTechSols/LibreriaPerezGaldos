-- SCRIPT DE DIAGNÓSTICO: Ver qué hay en imagen_url
SELECT imagen_url, count(*) 
FROM libros 
WHERE imagen_url IS NOT NULL AND imagen_url != ''
GROUP BY imagen_url
LIMIT 20;
