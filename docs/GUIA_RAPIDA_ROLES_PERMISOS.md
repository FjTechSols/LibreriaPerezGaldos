# Guía Rápida: Sistema de Roles y Permisos

## Resumen

Se ha implementado un sistema completo de gestión de usuarios administrativos con roles y permisos granulares que **extiende** tu sistema actual sin romper nada.

## Características Principales

✅ **Mantiene compatibilidad total** con tu sistema actual (rol_id = 1 para admin)
✅ **Extiende la tabla roles existente** sin crear una nueva
✅ **4 roles predefinidos** con jerarquía (Super Admin, Admin, Editor, Visualizador)
✅ **30 permisos granulares** en 7 categorías
✅ **Interfaz completa** de gestión desde Configuración
✅ **Migración automática** de usuarios existentes

## Paso 1: Aplicar la Migración SQL

### Opción A: Desde Supabase Dashboard (Recomendado)

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Navega a **SQL Editor** (menú izquierdo)
4. Clic en **"New Query"**
5. Abre el archivo: `docs/database/MIGRACION_ROLES_PERMISOS_EXTENDIDA.sql`
6. Copia TODO el contenido
7. Pégalo en el editor SQL
8. Clic en **"Run"** o presiona `Ctrl+Enter`

### ¿Qué hace la migración?

La migración es **segura** y:
- ✅ Extiende la tabla `roles` existente con nuevos campos
- ✅ Crea tablas nuevas: `permisos`, `roles_permisos`, `usuarios_roles`
- ✅ Mantiene tu rol admin actual (id=1) y lo actualiza a "super_admin"
- ✅ Agrega 3 roles nuevos: admin(2), editor(3), visualizador(4)
- ✅ Inserta 30 permisos del sistema
- ✅ Asigna permisos automáticamente a cada rol
- ✅ Migra usuarios existentes al nuevo sistema
- ✅ Habilita RLS en todas las tablas nuevas

### Verificar que se aplicó correctamente

Ejecuta esta query en SQL Editor:

```sql
-- Verificar roles
SELECT * FROM roles ORDER BY nivel_jerarquia;

-- Verificar permisos
SELECT COUNT(*) as total_permisos FROM permisos;

-- Verificar que tienes permisos asignados
SELECT COUNT(*) as asignaciones FROM roles_permisos;
```

Deberías ver:
- 4 roles (super_admin, admin, editor, visualizador)
- 30 permisos
- Múltiples asignaciones en roles_permisos

## Paso 2: Usar el Sistema

### Acceder a la Gestión de Usuarios

1. Inicia sesión en tu aplicación
2. Ve a **Configuración** (menú)
3. Selecciona la pestaña **"Usuarios Admin"**

### Crear un Nuevo Usuario Administrativo

1. Clic en **"Crear Usuario"**
2. Completa el formulario:
   - Email del usuario
   - Contraseña (mínimo 6 caracteres)
   - Selecciona un rol
   - Opcionalmente agrega notas
3. Clic en **"Crear Usuario"**

El usuario recibirá acceso según el rol asignado.

### Roles Disponibles

| Rol | Nivel | Descripción | Uso Recomendado |
|-----|-------|-------------|-----------------|
| **Super Admin** | 1 | Control total del sistema | Propietarios, CTO |
| **Admin** | 2 | Gestión completa excepto super admins | Gerentes, encargados |
| **Editor** | 3 | Gestiona contenido (libros, pedidos, facturas) | Personal de ventas |
| **Visualizador** | 4 | Solo lectura | Consultores, auditores |

### Editar Roles de un Usuario

1. Localiza el usuario en la lista
2. Clic en el icono de **lápiz** (Editar)
3. Marca/desmarca los roles deseados
4. Clic en **"Actualizar Roles"**

**Nota:** Un usuario puede tener múltiples roles. El sistema usará automáticamente el rol de mayor jerarquía.

### Cambiar Contraseña

1. Localiza el usuario en la lista
2. Clic en el icono de **llave**
3. Ingresa la nueva contraseña
4. Confirma la contraseña
5. Clic en **"Cambiar Contraseña"**

### Eliminar un Usuario

1. Localiza el usuario en la lista
2. Clic en el icono de **papelera**
3. Confirma la eliminación

**Importante:** No puedes eliminarte a ti mismo.

## Paso 3: Usar Permisos en tu Código

### Verificar Permisos en Componentes

```typescript
import { useAuth } from '../context/AuthContext';

function MiComponente() {
  const { hasPermission, hasRole, isAdmin } = useAuth();

  // Verificar permiso específico
  if (hasPermission('libros.crear')) {
    // Mostrar botón crear libro
  }

  // Verificar rol
  if (hasRole('admin')) {
    // Contenido solo para admins
  }

  // Verificar admin (incluye super_admin y admin)
  if (isAdmin) {
    // Contenido para administradores
  }

  return <div>Tu componente</div>;
}
```

### Proteger Rutas Completas

