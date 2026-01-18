-- Añadir nuevas columnas a la tabla libros

-- 1. Descatalogado (Booleano, por defecto false)
ALTER TABLE libros 
ADD COLUMN IF NOT EXISTS descatalogado BOOLEAN DEFAULT false;

-- 2. Estado (Texto, validamos que sea 'nuevo' o 'leido', por defecto 'leido')
ALTER TABLE libros 
ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'leido';

-- Restricción para asegurar que solo acepte valores válidos
ALTER TABLE libros 
DROP CONSTRAINT IF EXISTS check_estado_libro;

ALTER TABLE libros 
ADD CONSTRAINT check_estado_libro 
CHECK (estado IN ('nuevo', 'leido'));

-- 3. Idioma (Texto, opcional, por defecto 'Español')
ALTER TABLE libros 
ADD COLUMN IF NOT EXISTS idioma TEXT DEFAULT 'Español';

-- Comentarios para documentación
COMMENT ON COLUMN libros.descatalogado IS 'Indica si el libro está descatalogado por la editorial';
COMMENT ON COLUMN libros.estado IS 'Estado físico del libro: nuevo o leido';
COMMENT ON COLUMN libros.idioma IS 'Idioma en el que está escrito el libro';
