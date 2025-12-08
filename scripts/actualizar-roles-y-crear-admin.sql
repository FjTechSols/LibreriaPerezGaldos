-- ========================================
-- ACTUALIZAR ROLES Y CREAR ROL ADMIN
-- ========================================
-- Este script arregla el rol "usuario" que tiene valores NULL
-- y crea el nuevo rol "admin" con privilegios amplios
-- ========================================

-- 1. Arreglar el rol "usuario" que tiene valores NULL
UPDATE roles
SET
  display_name = 'Usuario',
  descripcion = 'Usuario básico del sistema con acceso limitado.',
  nivel_jerarquia = 999
WHERE nombre = 'usuario' AND (display_name IS NULL OR display_name = 'NULL');

-- 2. Crear el rol "admin" (Administrador) con privilegios amplios
INSERT INTO roles (nombre, display_name, descripcion, nivel_jerarquia, activo, es_sistema)
VALUES (
  'admin',
  'Administrador',
  'Control casi total del sistema. Puede gestionar usuarios, libros, pedidos y facturas.',
  2,
  true,
  true
)
ON CONFLICT (nombre) DO UPDATE SET
  display_name = 'Administrador',
  descripcion = 'Control casi total del sistema. Puede gestionar usuarios, libros, pedidos y facturas.',
  nivel_jerarquia = 2,
  activo = true;

-- 3. Verificar que los roles quedaron correctos
SELECT id, nombre, display_name, descripcion, nivel_jerarquia, activo
FROM roles
ORDER BY nivel_jerarquia;
