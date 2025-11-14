# Gestión de Libros Especiales

## Visión General

El sistema de gestión de libros ahora incluye opciones especiales para destacar libros, marcarlos como nuevos o ponerlos en oferta. Estas opciones permiten controlar cómo se presentan los libros a los usuarios en el sitio web.

## Opciones Disponibles

### 📌 Libro Destacado (Featured)
- **Propósito**: Resaltar libros importantes en secciones destacadas del sitio
- **Uso**: Marcar libros que quieres promover o que son populares
- **Visualización**: Se muestra con icono 📌 en color dorado
- **Base de datos**: Campo `destacado` (BOOLEAN)

### ✨ Libro Nuevo (New)
- **Propósito**: Indicar que el libro es una adquisición reciente
- **Uso**: Marcar libros recientemente añadidos al inventario
- **Visualización**: Se muestra con icono ✨ en color verde
- **Base de datos**: Campo `es_nuevo` (BOOLEAN)

### 🏷️ En Oferta (On Sale)
- **Propósito**: Indicar que el libro tiene un descuento especial
- **Uso**: Marcar libros con precio reducido
- **Visualización**: Se muestra con icono 🏷️ en color rojo
- **Campos relacionados**:
  - `en_oferta` (BOOLEAN): Indica si está en oferta
  - `precio_original` (DECIMAL): Precio antes del descuento
  - `precio` (DECIMAL): Precio actual con descuento

## Cómo Usar en AdminDashboard

### Al Crear un Libro Nuevo

1. Completa los campos básicos (título, autor, editorial, ISBN, precio, etc.)
2. En la sección **"Opciones Especiales"**, marca las opciones que apliquen:
   - ✅ **Libro Destacado**: Si quieres que aparezca en sección destacados
   - ✅ **Libro Nuevo**: Si es una adquisición reciente
   - ✅ **En Oferta**: Si tiene un descuento
3. Si marcas **"En Oferta"**, aparecerá un campo adicional:
   - **Precio Original**: Introduce el precio antes del descuento
   - El **Precio** actual será el precio rebajado

### Al Editar un Libro

1. Haz clic en el botón de edición (✏️) del libro
2. Modifica las opciones especiales según necesites
3. Para activar/desactivar oferta:
   - Marca/desmarca la opción **"En Oferta"**
   - Si activas la oferta, introduce el precio original
4. Guarda los cambios

## Visualización en la Tabla de Libros

La tabla del catálogo en AdminDashboard muestra:

### En la Columna de Portada
- Iconos pequeños debajo de la imagen: 📌 ✨ 🏷️

### En la Columna de Título
- Iconos con colores distintivos:
  - 📌 Dorado: Destacado
  - ✨ Verde: Nuevo
  - 🏷️ Rojo: En oferta

### En la Columna de Precio
- Si está en oferta:
  - **Precio actual**: En negro (precio con descuento)
  - **Precio original**: Tachado en gris (precio antes de descuento)

## Ejemplos de Uso

### Ejemplo 1: Libro Nuevo en Oferta

```
Título: "Don Quijote de la Mancha"
Precio: $15.00
Precio Original: $25.00
✅ Libro Nuevo
✅ En Oferta

Resultado:
- Se muestra con etiquetas "Nuevo" y "Oferta"
- Precio: $15.00 (rebajado)
- Precio anterior: $25.00 (tachado)
- Descuento calculado: 40%
```

### Ejemplo 2: Libro Destacado

```
Título: "Cien Años de Soledad"
Precio: $20.00
✅ Libro Destacado

Resultado:
- Se muestra en sección destacados del home
- Icono 📌 visible en AdminDashboard
- Sin modificación de precio
```

### Ejemplo 3: Libro Normal

```
Título: "El Principito"
Precio: $12.00

Resultado:
- Se muestra sin etiquetas especiales
- Precio normal sin descuento
```

## Base de Datos

### Migración

Ejecuta el script SQL para añadir los campos:
```bash
docs/add_book_special_fields.sql
```

### Campos en Tabla `libros`

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `precio` | DECIMAL(10,2) | - | Precio actual/rebajado |
| `precio_original` | DECIMAL(10,2) | NULL | Precio antes de oferta |
| `destacado` | BOOLEAN | FALSE | Libro destacado |
| `es_nuevo` | BOOLEAN | FALSE | Libro nuevo |
| `en_oferta` | BOOLEAN | FALSE | Libro en oferta |

### Índices

Se crean índices para optimizar búsquedas:
- `idx_libros_destacado`: Para libros destacados
- `idx_libros_es_nuevo`: Para libros nuevos
- `idx_libros_en_oferta`: Para libros en oferta

## Lógica de Negocio

### Cálculo de Descuento

Cuando un libro está en oferta:
```typescript
const descuento = ((precioOriginal - precioActual) / precioOriginal) * 100;
// Ejemplo: ((25 - 15) / 25) * 100 = 40%
```

### Validaciones

- Si `en_oferta = true`, debe existir un `precio_original`
- El `precio_original` debe ser mayor que el `precio` actual
- Un libro puede tener múltiples opciones activas simultáneamente

## Frontend

### BookCard Component

Los libros con opciones especiales muestran:
- **Badge "Nuevo"**: Si `isNew = true`
- **Badge "Oferta"**: Si `isOnSale = true`
- **Badge "Destacado"**: Si `featured = true`
- **Precio tachado**: Si `isOnSale = true` y existe `originalPrice`

### Home Page

- **Libros Destacados**: Filtra por `featured = true`
- **Nuevos Lanzamientos**: Filtra por `isNew = true`
- **Ofertas**: Filtra por `isOnSale = true`

## Mejores Prácticas

1. **No Abusar de Destacados**: Solo marca como destacados los libros más importantes
2. **Actualizar "Nuevos"**: Revisa periódicamente y desmarca libros que ya no son nuevos
3. **Ofertas Temporales**: Usa ofertas para promociones específicas
4. **Precio Original Real**: Asegúrate de que el precio original sea el precio real anterior
5. **Combinar Opciones**: Un libro puede ser nuevo Y estar en oferta simultáneamente

## Notas Técnicas

- Los checkboxes usan `accent-color` para mantener consistencia visual
- Los iconos son emojis Unicode para compatibilidad universal
- Los campos booleanos tienen valores por defecto `FALSE`
- Los índices mejoran el rendimiento de consultas filtradas
