/*
  # Añadir campo codigo autogenerado a tabla libros

  1. Cambios
    - Añadir columna `codigo` a tabla `libros`
    - El campo será autogenerado con secuencia
    - Formato: LIB + número autoincremental de 6 dígitos (ej: LIB000001)
    - Es opcional: libros antiguos usarán `legacy_id`, libros nuevos usarán `codigo`

  2. Notas
    - Los libros antiguos seguirán mostrando su `legacy_id`
    - Los libros nuevos tendrán un `codigo` autogenerado
    - Se crea una función para generar el próximo código disponible

  3. Instrucciones de uso
    - Conectarse a la base de datos de Supabase
    - Ejecutar este script SQL completo
    - Verificar que la columna `codigo` se creó correctamente
*/

-- Crear secuencia para los códigos de libros
CREATE SEQUENCE IF NOT EXISTS libros_codigo_seq START WITH 1;

-- Añadir columna codigo a la tabla libros
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'libros' AND column_name = 'codigo'
  ) THEN
    ALTER TABLE libros ADD COLUMN codigo VARCHAR(20) UNIQUE;
  END IF;
END $$;

-- Función para generar el próximo código de libro
CREATE OR REPLACE FUNCTION generate_libro_codigo()
RETURNS VARCHAR(20) AS $$
DECLARE
  next_num INT;
  new_codigo VARCHAR(20);
BEGIN
  next_num := nextval('libros_codigo_seq');
  new_codigo := 'LIB' || LPAD(next_num::TEXT, 6, '0');
  RETURN new_codigo;
END;
$$ LANGUAGE plpgsql;

-- Trigger para autogenerar el código si no se proporciona
CREATE OR REPLACE FUNCTION set_libro_codigo()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo generar código si no se proporcionó uno
  IF NEW.codigo IS NULL THEN
    NEW.codigo := generate_libro_codigo();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger si no existe
DROP TRIGGER IF EXISTS libro_codigo_trigger ON libros;
CREATE TRIGGER libro_codigo_trigger
  BEFORE INSERT ON libros
  FOR EACH ROW
  EXECUTE FUNCTION set_libro_codigo();

-- Generar códigos para libros existentes que no tengan legacy_id ni codigo
UPDATE libros
SET codigo = generate_libro_codigo()
WHERE codigo IS NULL AND legacy_id IS NULL;

-- Verificar que se creó correctamente
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'libros'
  AND column_name IN ('codigo', 'legacy_id')
ORDER BY column_name;
