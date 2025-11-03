# 📋 Instrucciones para Aplicar Migraciones de Supabase

## ⚠️ Problemas Actuales

### **1. Tabla Settings Faltante**
La aplicación está intentando acceder a la tabla `settings` que **no existe** en tu base de datos de Supabase.

**Error:** `Could not find the table 'public.settings' in the schema cache`

### **2. Problemas de Seguridad en Funciones (CRÍTICO) 🔒**
Supabase reporta **5 funciones** con vulnerabilidad de seguridad:

```
⚠️  Function 'public.update_updated_at_column' has a role mutable search_path
⚠️  Function 'public.update_clientes_updated_at' has a role mutable search_path
⚠️  Function 'public.generar_numero_factura' has a role mutable search_path
⚠️  Function 'public.calcular_totales_pedido' has a role mutable search_path
⚠️  Function 'public.update_settings_updated_at' has a role mutable search_path
```

**Riesgo:** Estas funciones son vulnerables a ataques de "search_path manipulation" donde un atacante podría crear objetos maliciosos en su propio schema.

---

## ✅ Solución: Aplicar las Migraciones Manualmente

**IMPORTANTE:** Debes aplicar **DOS migraciones** en este orden:

### **Paso 1: Acceder al SQL Editor de Supabase**

1. Ve a tu dashboard de Supabase: https://weaihscsaqxadxjgsfbt.supabase.co
2. Inicia sesión con tus credenciales
3. En el menú lateral izquierdo, haz clic en **"SQL Editor"**

### **Paso 2: Corregir Funciones de Seguridad (PRIMERO) 🔒**

1. Abre el archivo: `supabase/migrations/20251010000000_fix_function_security.sql`
2. **Copia TODO el contenido** del archivo
3. En el SQL Editor de Supabase:
   - Pega el contenido completo en el editor
   - Haz clic en el botón **"RUN"** (o presiona `Ctrl+Enter`)
4. Verifica que no haya errores
5. Deberías ver: `Success. No rows returned`

**✅ Esto corrige las 5 vulnerabilidades de seguridad**

### **Paso 3: Crear Tabla Settings**

1. Abre el archivo: `supabase/migrations/20251008000000_create_settings_table.sql`
2. **Copia TODO el contenido** del archivo
3. En el SQL Editor de Supabase:
   - Pega el contenido completo en el editor
   - Haz clic en el botón **"RUN"** (o presiona `Ctrl+Enter`)
4. Verifica que no haya errores
5. Deberías ver: `Success. No rows returned`

### **Paso 4: Verificar Correcciones**

#### **A. Verificar funciones corregidas:**

Ejecuta esta consulta para verificar que las funciones ahora tienen `SECURITY DEFINER`:

```sql
SELECT
    routine_name,
    security_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'update_updated_at_column',
    'update_clientes_updated_at',
    'generar_numero_factura',
    'calcular_totales_pedido',
    'update_settings_updated_at'
);
```

Deberías ver `security_type = 'DEFINER'` en todas las funciones.

#### **B. Verificar tabla settings:**

Ejecuta esta consulta para verificar que la tabla se creó correctamente:

```sql
SELECT * FROM settings;
```

Deberías ver aproximadamente 30 filas con configuraciones por defecto.

---

## 📊 ¿Qué Hace Esta Migración?

### **Crea la Tabla `settings`:**
- Almacena configuraciones globales de la aplicación
- Datos de la empresa (nombre, dirección, teléfono, etc.)
- Configuración de facturación (moneda, IVA, prefijos)
- Configuración de envíos (costes, zonas, tiempos)
- Configuración del sistema (paginación, modo mantenimiento)
- Configuración de seguridad (timeouts, intentos de login)

### **Implementa Seguridad (RLS):**
- ✅ Usuarios autenticados pueden **leer** configuraciones
- ✅ Solo administradores pueden **actualizar** configuraciones
- ✅ Solo administradores pueden **insertar** configuraciones

### **Inserta Datos Por Defecto:**
```
Empresa: Perez Galdos S.L.
Moneda: EUR (€)
IVA: 21%
Envío estándar: 5.99€
Envío gratis desde: 50€
```

---

## 🔍 Verificar Otras Tablas

Ejecuta esta consulta para ver todas las tablas en tu base de datos:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

### **Tablas Requeridas:**

- ✅ `auditoria` - Registro de cambios
- ✅ `autores` - Autores de libros
- ✅ `cart` - Carritos de compra
- ✅ `clientes` - Clientes de la librería
- ✅ `editoriales` - Editoriales
- ✅ `envios` - Información de envíos
- ✅ `facturas` - Facturas emitidas
- ✅ `factura_items` - Líneas de facturas
- ✅ `invoices` - Sistema de invoices (alternativo)
- ✅ `invoice_items` - Items de invoices
- ✅ `libros` - Catálogo de libros
- ✅ `pedidos` - Pedidos de clientes
- ✅ `pedido_detalles` - Líneas de pedidos
- ⚠️  `settings` - **FALTA: Aplicar migración**
- ✅ `usuarios` - Usuarios del sistema
- ✅ `wishlist` - Lista de deseos

---

## 🚀 Después de Aplicar la Migración

1. **Recarga la aplicación** en el navegador (`Ctrl+F5` o `Cmd+Shift+R`)
2. Verifica en la consola del navegador:
   - ✅ Ya no deberías ver el error de `settings`
   - ✅ Deberías ver: `✅ Configuraciones cargadas desde Supabase: 30 settings`

3. **Ve a Admin Settings** para personalizar:
   - Datos de tu empresa
   - Configuración de moneda
   - Configuración de envíos
   - Configuración del sistema

---

## 💡 Mientras Tanto: La App Funciona

**NOTA IMPORTANTE:** La aplicación ya está preparada para funcionar **sin la tabla settings**.

Si no aplicas la migración inmediatamente:
- ✅ La app usará configuraciones por defecto
- ✅ Todas las funciones funcionarán normalmente
- ⚠️  No podrás guardar cambios en configuraciones desde Admin Settings
- ⚠️  Verás un warning en consola indicando que la tabla no existe

---

## 🐛 Si Hay Problemas

### **Error: "relation already exists"**
La tabla ya existe. No hagas nada.

### **Error: "permission denied"**
Verifica que tu usuario tenga permisos de administrador en Supabase.

### **Error: "usuarios table not found"**
Necesitas aplicar primero las migraciones anteriores:
```
20251001191609_create_complete_bookstore_schema.sql
```

---

## 📞 Necesitas Ayuda?

Si encuentras algún problema:
1. Copia el error completo
2. Verifica que hayas copiado **TODO** el contenido del archivo SQL
3. Asegúrate de estar conectado a la base de datos correcta
4. Revisa los logs del SQL Editor de Supabase

---

## ✨ Resumen Rápido

```bash
1. Abre Supabase → SQL Editor
2. Copia: supabase/migrations/20251008000000_create_settings_table.sql
3. Pega en el editor
4. Click "RUN"
5. Verifica: SELECT * FROM settings;
6. Recarga la app
```

¡Listo! 🎉
