/*
  # Añadir campos especiales a tabla libros

  1. Cambios
    - Añadir columna `precio_original` (DECIMAL) para el precio antes de oferta
    - Añadir columna `destacado` (BOOLEAN) para libros destacados
    - Añadir columna `es_nuevo` (BOOLEAN) para libros nuevos
    - Añadir columna `en_oferta` (BOOLEAN) para libros en oferta

  2. Uso
    - `precio_original`: Se usa cuando `en_oferta = true` para mostrar el precio anterior tachado
    - `destacado`: Marca libros para mostrar en sección destacados
    - `es_nuevo`: Marca libros como nuevos (muestra etiqueta "Nuevo")
    - `en_oferta`: Marca libros en oferta (muestra etiqueta "Oferta" y precio rebajado)

  3. Notas
    - Todos los campos tienen valores por defecto de FALSE
    - El `precio_original` solo se muestra si `en_oferta = true`
    - Estos campos permiten controlar la presentación de libros en el frontend
*/

-- Añadir columna precio_original
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'libros' AND column_name = 'precio_original'
  ) THEN
    ALTER TABLE libros ADD COLUMN precio_original DECIMAL(10,2);
  END IF;
END $$;

-- Añadir columna destacado
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'libros' AND column_name = 'destacado'
  ) THEN
    ALTER TABLE libros ADD COLUMN destacado BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Añadir columna es_nuevo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'libros' AND column_name = 'es_nuevo'
  ) THEN
    ALTER TABLE libros ADD COLUMN es_nuevo BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Añadir columna en_oferta
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'libros' AND column_name = 'en_oferta'
  ) THEN
    ALTER TABLE libros ADD COLUMN en_oferta BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Crear índice para búsquedas frecuentes de libros destacados/nuevos/oferta
CREATE INDEX IF NOT EXISTS idx_libros_destacado ON libros(destacado) WHERE destacado = TRUE;
CREATE INDEX IF NOT EXISTS idx_libros_es_nuevo ON libros(es_nuevo) WHERE es_nuevo = TRUE;
CREATE INDEX IF NOT EXISTS idx_libros_en_oferta ON libros(en_oferta) WHERE en_oferta = TRUE;

-- Añadir comentarios para documentación
COMMENT ON COLUMN libros.precio_original IS 'Precio antes de oferta (solo se usa si en_oferta = true)';
COMMENT ON COLUMN libros.destacado IS 'Indica si el libro debe mostrarse en sección destacados';
COMMENT ON COLUMN libros.es_nuevo IS 'Indica si el libro es nuevo (muestra etiqueta "Nuevo")';
COMMENT ON COLUMN libros.en_oferta IS 'Indica si el libro está en oferta (muestra precio rebajado)';

-- Verificar que se crearon correctamente
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'libros'
  AND column_name IN ('precio_original', 'destacado', 'es_nuevo', 'en_oferta')
ORDER BY column_name;
