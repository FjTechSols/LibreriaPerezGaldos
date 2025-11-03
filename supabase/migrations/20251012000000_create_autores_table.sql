/*
  # Crear Tabla de Autores y Relación con Libros

  ## Descripción
  Esta migración crea el sistema completo de gestión de autores para la librería,
  estableciendo una relación muchos-a-muchos con libros mediante tabla intermedia.

  ## 1. Nuevas Tablas

  ### autores
  Catálogo de autores de libros con información detallada:
    - `id` (serial, primary key)
    - `nombre` (varchar 200, not null, unique) - Nombre completo del autor
    - `biografia` (text, opcional) - Biografía o descripción
    - `pais` (varchar 100, opcional) - País de origen
    - `fecha_nacimiento` (date, opcional) - Fecha de nacimiento
    - `fecha_fallecimiento` (date, opcional) - Fecha de fallecimiento
    - `sitio_web` (varchar 255, opcional) - URL del sitio web oficial
    - `foto_url` (text, opcional) - URL de la foto del autor
    - `activo` (boolean, default true) - Estado activo/inactivo
    - `created_at` (timestamptz) - Fecha de creación
    - `updated_at` (timestamptz) - Fecha de última actualización

  ### libro_autores
  Tabla intermedia para relación muchos-a-muchos entre libros y autores:
    - `id` (serial, primary key)
    - `libro_id` (int, foreign key → libros) - Referencia al libro
    - `autor_id` (int, foreign key → autores) - Referencia al autor
    - `orden` (smallint, default 1) - Orden de autoría (1 = principal, 2 = segundo, etc.)
    - `created_at` (timestamptz) - Fecha de creación
    - UNIQUE(libro_id, autor_id) - Un autor solo puede aparecer una vez por libro

  ## 2. Modificaciones a tablas existentes
    - Se agrega columna `autor` (varchar 200) en tabla `libros`
    - Esta columna permite migración gradual desde texto a relación
    - Los libros existentes pueden mantener el campo texto temporalmente
    - Nuevos libros deberían usar la tabla `libro_autores`

  ## 3. Seguridad (RLS)

  ### Tabla autores:
    - SELECT: Usuarios autenticados y anónimos pueden leer autores activos
    - INSERT: Solo administradores pueden crear autores
    - UPDATE: Solo administradores pueden actualizar autores
    - DELETE: Solo administradores pueden eliminar autores

  ### Tabla libro_autores:
    - SELECT: Todos pueden leer relaciones (público para catálogo)
    - INSERT/UPDATE/DELETE: Solo administradores pueden gestionar relaciones

  ## 4. Índices para Performance
    - Índice en nombre de autor (búsquedas)
    - Índice GIN para búsqueda de texto completo en español
    - Índice parcial en autores activos
    - Índices en timestamps (created_at, updated_at)
    - Índices en foreign keys de libro_autores
    - Índice compuesto (autor_id, orden) para queries optimizadas

  ## 5. Funciones Helper
    - `get_libro_autores(libro_id)` - Retorna autores de un libro como texto
    - `get_autor_libros(autor_id)` - Retorna todos los libros de un autor

  ## 6. Datos Iniciales
    - Se insertan 11 autores de ejemplo de literatura hispana
*/

-- =====================================================
-- TABLA: autores
-- Catálogo de autores con información detallada
-- =====================================================
CREATE TABLE IF NOT EXISTS autores (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL UNIQUE,
    biografia TEXT,
    pais VARCHAR(100),
    fecha_nacimiento DATE,
    fecha_fallecimiento DATE,
    sitio_web VARCHAR(255),
    foto_url TEXT,
    activo BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- =====================================================
-- TABLA: libro_autores
-- Relación muchos-a-muchos entre libros y autores
-- =====================================================
CREATE TABLE IF NOT EXISTS libro_autores (
    id SERIAL PRIMARY KEY,
    libro_id INT NOT NULL REFERENCES libros(id) ON DELETE CASCADE,
    autor_id INT NOT NULL REFERENCES autores(id) ON DELETE CASCADE,
    orden SMALLINT DEFAULT 1 NOT NULL CHECK (orden > 0),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(libro_id, autor_id)
);

-- =====================================================
-- MODIFICAR: Tabla libros
-- Agregar columna temporal "autor" para migración gradual
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'libros' AND column_name = 'autor'
  ) THEN
    ALTER TABLE libros ADD COLUMN autor VARCHAR(200);
    COMMENT ON COLUMN libros.autor IS
    'Campo temporal para migración gradual. Usar tabla libro_autores para nuevos libros.';
  END IF;
