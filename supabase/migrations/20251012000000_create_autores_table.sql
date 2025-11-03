/*
  # Crear Tabla de Autores y Relación con Libros

  ## Descripción
  Esta migración crea la tabla `autores` para gestionar los autores de libros
  y establece una relación muchos-a-muchos con la tabla `libros` mediante
  la tabla intermedia `libro_autores`.

  ## Problema
  Actualmente los autores no están en una tabla separada, lo que dificulta:
  - Gestionar autores de forma centralizada
  - Buscar todos los libros de un autor específico
  - Normalizar nombres de autores
  - Soportar libros con múltiples autores

  ## Solución
  1. Crear tabla `autores` con información del autor
  2. Crear tabla `libro_autores` (relación muchos-a-muchos)
  3. Agregar columna temporal `autor` en libros (para migración gradual)
  4. Configurar RLS para ambas tablas
  5. Agregar índices para performance

  ## Nuevas Tablas
  ### autores
  - `id` (serial, primary key)
  - `nombre` (varchar 200, not null, unique)
  - `biografia` (text, opcional)
  - `pais` (varchar 100, opcional)
  - `fecha_nacimiento` (date, opcional)
  - `fecha_fallecimiento` (date, opcional)
  - `sitio_web` (varchar 255, opcional)
  - `foto_url` (text, opcional)
  - `activo` (boolean, default true)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### libro_autores
  - `id` (serial, primary key)
  - `libro_id` (integer, foreign key → libros)
  - `autor_id` (integer, foreign key → autores)
  - `orden` (smallint, para autores co-autores)
  - `created_at` (timestamptz)

  ## Seguridad
  - RLS habilitado en ambas tablas
  - Usuarios autenticados pueden leer
  - Solo administradores pueden crear/actualizar/eliminar
*/

-- =====================================================
-- Tabla: autores
-- Almacena información de autores de libros
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
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- Tabla: libro_autores (relación muchos-a-muchos)
-- Relaciona libros con sus autores
-- =====================================================
CREATE TABLE IF NOT EXISTS libro_autores (
    id SERIAL PRIMARY KEY,
    libro_id INT NOT NULL REFERENCES libros(id) ON DELETE CASCADE,
    autor_id INT NOT NULL REFERENCES autores(id) ON DELETE CASCADE,
    orden SMALLINT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(libro_id, autor_id)
);

-- =====================================================
-- Agregar columna temporal "autor" a libros
-- Esto permite migración gradual desde texto a relación
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'libros' AND column_name = 'autor'
  ) THEN
    ALTER TABLE libros ADD COLUMN autor VARCHAR(200);
  END IF;
END $$;

-- =====================================================
-- Comentarios en tablas y columnas
-- =====================================================
COMMENT ON TABLE autores IS
'Catálogo de autores de libros. Permite gestionar información centralizada de autores.';

COMMENT ON COLUMN autores.nombre IS
'Nombre completo del autor (único en el sistema)';

COMMENT ON COLUMN autores.biografia IS
'Biografía o descripción del autor';

COMMENT ON TABLE libro_autores IS
'Tabla intermedia para relación muchos-a-muchos entre libros y autores';

COMMENT ON COLUMN libro_autores.orden IS
'Orden de aparición del autor (1 = primer autor, 2 = segundo, etc.)';

COMMENT ON COLUMN libros.autor IS
'Campo temporal para migración. Usar libro_autores para nuevos libros.';

-- =====================================================
-- Índices para performance
-- =====================================================

-- Índice en nombre de autor (búsquedas frecuentes)
CREATE INDEX IF NOT EXISTS idx_autores_nombre
ON autores(nombre);

-- Índice en autores activos
CREATE INDEX IF NOT EXISTS idx_autores_activo
ON autores(activo)
WHERE activo = true;

-- Índice GIN para búsqueda de texto completo en nombre
CREATE INDEX IF NOT EXISTS idx_autores_nombre_gin
ON autores USING gin(to_tsvector('spanish', nombre));

