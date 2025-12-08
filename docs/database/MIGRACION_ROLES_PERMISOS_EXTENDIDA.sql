/*
  # Extensión del Sistema de Roles y Permisos

  ## Descripción
  Extiende el sistema de roles existente con permisos granulares y jerarquía.
  Mantiene compatibilidad con el sistema actual (rol_id = 1 para admin).

  ## INSTRUCCIONES PARA APLICAR:
  1. Ve a tu proyecto en Supabase Dashboard (https://app.supabase.com)
  2. Navega a SQL Editor
  3. Crea una nueva query
  4. Copia y pega TODO este contenido
  5. Ejecuta la query

  ## Cambios en Tablas Existentes

  ### Extensión de `roles`
  Se agregan nuevos campos a la tabla existente:
  - `display_name` - Nombre para mostrar
  - `descripcion` - Descripción del rol
  - `nivel_jerarquia` - Nivel jerárquico (1=más alto)
  - `activo` - Si el rol está activo
  - `es_sistema` - Si es un rol del sistema
  - `updated_at` - Última actualización

  ## Nuevas Tablas

  ### `permisos`
  Define permisos específicos del sistema
  - `id` (uuid, primary key)
  - `codigo` (text, unique) - Código del permiso
  - `nombre` (text) - Nombre descriptivo
  - `descripcion` (text)
  - `categoria` (text) - Categoría del permiso

  ### `roles_permisos`
  Relación entre roles y permisos
  - `id` (uuid, primary key)
  - `rol_id` (integer, foreign key a roles.id)
  - `permiso_id` (uuid, foreign key a permisos.id)

  ### `usuarios_roles`
  Sistema avanzado de asignación de roles
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key a auth.users)
  - `rol_id` (integer, foreign key a roles.id)
  - `asignado_por` (uuid, foreign key a auth.users)
  - `activo` (boolean)

  ## Seguridad
  - RLS habilitado en todas las tablas nuevas
  - Mantiene políticas existentes
  - Solo super_admin puede gestionar roles del sistema
*/

-- =========================
-- Extender tabla roles existente
-- =========================

-- Agregar nuevas columnas a roles (si no existen)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'display_name') THEN
    ALTER TABLE roles ADD COLUMN display_name VARCHAR(100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'descripcion') THEN
    ALTER TABLE roles ADD COLUMN descripcion TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'nivel_jerarquia') THEN
    ALTER TABLE roles ADD COLUMN nivel_jerarquia INTEGER DEFAULT 999;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'activo') THEN
    ALTER TABLE roles ADD COLUMN activo BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'es_sistema') THEN
    ALTER TABLE roles ADD COLUMN es_sistema BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'updated_at') THEN
    ALTER TABLE roles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- =========================
-- Tabla de permisos
-- =========================

CREATE TABLE IF NOT EXISTS permisos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  categoria text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- =========================
-- Tabla de relación roles-permisos
-- =========================

CREATE TABLE IF NOT EXISTS roles_permisos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rol_id integer NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permiso_id uuid NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(rol_id, permiso_id)
);

-- =========================
-- Tabla de asignación avanzada de roles
-- =========================

CREATE TABLE IF NOT EXISTS usuarios_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rol_id integer NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  asignado_por uuid REFERENCES auth.users(id),
  fecha_asignacion timestamptz DEFAULT now(),
  activo boolean DEFAULT true,
  notas text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, rol_id)
);

-- =========================
-- Índices
-- =========================

CREATE INDEX IF NOT EXISTS idx_usuarios_roles_user_id ON usuarios_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_roles_rol_id ON usuarios_roles(rol_id);
CREATE INDEX IF NOT EXISTS idx_roles_permisos_rol_id ON roles_permisos(rol_id);
CREATE INDEX IF NOT EXISTS idx_roles_permisos_permiso_id ON roles_permisos(permiso_id);
CREATE INDEX IF NOT EXISTS idx_permisos_categoria ON permisos(categoria);

-- =========================
-- Triggers
-- =========================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_usuarios_roles_updated_at ON usuarios_roles;
CREATE TRIGGER update_usuarios_roles_updated_at
  BEFORE UPDATE ON usuarios_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =========================
-- Actualizar roles existentes
-- =========================

