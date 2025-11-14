# 🧹 Limpieza de Datos para Producción

Guía para eliminar todos los datos de prueba y dejar la base de datos lista para producción.

---

## ⚠️ ADVERTENCIA IMPORTANTE

**ESTE PROCESO ELIMINA TODOS LOS DATOS:**
- ❌ Todos los libros
- ❌ Todos los pedidos
- ❌ Todas las facturas
- ❌ Todos los clientes
- ❌ Todos los carritos y listas de deseos
- ❌ Todas las ubicaciones
- ❌ Todos los autores

**SE MANTIENEN:**
- ✅ Usuarios (cuentas de usuario)
- ✅ Configuración del sistema (settings)
- ✅ Estructura de tablas y políticas RLS

---

## 🎯 ¿Cuándo Usar Esta Limpieza?

### ✅ Usa esta limpieza cuando:
- Vas a pasar de desarrollo a producción
- Quieres empezar con datos reales desde cero
- Has terminado de probar y quieres limpiar todo

### ❌ NO uses esta limpieza si:
- Ya tienes datos reales en producción
- Tienes pedidos o facturas que necesitas conservar
- No estás 100% seguro de lo que haces

---

## 📋 Pasos para Limpieza

### 1. Hacer Backup (MUY IMPORTANTE)

```bash
# En Supabase Dashboard:
1. Ve a Database → Backups
2. Click en "Create backup"
3. Espera a que se complete
4. Verifica que el backup existe
```

**NO CONTINÚES sin hacer backup primero.**

---

### 2. Aplicar Migración de Limpieza

#### Opción A: Desde Supabase Dashboard (Recomendado)

```bash
1. Ve a Supabase Dashboard
2. Click en SQL Editor
3. Abre el archivo: supabase/migrations/20251115000000_clean_production_data.sql
4. Copia todo el contenido
5. Pega en el SQL Editor
6. Click "Run"
7. Revisa el output:
   - Debe mostrar "Base de datos limpia y lista para producción"
   - Verifica que todas las tablas tienen 0 registros
```

#### Opción B: Con Supabase CLI

```bash
# 1. Linkear a tu proyecto
supabase link --project-ref TU_REF_PRODUCCION

# 2. Aplicar migración
supabase db push

# 3. Verificar
supabase db diff
```

---

### 3. Verificar la Limpieza

Ejecuta este query en SQL Editor para verificar:

```sql
SELECT
  'libros' as tabla,
  COUNT(*) as registros
FROM libros
UNION ALL
SELECT 'pedidos', COUNT(*) FROM pedidos
UNION ALL
SELECT 'facturas', COUNT(*) FROM facturas
UNION ALL
SELECT 'clientes', COUNT(*) FROM clientes
UNION ALL
SELECT 'cart', COUNT(*) FROM cart
UNION ALL
SELECT 'wishlist', COUNT(*) FROM wishlist
UNION ALL
SELECT 'ubicaciones', COUNT(*) FROM ubicaciones
UNION ALL
SELECT 'autores', COUNT(*) FROM autores;
```

**Resultado esperado:** Todas las tablas deben tener 0 registros.

---

### 4. Empezar a Agregar Datos Reales

Ahora que la base de datos está limpia, puedes empezar a agregar:

#### A. Desde el Panel de Admin:

```bash
1. Inicia sesión como admin
2. Ve al Panel de Administración
3. Empieza a agregar:
   - Ubicaciones físicas (Gestión de Ubicaciones)
   - Autores (si es necesario)
   - Libros (Gestión de Libros)
   - Clientes (Gestión de Clientes)
```

#### B. Desde SQL (Para importación masiva):

```sql
-- Ejemplo: Insertar múltiples libros
INSERT INTO libros (
  title,
  author,
  isbn,
  price,
  stock,
  category,
  description,
  cover_image
) VALUES
  ('Libro 1', 'Autor 1', '1234567890', 19.99, 10, 'Ficción', 'Descripción...', 'url'),
  ('Libro 2', 'Autor 2', '0987654321', 24.99, 5, 'No Ficción', 'Descripción...', 'url');
```

---

## 🗂️ Orden Recomendado para Agregar Datos

### 1. Ubicaciones Físicas
```
Primero crea las ubicaciones donde estarán los libros físicamente:
- Estantería A, Nivel 1
- Estantería B, Nivel 2
- Almacén principal
- etc.
```

### 2. Autores
```
Si vas a gestionar autores por separado:
- García Márquez, Gabriel
- Cervantes, Miguel de
- etc.
```

### 3. Libros
```
Agregar libros con toda su información:
- Título, autor, ISBN
- Precio, stock
- Categoría, descripción
- Imagen de portada
- Ubicación física
```