-- Índice en timestamps
CREATE INDEX IF NOT EXISTS idx_autores_created_at
ON autores(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_autores_updated_at
ON autores(updated_at DESC);

-- Índices en libro_autores
CREATE INDEX IF NOT EXISTS idx_libro_autores_libro_id
ON libro_autores(libro_id);

CREATE INDEX IF NOT EXISTS idx_libro_autores_autor_id
ON libro_autores(autor_id);

-- Índice compuesto para consultas de libros por autor
CREATE INDEX IF NOT EXISTS idx_libro_autores_autor_orden
ON libro_autores(autor_id, orden);

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

-- Habilitar RLS
ALTER TABLE autores ENABLE ROW LEVEL SECURITY;
ALTER TABLE libro_autores ENABLE ROW LEVEL SECURITY;

-- Políticas para AUTORES
-- Todos pueden leer autores activos
CREATE POLICY "Usuarios autenticados pueden ver autores activos"
ON autores
FOR SELECT
TO authenticated
USING (activo = true);

-- Usuarios públicos pueden ver autores activos (para catálogo)
CREATE POLICY "Usuarios públicos pueden ver autores activos"
ON autores
FOR SELECT
TO anon
USING (activo = true);

-- Solo administradores pueden insertar autores
CREATE POLICY "Solo administradores pueden insertar autores"
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

-- Solo administradores pueden actualizar autores
CREATE POLICY "Solo administradores pueden actualizar autores"
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

-- Solo administradores pueden eliminar autores
CREATE POLICY "Solo administradores pueden eliminar autores"
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

-- Políticas para LIBRO_AUTORES
-- Todos pueden leer relaciones libro-autor
CREATE POLICY "Usuarios autenticados pueden ver libro_autores"
ON libro_autores
FOR SELECT
TO authenticated
USING (true);

-- Usuarios públicos pueden ver relaciones libro-autor
CREATE POLICY "Usuarios públicos pueden ver libro_autores"
ON libro_autores
FOR SELECT
TO anon
USING (true);

-- Solo administradores pueden gestionar relaciones
CREATE POLICY "Solo administradores pueden insertar libro_autores"
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

CREATE POLICY "Solo administradores pueden actualizar libro_autores"
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

CREATE POLICY "Solo administradores pueden eliminar libro_autores"
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
-- Trigger para actualizar updated_at en autores
-- =====================================================
CREATE TRIGGER update_autores_updated_at
BEFORE UPDATE ON autores
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Función helper: Obtener autores de un libro
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

COMMENT ON FUNCTION get_libro_autores(INT) IS
'Retorna una lista concatenada de autores de un libro, ordenados por orden de autoría.';

-- =====================================================
-- Función helper: Obtener libros de un autor
-- =====================================================
CREATE OR REPLACE FUNCTION get_autor_libros(autor_id_param INT)
RETURNS TABLE(
    libro_id INT,
    titulo VARCHAR,
    isbn VARCHAR,
    precio DECIMAL
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
        l.precio
    FROM libro_autores la
    JOIN libros l ON l.id = la.libro_id
    WHERE la.autor_id = autor_id_param
    AND l.activo = true
    ORDER BY la.orden, l.titulo;
END;
$$;

COMMENT ON FUNCTION get_autor_libros(INT) IS
'Retorna todos los libros activos de un autor específico.';

-- =====================================================
-- Datos iniciales: Autores de ejemplo
-- =====================================================
INSERT INTO autores (nombre, pais, activo) VALUES
('Benito Pérez Galdós', 'España', true),
('Miguel de Cervantes', 'España', true),
('Gabriel García Márquez', 'Colombia', true),
('Jorge Luis Borges', 'Argentina', true),
('Isabel Allende', 'Chile', true),
('Mario Vargas Llosa', 'Perú', true),
('Federico García Lorca', 'España', true),
('Pablo Neruda', 'Chile', true),
('Octavio Paz', 'México', true),
('Carlos Ruiz Zafón', 'España', true),
('Autor Desconocido', NULL, true)
ON CONFLICT (nombre) DO NOTHING;

-- =====================================================
-- Actualizar estadísticas
-- =====================================================
ANALYZE autores;
ANALYZE libro_autores;