-- Actualizar rol admin existente (id = 1)
UPDATE roles SET
  display_name = 'Super Administrador',
  descripcion = 'Control total del sistema. Puede gestionar todos los usuarios y configuraciones.',
  nivel_jerarquia = 1,
  es_sistema = true,
  activo = true
WHERE id = 1;

-- Insertar nuevos roles si no existen
INSERT INTO roles (id, nombre, display_name, descripcion, nivel_jerarquia, es_sistema, activo)
VALUES
  (2, 'admin', 'Administrador', 'Gestión completa del sistema excepto crear super administradores.', 2, true, true),
  (3, 'editor', 'Editor', 'Puede gestionar libros, pedidos, facturas y clientes.', 3, true, true),
  (4, 'visualizador', 'Visualizador', 'Solo puede ver información, sin capacidad de modificar.', 4, true, true)
ON CONFLICT (id) DO NOTHING;

-- Si el nombre del rol con id=1 no es correcto, actualizarlo
UPDATE roles SET nombre = 'super_admin' WHERE id = 1 AND nombre != 'super_admin';

-- =========================
-- Insertar permisos del sistema
-- =========================

INSERT INTO permisos (codigo, nombre, descripcion, categoria) VALUES
  -- Libros
  ('libros.ver', 'Ver Libros', 'Puede ver el catálogo de libros', 'libros'),
  ('libros.crear', 'Crear Libros', 'Puede agregar nuevos libros', 'libros'),
  ('libros.editar', 'Editar Libros', 'Puede modificar libros existentes', 'libros'),
  ('libros.eliminar', 'Eliminar Libros', 'Puede eliminar libros', 'libros'),
  ('libros.importar', 'Importar Libros', 'Puede importar libros masivamente', 'libros'),

  -- Usuarios
  ('usuarios.ver', 'Ver Usuarios', 'Puede ver la lista de usuarios', 'usuarios'),
  ('usuarios.crear', 'Crear Usuarios', 'Puede crear nuevos usuarios', 'usuarios'),
  ('usuarios.editar', 'Editar Usuarios', 'Puede modificar usuarios', 'usuarios'),
  ('usuarios.eliminar', 'Eliminar Usuarios', 'Puede eliminar usuarios', 'usuarios'),
  ('usuarios.gestionar_roles', 'Gestionar Roles', 'Puede asignar y modificar roles de usuarios', 'usuarios'),

  -- Pedidos
  ('pedidos.ver', 'Ver Pedidos', 'Puede ver pedidos', 'pedidos'),
  ('pedidos.crear', 'Crear Pedidos', 'Puede crear nuevos pedidos', 'pedidos'),
  ('pedidos.editar', 'Editar Pedidos', 'Puede modificar pedidos', 'pedidos'),
  ('pedidos.eliminar', 'Eliminar Pedidos', 'Puede eliminar pedidos', 'pedidos'),
  ('pedidos.aprobar', 'Aprobar Pedidos', 'Puede aprobar/rechazar pedidos', 'pedidos'),

  -- Facturas
  ('facturas.ver', 'Ver Facturas', 'Puede ver facturas', 'facturas'),
  ('facturas.crear', 'Crear Facturas', 'Puede crear nuevas facturas', 'facturas'),
  ('facturas.editar', 'Editar Facturas', 'Puede modificar facturas', 'facturas'),
  ('facturas.eliminar', 'Eliminar Facturas', 'Puede eliminar facturas', 'facturas'),
  ('facturas.exportar', 'Exportar Facturas', 'Puede exportar facturas a PDF/Excel', 'facturas'),

  -- Clientes
  ('clientes.ver', 'Ver Clientes', 'Puede ver clientes', 'clientes'),
  ('clientes.crear', 'Crear Clientes', 'Puede crear nuevos clientes', 'clientes'),
  ('clientes.editar', 'Editar Clientes', 'Puede modificar clientes', 'clientes'),
  ('clientes.eliminar', 'Eliminar Clientes', 'Puede eliminar clientes', 'clientes'),

  -- Configuración
  ('config.ver', 'Ver Configuración', 'Puede ver la configuración del sistema', 'configuracion'),
  ('config.editar', 'Editar Configuración', 'Puede modificar la configuración', 'configuracion'),
  ('config.gestionar_sistema', 'Gestionar Sistema', 'Puede realizar tareas de administración del sistema', 'configuracion'),

  -- Reportes
  ('reportes.ver', 'Ver Reportes', 'Puede ver reportes y estadísticas', 'reportes'),
  ('reportes.exportar', 'Exportar Reportes', 'Puede exportar reportes', 'reportes'),
  ('reportes.gestionar', 'Gestionar Reportes', 'Puede crear y modificar reportes', 'reportes')
