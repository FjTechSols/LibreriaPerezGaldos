-- Agregar columna precio_original a la tabla libros
ALTER TABLE libros
ADD COLUMN IF NOT EXISTS precio_original DECIMAL(10, 2);
-- Actualizar precio_original para libros en oferta existentes (opcional, inicialización)
-- Establece el precio_original como un 20% más que el precio actual si está en oferta y no tiene precio_original
UPDATE libros
SET precio_original = precio * 1.2
WHERE oferta = true
    AND precio_original IS NULL;