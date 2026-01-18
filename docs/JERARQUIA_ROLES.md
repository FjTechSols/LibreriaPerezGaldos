# Jerarquía de Roles del Sistema

## Resumen Ejecutivo

El sistema cuenta con una jerarquía de roles que controla los permisos y capacidades de los usuarios. Cada rol tiene un nivel jerárquico y permisos específicos.

## Roles Disponibles

### 1. Super Administrador (super_admin)
- **Nivel Jerarquía**: 1 (máximo poder)
- **Color**: Rojo (#dc2626)
- **Descripción**: Control total del sistema
- **Permisos**:
  - Gestión completa de usuarios (crear, editar, eliminar cualquier usuario)
  - Gestión de roles y permisos
  - Acceso a todas las funcionalidades del sistema
  - Configuración del sistema
  - Puede eliminar a otros super admins

### 2. Administrador (admin)
- **Nivel Jerarquía**: 2
- **Color**: Naranja (#ea580c)
- **Descripción**: Control casi total del sistema
- **Permisos**:
  - Gestión de usuarios (crear, editar, eliminar)
  - NO puede eliminar super administradores
  - Gestión de libros, pedidos, facturas y clientes
  - Acceso a reportes y estadísticas
  - Configuración general
- **Restricciones**:
  - No puede eliminar usuarios con rol super_admin
  - No puede modificar configuraciones críticas del sistema

### 3. Editor (editor)
- **Nivel Jerarquía**: 3
- **Color**: Azul (#2563eb)
- **Descripción**: Gestión de contenido
- **Permisos**:
  - Gestión completa de libros (crear, editar, eliminar)
  - Gestión de pedidos y facturas
  - Gestión de clientes
  - Ver reportes
- **Restricciones**:
  - No puede gestionar usuarios
  - No puede acceder a configuraciones del sistema

### 4. Visualizador (visualizador)
- **Nivel Jerarquía**: 4
- **Color**: Verde (#16a34a)
- **Descripción**: Solo lectura
- **Permisos**:
  - Ver información de libros, pedidos y facturas
  - Ver reportes básicos
- **Restricciones**:
  - No puede crear, editar ni eliminar contenido
  - No puede gestionar usuarios
  - No puede acceder a configuraciones

### 5. Usuario (usuario)
- **Nivel Jerarquía**: 999 (mínimo poder)
- **Color**: Gris (#64748b)
- **Descripción**: Usuario básico del sistema
- **Permisos**:
  - Acceso limitado según configuración
  - Compras y pedidos propios
- **Restricciones**:
  - No tiene acceso al panel administrativo

## Reglas de Seguridad

### Eliminación de Usuarios

1. **Ningún usuario puede eliminarse a sí mismo**
   - Previene la pérdida accidental de acceso

2. **Los admin NO pueden eliminar super_admin**
   - Protege las cuentas de máximo privilegio
   - Solo super_admin puede eliminar otros super_admin

3. **Validación en Frontend y Backend**
   - El botón de eliminar no se muestra si no hay permisos
   - La edge function valida los permisos en el servidor

### Gestión de Roles

- Solo usuarios con rol admin o superior pueden gestionar usuarios
- Los roles son verificados en cada solicitud mediante edge functions
- Las políticas RLS protegen los datos a nivel de base de datos

## Pasos de Implementación

### Paso 1: Ejecutar SQL en Supabase

Ejecuta el siguiente script en el SQL Editor de Supabase:

```sql
-- Arreglar el rol "usuario" que tiene valores NULL
UPDATE roles
SET
  display_name = 'Usuario',
  descripcion = 'Usuario básico del sistema con acceso limitado.',
  nivel_jerarquia = 999
WHERE nombre = 'usuario' AND (display_name IS NULL OR display_name = 'NULL');

-- Crear el rol "admin" (Administrador) con privilegios amplios
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

-- Verificar que los roles quedaron correctos
SELECT id, nombre, display_name, descripcion, nivel_jerarquia, activo
FROM roles
ORDER BY nivel_jerarquia;
```

### Paso 2: Re-desplegar Edge Function

Debes volver a desplegar la función `admin-delete-user` en Supabase:

1. Ve al Dashboard de Supabase
2. Sección **Edge Functions**
3. Busca `admin-delete-user`
4. Haz clic en "Deploy new version"
5. Copia el contenido actualizado de `supabase/functions/admin-delete-user/index.ts`
6. Despliega

### Paso 3: Asignar Rol Admin

Para asignar el rol admin a un usuario existente:

```sql
-- Primero obtén el ID del rol admin
SELECT id FROM roles WHERE nombre = 'admin';

-- Asigna el rol al usuario (reemplaza USER_ID y ROL_ID)
INSERT INTO usuarios_roles (user_id, rol_id, asignado_por, activo)
VALUES (
  'USER_ID',  -- ID del usuario
  ROL_ID,     -- ID del rol admin obtenido arriba
  (SELECT id FROM auth.users WHERE email = 'tu-email@example.com'), -- Tu usuario
  true
)
ON CONFLICT (user_id, rol_id)
DO UPDATE SET activo = true;
```

## Casos de Uso

### Crear un Administrador

1. Como super_admin, ve a "Gestión de Usuarios"
2. Clic en "Crear Usuario"
3. Completa email y contraseña
4. Selecciona rol "Administrador"
5. El nuevo admin podrá gestionar casi todo excepto eliminar super admins

### Crear un Editor

1. Como admin o super_admin, ve a "Gestión de Usuarios"
2. Clic en "Crear Usuario"
3. Selecciona rol "Editor"
4. El editor podrá gestionar libros, pedidos y facturas

## Mantenimiento

### Verificar Roles de un Usuario

```sql
SELECT
  u.email,
  r.nombre as rol,
  r.display_name,
  r.nivel_jerarquia,
  ur.activo
FROM auth.users u
JOIN usuarios_roles ur ON ur.user_id = u.id
JOIN roles r ON r.id = ur.rol_id
WHERE u.email = 'usuario@example.com'
ORDER BY r.nivel_jerarquia;
```

### Auditoría de Cambios

```sql
-- Ver cambios recientes en roles de usuarios
SELECT
  u.email,
  r.nombre as rol,
  ur.fecha_asignacion,
  au.email as asignado_por
FROM usuarios_roles ur
JOIN auth.users u ON u.id = ur.user_id
JOIN roles r ON r.id = ur.rol_id
LEFT JOIN auth.users au ON au.id = ur.asignado_por
WHERE ur.fecha_asignacion > NOW() - INTERVAL '7 days'
ORDER BY ur.fecha_asignacion DESC;
```