ON CONFLICT (codigo) DO NOTHING;

-- =========================
-- Asignar permisos a roles
-- =========================

DO $$
BEGIN
  -- Super Admin (id=1): TODOS los permisos
  INSERT INTO roles_permisos (rol_id, permiso_id)
  SELECT 1, id FROM permisos
  ON CONFLICT DO NOTHING;

  -- Admin (id=2): Todos los permisos
  INSERT INTO roles_permisos (rol_id, permiso_id)
  SELECT 2, id FROM permisos
  ON CONFLICT DO NOTHING;

  -- Editor (id=3): Gestión de contenido (sin eliminar)
  INSERT INTO roles_permisos (rol_id, permiso_id)
  SELECT 3, id FROM permisos
  WHERE categoria IN ('libros', 'pedidos', 'facturas', 'clientes', 'reportes')
    AND codigo NOT LIKE '%.eliminar'
  ON CONFLICT DO NOTHING;

  -- Visualizador (id=4): Solo ver
  INSERT INTO roles_permisos (rol_id, permiso_id)
  SELECT 4, id FROM permisos
  WHERE codigo LIKE '%.ver'
  ON CONFLICT DO NOTHING;
END $$;

-- =========================
-- Migrar usuarios existentes al nuevo sistema
-- =========================

-- Crear entradas en usuarios_roles para usuarios existentes
INSERT INTO usuarios_roles (user_id, rol_id, asignado_por, activo, notas)
SELECT
  u.auth_user_id,
  u.rol_id,
  u.auth_user_id,
  true,
  'Migrado automáticamente del sistema anterior'
FROM usuarios u
WHERE u.auth_user_id IS NOT NULL
ON CONFLICT (user_id, rol_id) DO NOTHING;

-- =========================
-- Row Level Security
-- =========================

ALTER TABLE permisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles_permisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_roles ENABLE ROW LEVEL SECURITY;

-- Políticas para permisos (solo lectura)
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver permisos" ON permisos;
CREATE POLICY "Usuarios autenticados pueden ver permisos"
  ON permisos FOR SELECT
  TO authenticated
  USING (true);

-- Políticas para roles_permisos (solo lectura)
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver roles_permisos" ON roles_permisos;
CREATE POLICY "Usuarios autenticados pueden ver roles_permisos"
  ON roles_permisos FOR SELECT
  TO authenticated
  USING (true);

-- Políticas para usuarios_roles
DROP POLICY IF EXISTS "Usuarios pueden ver sus propios roles avanzados" ON usuarios_roles;
CREATE POLICY "Usuarios pueden ver sus propios roles avanzados"
  ON usuarios_roles FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.auth_user_id = auth.uid() AND u.rol_id IN (1, 2)
    )
  );

DROP POLICY IF EXISTS "Solo admins pueden asignar roles avanzados" ON usuarios_roles;
CREATE POLICY "Solo admins pueden asignar roles avanzados"
  ON usuarios_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.auth_user_id = auth.uid() AND u.rol_id IN (1, 2)
    )
  );

DROP POLICY IF EXISTS "Solo admins pueden actualizar roles avanzados" ON usuarios_roles;
CREATE POLICY "Solo admins pueden actualizar roles avanzados"
  ON usuarios_roles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.auth_user_id = auth.uid() AND u.rol_id IN (1, 2)
    )
  );

-- Actualizar política de roles existente para permitir vista a todos
DROP POLICY IF EXISTS "Admin can view roles" ON roles;
CREATE POLICY "Admin can view roles" ON roles FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Solo admins pueden modificar roles" ON roles;
CREATE POLICY "Solo admins pueden modificar roles" ON roles
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios u
    WHERE u.auth_user_id = auth.uid() AND u.rol_id IN (1, 2)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios u
    WHERE u.auth_user_id = auth.uid() AND u.rol_id IN (1, 2)
  )
);