```typescript
import { ProtectedRoute } from '../components/ProtectedRoute';

// En tu router
<Route
  path="/admin/usuarios"
  element={
    <ProtectedRoute requireAdmin>
      <GestionUsuarios />
    </ProtectedRoute>
  }
/>

// Por permiso específico
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

      {/* Solo muestra si tiene permiso */}
      <PermissionGate requirePermission="libros.crear">
        <button>Crear Libro</button>
      </PermissionGate>

      {/* Solo muestra si es admin */}
      <PermissionGate requireAdmin>
        <AdminPanel />
      </PermissionGate>
    </div>
  );
}
```

## Permisos Disponibles

### Libros
- `libros.ver` - Ver catálogo
- `libros.crear` - Agregar libros
- `libros.editar` - Modificar libros
- `libros.eliminar` - Eliminar libros
- `libros.importar` - Importación masiva

### Usuarios
- `usuarios.ver` - Ver lista de usuarios
- `usuarios.crear` - Crear usuarios
- `usuarios.editar` - Modificar usuarios
- `usuarios.eliminar` - Eliminar usuarios
- `usuarios.gestionar_roles` - Asignar roles

### Pedidos
- `pedidos.ver` - Ver pedidos
- `pedidos.crear` - Crear pedidos
- `pedidos.editar` - Modificar pedidos
- `pedidos.eliminar` - Eliminar pedidos
- `pedidos.aprobar` - Aprobar/rechazar

### Facturas
- `facturas.ver` - Ver facturas
- `facturas.crear` - Crear facturas
- `facturas.editar` - Modificar facturas
- `facturas.eliminar` - Eliminar facturas
- `facturas.exportar` - Exportar a PDF/Excel

### Clientes
- `clientes.ver` - Ver clientes
- `clientes.crear` - Crear clientes
- `clientes.editar` - Modificar clientes
- `clientes.eliminar` - Eliminar clientes

### Configuración
- `config.ver` - Ver configuración
- `config.editar` - Modificar configuración
- `config.gestionar_sistema` - Administración del sistema

### Reportes
- `reportes.ver` - Ver reportes
- `reportes.exportar` - Exportar reportes
- `reportes.gestionar` - Crear/modificar reportes

## Ejemplos de Uso Común

### Ejemplo 1: Personal de Ventas

**Rol recomendado:** Editor

Puede:
- ✅ Ver y crear libros
- ✅ Ver y crear pedidos
- ✅ Ver y crear facturas
- ✅ Ver y crear clientes
- ❌ No puede eliminar registros
- ❌ No puede gestionar usuarios

### Ejemplo 2: Encargado de Tienda

**Rol recomendado:** Admin

Puede:
- ✅ Todo lo que puede un Editor
- ✅ Eliminar libros, pedidos, facturas
- ✅ Crear otros usuarios (editores, visualizadores)
- ✅ Modificar configuración del sistema
- ❌ No puede crear otros super admins

### Ejemplo 3: Consultor Externo

**Rol recomendado:** Visualizador

Puede:
- ✅ Ver libros
- ✅ Ver pedidos y facturas
- ✅ Ver clientes
- ✅ Ver reportes
- ❌ No puede crear, editar ni eliminar nada

## Migración de Usuarios Existentes

La migración automáticamente:
- ✅ Crea entradas en `usuarios_roles` para todos tus usuarios actuales
- ✅ Mantiene sus roles originales de la tabla `usuarios`
- ✅ Agrega una nota "Migrado automáticamente del sistema anterior"

Tus usuarios existentes seguirán funcionando exactamente igual, pero ahora también tienen acceso al sistema avanzado de permisos.

## Solución de Problemas

### No veo la pestaña "Usuarios Admin"

**Causa:** Tu usuario no tiene permisos de admin
**Solución:** Verifica que tu usuario tenga rol_id = 1 en la tabla usuarios

### Error al crear usuario

**Causa:** El email ya existe
**Solución:** Usa un email diferente o edita el usuario existente

### Los permisos no se actualizan

**Causa:** El usuario necesita volver a iniciar sesión
**Solución:** Cierra sesión y vuelve a iniciar

### No puedo ver todos los usuarios

**Causa:** Solo admins pueden ver todos los usuarios
**Solución:** Verifica que tu cuenta tenga rol de admin o super_admin

## Documentación Completa

Para más detalles, consulta:
- `docs/SISTEMA_ROLES_PERMISOS.md` - Documentación completa
- `docs/database/MIGRACION_ROLES_PERMISOS_EXTENDIDA.sql` - SQL de la migración

## Archivos Modificados/Creados

### Nuevos Archivos
- `src/services/rolesService.ts` - Servicio de gestión de roles
- `src/components/GestionUsuariosAdmin.tsx` - Interfaz de gestión
- `src/components/ProtectedRoute.tsx` - Protección de rutas
- `docs/database/MIGRACION_ROLES_PERMISOS_EXTENDIDA.sql` - Migración SQL

### Archivos Modificados
- `src/context/AuthContext.tsx` - Agrega funciones hasPermission, hasRole
- `src/pages/AdminSettings.tsx` - Agrega pestaña "Usuarios Admin"

## Soporte

Si tienes problemas:
1. Revisa esta guía
2. Consulta `docs/SISTEMA_ROLES_PERMISOS.md`
3. Verifica los logs en la consola del navegador
4. Revisa los logs de Supabase Dashboard

---

**Versión:** 1.0
**Fecha:** Diciembre 2024
