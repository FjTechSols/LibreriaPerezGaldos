# Sistema de Roles y Permisos

Documentación completa del sistema de control de acceso basado en roles (RBAC) para usuarios administrativos.

## Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Estructura de la Base de Datos](#estructura-de-la-base-de-datos)
3. [Roles Predefinidos](#roles-predefinidos)
4. [Permisos del Sistema](#permisos-del-sistema)
5. [Gestión de Usuarios](#gestión-de-usuarios)
6. [Uso en el Código](#uso-en-el-código)
7. [Aplicar la Migración](#aplicar-la-migración)
8. [Seguridad](#seguridad)

## Visión General

El sistema implementa un control de acceso basado en roles (RBAC) que permite:

- **Jerarquía de roles**: Super Admin > Admin > Editor > Visualizador
- **Permisos granulares**: Control fino sobre qué puede hacer cada usuario
- **Asignación flexible**: Los usuarios pueden tener múltiples roles
- **Interfaz de gestión**: Panel completo para administrar usuarios y roles
- **Seguridad robusta**: RLS (Row Level Security) en todas las tablas

## Estructura de la Base de Datos

### Tabla: `roles`

Define los roles disponibles en el sistema.

```sql
CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text UNIQUE NOT NULL,
  display_name text NOT NULL,
  descripcion text,
  nivel_jerarquia integer NOT NULL DEFAULT 999,
  activo boolean DEFAULT true,
  es_sistema boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Tabla: `permisos`

Define los permisos específicos del sistema.

```sql
CREATE TABLE permisos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  categoria text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

### Tabla: `roles_permisos`

Relación muchos a muchos entre roles y permisos.

```sql
CREATE TABLE roles_permisos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rol_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permiso_id uuid NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(rol_id, permiso_id)
);
```

### Tabla: `usuarios_roles`

Asigna roles a usuarios específicos.

```sql
CREATE TABLE usuarios_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rol_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  asignado_por uuid REFERENCES auth.users(id),
  fecha_asignacion timestamptz DEFAULT now(),
  activo boolean DEFAULT true,
  notas text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, rol_id)
);
```

## Roles Predefinidos

### 1. Super Administrador (`super_admin`)

- **Jerarquía**: Nivel 1 (más alto)
- **Descripción**: Control total del sistema
- **Permisos**: TODOS los permisos del sistema
- **Capacidades especiales**:
  - Crear otros super administradores
  - Gestionar todos los roles y permisos
  - Modificar configuración crítica del sistema
  - Acceso a todas las funcionalidades

**Uso**: Propietarios del negocio, CTO, administradores principales.

### 2. Administrador (`admin`)

- **Jerarquía**: Nivel 2
- **Descripción**: Gestión completa excepto super admins
- **Permisos**: Todos excepto crear super_admin
- **Capacidades**:
  - Gestionar libros, pedidos, facturas, clientes
  - Crear y modificar editores y visualizadores
  - Acceso a configuración general
  - Exportar reportes

**Uso**: Gerentes, encargados de tienda, personal de confianza.

### 3. Editor (`editor`)

- **Jerarquía**: Nivel 3
- **Descripción**: Gestión de contenido
- **Permisos**: Crear y editar (sin eliminar)
- **Capacidades**:
  - Gestionar libros (crear, editar)
  - Gestionar pedidos y facturas
  - Gestionar clientes
  - Ver reportes

**Uso**: Personal de ventas, gestores de inventario.

### 4. Visualizador (`visualizador`)

- **Jerarquía**: Nivel 4
- **Descripción**: Solo lectura
- **Permisos**: Solo ver información
- **Capacidades**:
  - Ver catálogo de libros
  - Ver pedidos y facturas
  - Ver clientes
  - Ver reportes

**Uso**: Consultores, auditores, observadores.

## Permisos del Sistema

### Categorías de Permisos

#### Libros
- `libros.ver` - Ver catálogo de libros
- `libros.crear` - Agregar nuevos libros
- `libros.editar` - Modificar libros existentes
- `libros.eliminar` - Eliminar libros
- `libros.importar` - Importar libros masivamente

#### Usuarios
- `usuarios.ver` - Ver lista de usuarios
- `usuarios.crear` - Crear nuevos usuarios
- `usuarios.editar` - Modificar usuarios
- `usuarios.eliminar` - Eliminar usuarios
- `usuarios.gestionar_roles` - Asignar roles

#### Pedidos
- `pedidos.ver` - Ver pedidos
- `pedidos.crear` - Crear nuevos pedidos
- `pedidos.editar` - Modificar pedidos
- `pedidos.eliminar` - Eliminar pedidos
- `pedidos.aprobar` - Aprobar/rechazar pedidos

#### Facturas
- `facturas.ver` - Ver facturas
- `facturas.crear` - Crear nuevas facturas
- `facturas.editar` - Modificar facturas
- `facturas.eliminar` - Eliminar facturas
- `facturas.exportar` - Exportar facturas

#### Clientes
- `clientes.ver` - Ver clientes
- `clientes.crear` - Crear nuevos clientes
- `clientes.editar` - Modificar clientes
- `clientes.eliminar` - Eliminar clientes

#### Configuración
- `config.ver` - Ver configuración
- `config.editar` - Modificar configuración
- `config.gestionar_sistema` - Administrar sistema

#### Reportes
- `reportes.ver` - Ver reportes
- `reportes.exportar` - Exportar reportes
- `reportes.gestionar` - Crear/modificar reportes

## Gestión de Usuarios

### Acceder a la Gestión

1. Iniciar sesión como Super Admin o Admin
2. Ir a **Configuración** en el menú
3. Seleccionar la pestaña **"Usuarios Admin"**

### Crear un Nuevo Usuario Administrativo

1. Clic en **"Crear Usuario"**
2. Completar el formulario:
   - **Email**: Email del usuario (único)
   - **Contraseña**: Mínimo 6 caracteres
   - **Confirmar Contraseña**: Debe coincidir
   - **Rol**: Seleccionar rol apropiado
   - **Notas**: (Opcional) Información adicional
3. Clic en **"Crear Usuario"**

### Editar Roles de un Usuario

1. Localizar el usuario en la lista
2. Clic en el botón de **Editar** (icono lápiz)
3. Seleccionar/deseleccionar roles
4. Clic en **"Actualizar Roles"**

### Cambiar Contraseña

1. Localizar el usuario en la lista
2. Clic en el botón de **Llave** (icono llave)
3. Ingresar nueva contraseña
4. Confirmar contraseña
5. Clic en **"Cambiar Contraseña"**

### Eliminar un Usuario

1. Localizar el usuario en la lista
2. Clic en el botón de **Eliminar** (icono papelera)
3. Confirmar la eliminación

**NOTA**: No puedes eliminarte a ti mismo.

## Uso en el Código

### Verificar Permisos en Componentes

```typescript
import { useAuth } from '../context/AuthContext';

function MiComponente() {
  const { hasPermission, hasRole, isAdmin, isSuperAdmin } = useAuth();

  // Verificar permiso específico
  if (!hasPermission('libros.crear')) {
    return <div>No tienes permiso para crear libros</div>;
  }

  // Verificar rol
  if (!hasRole('admin')) {
    return <div>Solo administradores</div>;
  }

  // Verificar admin
  if (!isAdmin) {
    return <div>Acceso solo para administradores</div>;
  }

  return <div>Contenido protegido</div>;
}
```

### Proteger Rutas

```typescript
import { ProtectedRoute } from '../components/ProtectedRoute';

<Route
  path="/admin"
  element={
    <ProtectedRoute requireAdmin>
      <AdminDashboard />
    </ProtectedRoute>
  }
/>

<Route
  path="/super-admin"
  element={
    <ProtectedRoute requireSuperAdmin>
      <SuperAdminPanel />
    </ProtectedRoute>
  }
/>

<Route
  path="/libros/crear"
  element={
    <ProtectedRoute requirePermission="libros.crear">
      <CrearLibro />
    </ProtectedRoute>
  }
/>
```

### Mostrar/Ocultar Elementos

```typescript
import { PermissionGate } from '../components/ProtectedRoute';

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>

      <PermissionGate requirePermission="libros.crear">
        <button>Crear Libro</button>
      </PermissionGate>

      <PermissionGate requireRole="admin">
        <AdminPanel />
      </PermissionGate>

      <PermissionGate requirePermission="usuarios.ver">
        <UsuariosList />
      </PermissionGate>
    </div>
  );
}
```

### Servicios

Los servicios en `rolesService.ts` proporcionan funciones para:

```typescript
import {
  obtenerTodosLosRoles,
  obtenerPermisosDeUsuario,
  asignarRolAUsuario,
  tienePermiso,
  obtenerRolPrincipal
} from '../services/rolesService';

// Obtener todos los roles
const roles = await obtenerTodosLosRoles();

// Obtener permisos de un usuario
const permisos = await obtenerPermisosDeUsuario(userId);

// Verificar si un usuario tiene un permiso
const puede = await tienePermiso(userId, 'libros.crear');

// Asignar rol a usuario
await asignarRolAUsuario(userId, rolId, asignadoPor);

// Obtener rol principal (mayor jerarquía)
const rolPrincipal = await obtenerRolPrincipal(userId);
```

## Aplicar la Migración

### Paso 1: Crear el Archivo de Migración

La migración ya está documentada en este archivo. Copia el contenido SQL del apartado "Estructura de la Base de Datos" completo.

### Paso 2: Aplicar en Supabase

#### Opción A: Desde el Dashboard de Supabase

1. Ir a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navegar a **SQL Editor**
3. Crear una nueva query
4. Copiar y pegar el contenido completo de la migración
5. Ejecutar la query

#### Opción B: Desde CLI (si tienes Supabase CLI)

```bash
# Crear archivo de migración
supabase migration new create_roles_permissions_system

# Copiar el contenido SQL en el archivo generado

# Aplicar migración
supabase db push
```

### Paso 3: Verificar la Instalación

Ejecuta esta query para verificar:

```sql
SELECT COUNT(*) as roles FROM roles;
SELECT COUNT(*) as permisos FROM permisos;
SELECT COUNT(*) as roles_permisos FROM roles_permisos;
```

Deberías ver:
- 4 roles
- 30 permisos
- Múltiples asignaciones de roles_permisos

### Paso 4: Crear tu Primer Super Admin

Después de aplicar la migración, asigna el rol de super_admin a tu usuario:

```sql
-- Reemplaza 'TU_USER_ID' con tu ID de usuario de auth.users
INSERT INTO usuarios_roles (user_id, rol_id, asignado_por, activo)
SELECT
  'TU_USER_ID',
  id,
  'TU_USER_ID',
  true
FROM roles
WHERE nombre = 'super_admin';
```

O usa el script proporcionado:

```bash
node scripts/crear-admin-completo.mjs
```

## Seguridad

### Row Level Security (RLS)

Todas las tablas tienen RLS habilitado:

- **roles**: Visible para todos, modificable solo por super_admin
- **permisos**: Solo lectura para usuarios autenticados
- **roles_permisos**: Solo lectura para usuarios autenticados
- **usuarios_roles**: Usuarios ven sus roles, admins ven todos

### Funciones de Seguridad

El sistema incluye funciones SQL seguras:

```sql
-- Obtener permisos de un usuario
SELECT * FROM obtener_permisos_usuario('user-uuid');

-- Verificar permiso específico
SELECT tiene_permiso('user-uuid', 'libros.crear');

-- Obtener rol principal
SELECT * FROM obtener_rol_principal('user-uuid');
```

### Restricciones de Jerarquía

- Solo super_admin puede crear otros super_admin
- Admins pueden gestionar usuarios de nivel inferior
- Los usuarios no pueden modificar sus propios roles
- Los roles del sistema no se pueden eliminar

### Auditoría

Todas las asignaciones de roles incluyen:
- Quién asignó el rol (`asignado_por`)
- Cuándo se asignó (`fecha_asignacion`)
- Notas opcionales sobre la asignación
- Estado activo/inactivo

## Mejores Prácticas

### 1. Principio de Menor Privilegio

Asigna solo los permisos necesarios. Es mejor dar permisos incrementalmente que tener que revocarlos.

### 2. Auditoría Regular

Revisa periódicamente:
- Quién tiene acceso de super_admin
- Usuarios inactivos con roles activos
- Permisos que ya no se necesitan

### 3. Documentar Asignaciones

Usa el campo `notas` al asignar roles:

```typescript
await asignarRolAUsuario(
  userId,
  rolId,
  asignadoPor,
  "Asignado para gestión de inventario durante vacaciones de Juan"
);
```

### 4. Rotación de Super Admins

Limita el número de super_admin a 2-3 personas de máxima confianza.

### 5. Testing

Prueba siempre con un usuario de cada rol para verificar que los permisos funcionan correctamente.

## Troubleshooting

### El usuario no puede ver nada

**Causa**: No tiene roles asignados
**Solución**: Asignar al menos rol de visualizador

### Error "No tienes permiso"

**Causa**: El rol no tiene el permiso necesario
**Solución**: Verificar los permisos del rol y asignar si es necesario

### No puedo crear super_admin

**Causa**: Solo super_admin puede crear otros super_admin
**Solución**: Usar la query SQL directa en Supabase Dashboard

### Los cambios de roles no se reflejan

**Causa**: El usuario necesita volver a iniciar sesión
**Solución**: Cerrar sesión y volver a iniciar

## Mantenimiento

### Agregar un Nuevo Permiso

```sql
INSERT INTO permisos (codigo, nombre, descripcion, categoria)
VALUES ('nueva_funcionalidad.crear', 'Crear Nueva Funcionalidad', 'Puede crear elementos de la nueva funcionalidad', 'nueva_categoria');

-- Asignar a roles apropiados
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'admin'
  AND p.codigo = 'nueva_funcionalidad.crear';
```

### Crear un Nuevo Rol

```sql
INSERT INTO roles (nombre, display_name, descripcion, nivel_jerarquia)
VALUES ('nuevo_rol', 'Nuevo Rol', 'Descripción del nuevo rol', 5);

-- Asignar permisos
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'nuevo_rol'
  AND p.categoria IN ('libros', 'pedidos');
```

## Soporte

Para problemas o preguntas sobre el sistema de roles:

1. Revisa esta documentación
2. Verifica los logs de la consola del navegador
3. Consulta los logs de Supabase
4. Revisa las políticas RLS en Supabase Dashboard

## Resumen de Comandos Útiles

```bash
# Ver roles de un usuario
SELECT r.* FROM roles r
JOIN usuarios_roles ur ON r.id = ur.rol_id
WHERE ur.user_id = 'USER_UUID' AND ur.activo = true;

# Ver permisos de un usuario
SELECT * FROM obtener_permisos_usuario('USER_UUID');

# Listar todos los super admins
SELECT u.email, ur.fecha_asignacion
FROM auth.users u
JOIN usuarios_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.rol_id = r.id
WHERE r.nombre = 'super_admin' AND ur.activo = true;

# Revocar rol
UPDATE usuarios_roles
SET activo = false
WHERE user_id = 'USER_UUID' AND rol_id = 'ROL_UUID';
```

---

**Versión**: 1.0
**Última actualización**: Diciembre 2024