-- =========================
-- Funciones auxiliares
-- =========================

-- Función para obtener permisos de un usuario
CREATE OR REPLACE FUNCTION obtener_permisos_usuario(usuario_id uuid)
RETURNS TABLE (
  permiso_codigo text,
  permiso_nombre text,
  categoria text
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.codigo, p.nombre, p.categoria
  FROM permisos p
  JOIN roles_permisos rp ON p.id = rp.permiso_id
  JOIN usuarios_roles ur ON rp.rol_id = ur.rol_id
  WHERE ur.user_id = usuario_id
    AND ur.activo = true
  UNION
  SELECT DISTINCT p.codigo, p.nombre, p.categoria
  FROM permisos p
  JOIN roles_permisos rp ON p.id = rp.permiso_id
  JOIN usuarios u ON rp.rol_id = u.rol_id
  WHERE u.auth_user_id = usuario_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si un usuario tiene un permiso específico
CREATE OR REPLACE FUNCTION tiene_permiso(usuario_id uuid, permiso_codigo text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM permisos p
    JOIN roles_permisos rp ON p.id = rp.permiso_id
    JOIN usuarios_roles ur ON rp.rol_id = ur.rol_id
    WHERE ur.user_id = usuario_id
      AND p.codigo = permiso_codigo
      AND ur.activo = true
  ) OR EXISTS (
    SELECT 1
    FROM permisos p
    JOIN roles_permisos rp ON p.id = rp.permiso_id
    JOIN usuarios u ON rp.rol_id = u.rol_id
    WHERE u.auth_user_id = usuario_id
      AND p.codigo = permiso_codigo
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener el rol principal de un usuario
CREATE OR REPLACE FUNCTION obtener_rol_principal(usuario_id uuid)
RETURNS TABLE (
  rol_nombre text,
  rol_display_name text,
  nivel_jerarquia integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT r.nombre::text, r.display_name::text, r.nivel_jerarquia
  FROM roles r
  JOIN usuarios_roles ur ON r.id = ur.rol_id
  WHERE ur.user_id = usuario_id
    AND ur.activo = true
  ORDER BY r.nivel_jerarquia ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT r.nombre::text, r.display_name::text, r.nivel_jerarquia
    FROM roles r
    JOIN usuarios u ON r.id = u.rol_id
    WHERE u.auth_user_id = usuario_id
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener roles de un usuario (compatible con ambos sistemas)
CREATE OR REPLACE FUNCTION obtener_roles_usuario(usuario_id uuid)
RETURNS TABLE (
  id integer,
  nombre text,
  display_name text,
  descripcion text,
  nivel_jerarquia integer,
  activo boolean,
  es_sistema boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT r.id, r.nombre::text, r.display_name::text, r.descripcion::text,
         r.nivel_jerarquia, r.activo, r.es_sistema
  FROM roles r
  JOIN usuarios_roles ur ON r.id = ur.rol_id
  WHERE ur.user_id = usuario_id
    AND ur.activo = true
  UNION
  SELECT r.id, r.nombre::text, r.display_name::text, r.descripcion::text,
         r.nivel_jerarquia, r.activo, r.es_sistema
  FROM roles r
  JOIN usuarios u ON r.id = u.rol_id
  WHERE u.auth_user_id = usuario_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================
-- Comentarios
-- =========================

COMMENT ON TABLE permisos IS 'Permisos granulares del sistema';
COMMENT ON TABLE roles_permisos IS 'Relación entre roles y permisos';
COMMENT ON TABLE usuarios_roles IS 'Sistema avanzado de asignación de roles a usuarios';
COMMENT ON FUNCTION obtener_permisos_usuario IS 'Obtiene todos los permisos de un usuario';
COMMENT ON FUNCTION tiene_permiso IS 'Verifica si un usuario tiene un permiso específico';
COMMENT ON FUNCTION obtener_rol_principal IS 'Obtiene el rol de mayor jerarquía de un usuario';
COMMENT ON FUNCTION obtener_roles_usuario IS 'Obtiene todos los roles activos de un usuario';