### 4. Clientes (Opcional)
```
Si tienes clientes existentes que quieres importar:
- Nombre, email
- Teléfono, dirección
- Datos fiscales (NIF/CIF)
```

---

## 📊 Campos Importantes de Libros

Al agregar libros, asegúrate de completar:

### Campos Obligatorios:
- `title` - Título del libro
- `author` - Autor
- `price` - Precio (decimal)
- `stock` - Stock disponible (entero)

### Campos Recomendados:
- `isbn` - ISBN del libro
- `category` - Categoría
- `description` - Descripción
- `cover_image` - URL de la portada
- `editorial` - Editorial
- `year` - Año de publicación
- `pages` - Número de páginas
- `language` - Idioma

### Campos Opcionales:
- `is_new` - Si es novedad (boolean)
- `on_sale` - Si está en oferta (boolean)
- `original_price` - Precio original (si está en oferta)
- `rating` - Valoración (0-5)
- `ubicacion_id` - ID de ubicación física

---

## 🔒 Datos que se Mantienen

### Usuarios
Los usuarios NO se eliminan. Esto incluye:
- Cuenta de admin
- Cuentas de empleados
- Usuarios registrados

**Razón:** Los usuarios son la base del sistema de autenticación.

### Settings
La configuración del sistema se mantiene:
- Nombre de la empresa
- Dirección, teléfono, email
- Configuración de facturación
- IVA y otros impuestos
- Configuración de moneda

**Razón:** La configuración del sistema es importante mantenerla.

---

## 🔄 Rollback (Si algo sale mal)

### Si necesitas revertir:

```bash
1. Ve a Supabase Dashboard → Database → Backups
2. Selecciona el backup que hiciste ANTES de limpiar
3. Click "Restore"
4. Confirma la restauración
5. Espera 5-10 minutos
6. Verifica que los datos volvieron
```

**Nota:** La restauración reemplaza TODA la base de datos con el backup.

---

## 📝 Checklist de Limpieza

### Antes de Empezar:
- [ ] Hacer backup de la base de datos
- [ ] Verificar que el backup se completó
- [ ] Confirmar que quieres eliminar TODOS los datos
- [ ] Asegurarte de estar en la base de datos correcta

### Durante la Limpieza:
- [ ] Aplicar migración de limpieza
- [ ] Revisar output de la migración
- [ ] Verificar que no hay errores

### Después de la Limpieza:
- [ ] Verificar que tablas están vacías
- [ ] Verificar que usuarios se mantienen
- [ ] Verificar que settings se mantienen
- [ ] Empezar a agregar datos reales

---

## 💡 Tips y Recomendaciones

### 1. Usa el Panel de Admin
La forma más fácil de agregar datos es desde el panel de administración:
- Interfaz amigable
- Validación automática
- Prevención de errores

### 2. Importación Masiva
Si tienes muchos libros para agregar:
- Prepara un archivo CSV con los datos
- Usa SQL INSERT para importación masiva
- Verifica los datos antes de importar

### 3. Imágenes de Portadas
Para las portadas de libros:
- Usa URLs de imágenes hospedadas
- Tamaño recomendado: 400x600px
- Formato: JPG o PNG
- Considera usar Supabase Storage

### 4. Prueba Primero en Dev
Antes de limpiar producción:
- Prueba el proceso en desarrollo
- Verifica que todo funciona
- Familiarízate con el proceso

---

## 🚨 Errores Comunes

### Error: "Permission denied"
```
Causa: No tienes permisos para eliminar datos
Solución: Asegúrate de estar logueado como admin o usar service_role key
```

### Error: "Foreign key constraint"
```
Causa: Intentas eliminar datos con dependencias
Solución: La migración ya maneja esto en el orden correcto
```

### Error: "Connection timeout"
```
Causa: La operación tarda mucho
Solución: Normal si hay muchos datos, espera a que termine
```

---

## 📞 Ayuda

Si tienes problemas:

1. **Revisa los logs** en Supabase Dashboard → Logs
2. **Verifica el backup** antes de hacer cualquier cosa
3. **Lee los mensajes de error** completos
4. **Consulta la documentación** de Supabase

---

## ✅ Resumen

1. **Hacer backup** (MUY IMPORTANTE)
2. **Aplicar migración** de limpieza
3. **Verificar** que las tablas están vacías
4. **Empezar a agregar** datos reales
5. **Verificar** que todo funciona

---

**Última actualización:** 2025-11-15

**Archivo de migración:** `supabase/migrations/20251115000000_clean_production_data.sql`