END $$;

-- =====================================================
-- ÍNDICES: autores
-- =====================================================

-- Índice en nombre para búsquedas y ordenamiento
CREATE INDEX IF NOT EXISTS idx_autores_nombre
ON autores(nombre);

-- Índice parcial en autores activos (más eficiente)
CREATE INDEX IF NOT EXISTS idx_autores_activo
ON autores(activo)
WHERE activo = true;

-- Índice GIN para búsqueda de texto completo en español
CREATE INDEX IF NOT EXISTS idx_autores_nombre_gin
ON autores USING gin(to_tsvector('spanish', nombre));

-- Índice en país para filtros
CREATE INDEX IF NOT EXISTS idx_autores_pais
ON autores(pais)
WHERE pais IS NOT NULL;

-- Índices en timestamps para ordenamiento
CREATE INDEX IF NOT EXISTS idx_autores_created_at
ON autores(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_autores_updated_at
ON autores(updated_at DESC);

-- =====================================================
-- ÍNDICES: libro_autores
-- =====================================================

-- Índice en libro_id (búsquedas de autores por libro)
CREATE INDEX IF NOT EXISTS idx_libro_autores_libro_id
ON libro_autores(libro_id);

-- Índice en autor_id (búsquedas de libros por autor)
CREATE INDEX IF NOT EXISTS idx_libro_autores_autor_id
ON libro_autores(autor_id);

-- Índice compuesto para queries optimizadas con orden
CREATE INDEX IF NOT EXISTS idx_libro_autores_autor_orden
ON libro_autores(autor_id, orden);

-- Índice compuesto para queries de libro con orden
CREATE INDEX IF NOT EXISTS idx_libro_autores_libro_orden
ON libro_autores(libro_id, orden);

-- =====================================================
-- TRIGGER: update_updated_at para autores
-- =====================================================
CREATE TRIGGER update_autores_updated_at
BEFORE UPDATE ON autores
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY: autores
-- =====================================================
ALTER TABLE autores ENABLE ROW LEVEL SECURITY;

-- SELECT: Usuarios autenticados pueden ver autores activos
CREATE POLICY "Authenticated users can view active authors"
ON autores
FOR SELECT
TO authenticated
USING (activo = true);

-- SELECT: Usuarios públicos pueden ver autores activos (para catálogo)
CREATE POLICY "Public users can view active authors"
ON autores
FOR SELECT
TO anon
USING (activo = true);

-- INSERT: Solo administradores pueden crear autores
CREATE POLICY "Only admins can create authors"
ON autores
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.auth_user_id = auth.uid()
    AND usuarios.rol_id = (SELECT id FROM roles WHERE nombre = 'admin')
  )
);

-- UPDATE: Solo administradores pueden actualizar autores
CREATE POLICY "Only admins can update authors"
ON autores
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.auth_user_id = auth.uid()
    AND usuarios.rol_id = (SELECT id FROM roles WHERE nombre = 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.auth_user_id = auth.uid()
    AND usuarios.rol_id = (SELECT id FROM roles WHERE nombre = 'admin')
  )
);

-- DELETE: Solo administradores pueden eliminar autores
CREATE POLICY "Only admins can delete authors"
ON autores
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.auth_user_id = auth.uid()
    AND usuarios.rol_id = (SELECT id FROM roles WHERE nombre = 'admin')
  )
);

