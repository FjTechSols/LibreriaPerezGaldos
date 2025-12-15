-- Optimización de índices para mejorar el rendimiento de consultas
-- Ejecutar en Supabase SQL Editor
-- Índice para búsquedas por activo (usado en todas las consultas)
CREATE INDEX IF NOT EXISTS idx_libros_activo ON libros(activo);
-- Índice para libros destacados
CREATE INDEX IF NOT EXISTS idx_libros_destacado ON libros(destacado)
WHERE destacado = true;
-- Índice para novedades
CREATE INDEX IF NOT EXISTS idx_libros_novedad ON libros(novedad)
WHERE novedad = true;
-- Índice para ofertas
CREATE INDEX IF NOT EXISTS idx_libros_oferta ON libros(oferta)
WHERE oferta = true;
-- Índice compuesto para búsquedas activas y ordenadas por título
CREATE INDEX IF NOT EXISTS idx_libros_activo_titulo ON libros(activo, titulo);
-- Índice para búsquedas por categoría
CREATE INDEX IF NOT EXISTS idx_libros_categoria ON libros(categoria_id)
WHERE activo = true;
-- Índice para búsquedas por editorial
CREATE INDEX IF NOT EXISTS idx_libros_editorial ON libros(editorial_id)
WHERE activo = true;
-- Índice para búsquedas por ISBN
CREATE INDEX IF NOT EXISTS idx_libros_isbn ON libros(isbn)
WHERE activo = true
    AND isbn IS NOT NULL;
-- Índice para búsquedas por legacy_id
CREATE INDEX IF NOT EXISTS idx_libros_legacy_id ON libros(legacy_id);
-- Índice para búsquedas de texto en título
CREATE INDEX IF NOT EXISTS idx_libros_titulo_text ON libros USING gin(to_tsvector('spanish', titulo));
-- Índice para búsquedas de texto en autor
CREATE INDEX IF NOT EXISTS idx_libros_autor_text ON libros USING gin(to_tsvector('spanish', autor));
-- Analizar las tablas para actualizar estadísticas
ANALYZE libros;
ANALYZE categorias;
ANALYZE editoriales;