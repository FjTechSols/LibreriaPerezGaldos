-- ============================================================
-- SOLUCIÓN: Crear usuario fjtechsols@gmail.com con rol admin
-- ============================================================

-- PASO 1: Verificar que el rol admin existe
SELECT 
  'ROLES DISPONIBLES' as diagnostico,
  id,
  nombre,
  display_name,
  nivel_jerarquia,
  descripcion
FROM roles
ORDER BY nivel_jerarquia DESC;

-- PASO 2: Verificar si el usuario YA existe en la tabla usuarios
SELECT 
  'USUARIO ACTUAL EN TABLA' as diagnostico,
  u.id,
  u.auth_user_id,
  u.username,
  u.email,
  u.activo,
  r.nombre as rol_nombre,
  r.display_name as rol_display
FROM usuarios u
LEFT JOIN roles r ON u.rol_id = r.id
WHERE u.auth_user_id = '11390019-f7fc-4046-abe4-a55150e52392'
   OR u.email = 'fjtechsols@gmail.com';

-- PASO 3: INSERTAR o ACTUALIZAR el usuario con rol admin
-- Usamos ON CONFLICT para que si existe, lo actualice
INSERT INTO usuarios (
  auth_user_id, 
  username, 
  email, 
  rol_id, 
  activo
)
SELECT 
  '11390019-f7fc-4046-abe4-a55150e52392'::uuid,
  'fjtechsols',
  'fjtechsols@gmail.com',
  (SELECT id FROM roles WHERE nombre = 'admin' LIMIT 1),
  true
ON CONFLICT (auth_user_id) 
DO UPDATE SET
  rol_id = (SELECT id FROM roles WHERE nombre = 'admin' LIMIT 1),
  activo = true,
  updated_at = now()
RETURNING 
  id,
  auth_user_id,
  username,
  email,
  rol_id,
  activo;

-- PASO 4: VERIFICAR que el usuario fue creado correctamente
SELECT 
  'USUARIO CREADO/ACTUALIZADO' as diagnostico,
  u.id,
  u.auth_user_id,
  u.username,
  u.email,
  u.activo,
  r.nombre as rol_nombre,
  r.display_name as rol_display,
  r.nivel_jerarquia
FROM usuarios u
INNER JOIN roles r ON u.rol_id = r.id
WHERE u.auth_user_id = '11390019-f7fc-4046-abe4-a55150e52392';

-- PASO 5: Ver TODOS los usuarios para comparar
SELECT 
  'TODOS LOS USUARIOS' as diagnostico,
  u.id,
  u.auth_user_id,
  u.username,
  u.email,
  u.activo,
  r.nombre as rol_nombre
FROM usuarios u
LEFT JOIN roles r ON u.rol_id = r.id
ORDER BY u.created_at DESC;

-- PASO 6: Verificar permisos del usuario usando su auth_user_id directamente
-- Nota: Esta consulta simula lo que obtener_permisos_usuario() haría
SELECT 
  'PERMISOS DEL USUARIO' as diagnostico,
  u.username,
  u.email,
  r.nombre as rol_nombre,
  r.display_name,
  r.nivel_jerarquia,
  rp.permiso_id,
  p.nombre as permiso_nombre,
  p.descripcion as permiso_descripcion
FROM usuarios u
INNER JOIN roles r ON u.rol_id = r.id
INNER JOIN roles_permisos rp ON r.id = rp.rol_id
INNER JOIN permisos p ON rp.permiso_id = p.id
WHERE u.auth_user_id = '11390019-f7fc-4046-abe4-a55150e52392'
ORDER BY p.id;

-- PASO 7: Verificar las funciones de verificación de roles
-- Creamos consultas manuales que simulan las funciones
SELECT 
  'VERIFICACIÓN ROLES MANUAL' as diagnostico,
  CASE 
    WHEN r.nombre = 'super_admin' THEN true
    ELSE false
  END as es_super_admin,
  CASE 
    WHEN r.nombre IN ('super_admin', 'admin') THEN true
    ELSE false
  END as es_admin,
  CASE 
    WHEN r.nombre IN ('super_admin', 'admin', 'editor') THEN true
    ELSE false
  END as es_editor,
  CASE 
    WHEN r.nombre IN ('super_admin', 'admin', 'editor') THEN true
    ELSE false
  END as puede_gestionar_libros,
  CASE 
    WHEN r.nombre IN ('super_admin', 'admin') THEN true
    ELSE false
  END as puede_gestionar_usuarios
FROM usuarios u
INNER JOIN roles r ON u.rol_id = r.id
WHERE u.auth_user_id = '11390019-f7fc-4046-abe4-a55150e52392';