-- =====================================================
-- ROW LEVEL SECURITY: libro_autores
-- =====================================================
ALTER TABLE libro_autores ENABLE ROW LEVEL SECURITY;

-- SELECT: Usuarios autenticados pueden ver relaciones libro-autor
CREATE POLICY "Authenticated users can view book authors"
ON libro_autores
FOR SELECT
TO authenticated
USING (true);

-- SELECT: Usuarios públicos pueden ver relaciones (para catálogo público)
CREATE POLICY "Public users can view book authors"
ON libro_autores
FOR SELECT
TO anon
USING (true);

-- INSERT: Solo administradores pueden crear relaciones
CREATE POLICY "Only admins can create book author relations"
ON libro_autores
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.auth_user_id = auth.uid()
    AND usuarios.rol_id = (SELECT id FROM roles WHERE nombre = 'admin')
  )
);

-- UPDATE: Solo administradores pueden actualizar relaciones
CREATE POLICY "Only admins can update book author relations"
ON libro_autores
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.auth_user_id = auth.uid()
    AND usuarios.rol_id = (SELECT id FROM roles WHERE nombre = 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.auth_user_id = auth.uid()
    AND usuarios.rol_id = (SELECT id FROM roles WHERE nombre = 'admin')
  )
);

-- DELETE: Solo administradores pueden eliminar relaciones
CREATE POLICY "Only admins can delete book author relations"
ON libro_autores
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.auth_user_id = auth.uid()
    AND usuarios.rol_id = (SELECT id FROM roles WHERE nombre = 'admin')
  )
);

-- =====================================================
-- FUNCIÓN HELPER: get_libro_autores
-- Obtiene lista de autores de un libro como texto concatenado
-- =====================================================
CREATE OR REPLACE FUNCTION get_libro_autores(libro_id_param INT)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
    autores_list TEXT;
BEGIN
    SELECT STRING_AGG(a.nombre, ', ' ORDER BY la.orden)
    INTO autores_list
    FROM libro_autores la
    JOIN autores a ON a.id = la.autor_id
    WHERE la.libro_id = libro_id_param
    AND a.activo = true;

    RETURN COALESCE(autores_list, '');
END;
$$;

-- =====================================================
-- FUNCIÓN HELPER: get_autor_libros
-- Obtiene todos los libros activos de un autor
-- =====================================================
CREATE OR REPLACE FUNCTION get_autor_libros(autor_id_param INT)
RETURNS TABLE(
    libro_id INT,
    titulo VARCHAR,
    isbn VARCHAR,
    precio DECIMAL,
    activo BOOLEAN,
    orden SMALLINT
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        l.id,
        l.titulo,
        l.isbn,
        l.precio,
        l.activo,
        la.orden
    FROM libro_autores la
    JOIN libros l ON l.id = la.libro_id
    WHERE la.autor_id = autor_id_param
    AND l.activo = true
    ORDER BY la.orden, l.titulo;
END;
$$;

-- =====================================================
-- FUNCIÓN HELPER: count_autor_libros
-- Cuenta cuántos libros tiene un autor
-- =====================================================
CREATE OR REPLACE FUNCTION count_autor_libros(autor_id_param INT)
RETURNS INT
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
    total_libros INT;
BEGIN
    SELECT COUNT(*)
    INTO total_libros
    FROM libro_autores la
    JOIN libros l ON l.id = la.libro_id
    WHERE la.autor_id = autor_id_param
    AND l.activo = true;

    RETURN total_libros;
END;
$$;

-- =====================================================
-- COMENTARIOS en tablas y columnas
-- =====================================================
COMMENT ON TABLE autores IS
'Catálogo de autores de libros. Permite gestionar información centralizada de autores.';

COMMENT ON COLUMN autores.nombre IS
'Nombre completo del autor (único en el sistema)';

COMMENT ON COLUMN autores.biografia IS
'Biografía o descripción del autor';

COMMENT ON COLUMN autores.pais IS
'País de origen del autor';

COMMENT ON COLUMN autores.fecha_nacimiento IS
'Fecha de nacimiento del autor';

COMMENT ON COLUMN autores.fecha_fallecimiento IS
'Fecha de fallecimiento del autor (NULL si está vivo)';

COMMENT ON COLUMN autores.activo IS
'Estado del autor en el sistema (activo/inactivo)';

COMMENT ON TABLE libro_autores IS
'Tabla intermedia para relación muchos-a-muchos entre libros y autores';

COMMENT ON COLUMN libro_autores.orden IS
'Orden de aparición del autor (1 = primer autor/principal, 2 = segundo autor, etc.)';

COMMENT ON FUNCTION get_libro_autores(INT) IS
'Retorna una lista concatenada de autores de un libro, ordenados por orden de autoría.';

COMMENT ON FUNCTION get_autor_libros(INT) IS
'Retorna todos los libros activos de un autor específico con su información básica.';

COMMENT ON FUNCTION count_autor_libros(INT) IS
'Retorna el número total de libros activos de un autor.';

-- =====================================================
-- DATOS INICIALES: Autores de ejemplo
-- Autores destacados de literatura hispana
-- =====================================================
INSERT INTO autores (nombre, pais, biografia, activo) VALUES
(
  'Benito Pérez Galdós',
  'España',
  'Novelista, dramaturgo, cronista y político español. Considerado uno de los mejores representantes de la novela realista del siglo XIX.',
  true
),
(
  'Miguel de Cervantes',
  'España',
  'Novelista, poeta, dramaturgo y soldado español. Autor de Don Quijote de la Mancha, considerada la primera novela moderna.',
  true
),
(
  'Gabriel García Márquez',
  'Colombia',
  'Escritor, novelista, cuentista, guionista, editor y periodista colombiano. Premio Nobel de Literatura 1982.',
  true
),
(
  'Jorge Luis Borges',
  'Argentina',
  'Escritor argentino, uno de los autores más destacados de la literatura del siglo XX. Poeta, ensayista y cuentista.',
  true
),
(
  'Isabel Allende',
  'Chile',
  'Escritora chilena, considerada la escritora viva de lengua española más leída del mundo.',
  true
),
(
  'Mario Vargas Llosa',
  'Perú',
  'Escritor peruano, Premio Nobel de Literatura 2010. Uno de los más importantes novelistas y ensayistas contemporáneos.',
  true
),
(
  'Federico García Lorca',
  'España',
  'Poeta, dramaturgo y prosista español. Adscrito a la Generación del 27, es uno de los poetas más influyentes de la literatura española.',
  true
),
(
  'Pablo Neruda',
  'Chile',
  'Poeta chileno, considerado uno de los más influyentes del siglo XX. Premio Nobel de Literatura 1971.',
  true
),
(
  'Octavio Paz',
  'México',
  'Poeta, ensayista y diplomático mexicano. Premio Nobel de Literatura 1990.',
  true
),
(
  'Carlos Ruiz Zafón',
  'España',
  'Escritor español, autor de la tetralogía El Cementerio de los Libros Olvidados. Uno de los autores españoles más leídos en el mundo.',
  true
),
(
  'Autor Desconocido',
  NULL,
  'Usado para obras anónimas o de autoría desconocida.',
  true
)
ON CONFLICT (nombre) DO NOTHING;

-- =====================================================
-- ACTUALIZAR ESTADÍSTICAS
-- Para optimizar el query planner de PostgreSQL
-- =====================================================
ANALYZE autores;
ANALYZE libro_autores;

-- =====================================================
-- VERIFICACIÓN: Mostrar resumen de cambios
-- =====================================================
DO $$
DECLARE
    total_autores INT;
BEGIN
    SELECT COUNT(*) INTO total_autores FROM autores;
    RAISE NOTICE 'Migración completada exitosamente.';
    RAISE NOTICE 'Total de autores creados: %', total_autores;
    RAISE NOTICE 'Tablas creadas: autores, libro_autores';
    RAISE NOTICE 'Funciones creadas: get_libro_autores, get_autor_libros, count_autor_libros';
END $$;
