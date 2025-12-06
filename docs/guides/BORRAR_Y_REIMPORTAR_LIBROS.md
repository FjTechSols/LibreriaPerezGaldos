# Borrar y Reimportar Todos los Libros

Esta guía te muestra cómo borrar todos los libros de la base de datos, resetear los IDs y volver a importarlos desde cero con ISBNs incluidos.

## Paso 1: Borrar Todos los Libros

### Opción A: Desde Supabase Dashboard (Recomendado)

1. Abre [Supabase Dashboard](https://app.supabase.com)
2. Ve a tu proyecto → **SQL Editor**
3. Copia y pega el contenido de `scripts/borrar-todos-libros.sql`
4. Haz clic en **Run**

### Opción B: Desde el Terminal

```bash
# Usando el cliente de Supabase (si lo tienes instalado)
supabase db execute -f scripts/borrar-todos-libros.sql
```

### ⚠️ Lo que hace este script:

- ✅ Borra todos los libros de la tabla `libros`
- ✅ Resetea el contador de IDs para que empiece desde 1
- ✅ Verifica que la tabla está vacía
- ✅ Verifica que la secuencia está en 1

---

## Paso 2: Normalizar Archivo de Libros (CON ISBN)

El script de normalización ahora **incluye el campo ISBN** en el campo 3 del archivo TSV.

```bash
# Normalizar archivo con ISBN incluido
node scripts/normalizar-libros.mjs scripts/libros.txt
```

### Archivos generados:

- `libros-normalizado.txt` - Formato legible
- `libros-normalizado.tsv` - Formato importable
- `libros-normalizado.json` - Formato JSON
- `libros-estadisticas.txt` - Estadísticas del catálogo

### Campos extraídos (actualizado):

| Campo | Índice | Descripción |
|-------|--------|-------------|
| code | 0 | Código interno |
| title | 1 | Título del libro |
| description | 2 | Descripción |
| **isbn** | **3** | **ISBN del libro** ✨ |
| editorial | 4 | Editorial |
| year | 5 | Año de publicación |
| author | 6 | Autor |
| price | 9 | Precio |
| pages | 10 | Número de páginas |
| ubicacion | 16 | Ubicación en almacén |

---

## Paso 3: Importar Libros a Supabase

```bash
# Importar usando el archivo normalizado
node scripts/importar-libros.mjs scripts/libros-normalizado.tsv
```

### El script ahora:

- ✅ Extrae el ISBN del campo 3
- ✅ Inserta libros con todos los campos normalizados
- ✅ Asigna categorías automáticamente
- ✅ Limpia caracteres especiales
- ✅ Los IDs empiezan desde 1

---

## Verificar Importación

### Desde SQL Editor:

```sql
-- Verificar total de libros
SELECT COUNT(*) as total FROM libros;

-- Ver primeros 10 libros con ISBN
SELECT id, titulo, autor, isbn, precio
FROM libros
ORDER BY id
LIMIT 10;

-- Ver cuántos libros tienen ISBN
SELECT
  COUNT(*) as total_libros,
  COUNT(isbn) as con_isbn,
  COUNT(*) - COUNT(isbn) as sin_isbn
FROM libros;
```

### Desde el Frontend:

1. Abre tu aplicación
2. Ve al **Admin Dashboard**
3. Revisa que los libros tienen ISBN en la columna correspondiente

---

## Si Algo Sale Mal

### Problema: No se importó el ISBN

**Solución:** Verifica que tu archivo TSV tiene el ISBN en la columna 3.

Ejemplo de formato correcto:
```
N0001026	EN BUSCA DEL GRAN KAN	Descripción	978-84-123456-7	Editorial	1978	Autor	...
^col 0    ^col 1                  ^col 2       ^col 3          ^col 4     ^col 5  ^col 6
```

### Problema: Los IDs no empiezan desde 1

**Solución:** Ejecuta el script de borrado de nuevo.

### Problema: Caracteres raros (Ã±, Ã©, etc.)

**Solución:** El script de normalización los arregla automáticamente.

---

## Resumen del Proceso Completo

```bash
# 1. Borrar todos los libros (desde Supabase Dashboard)
#    Ejecutar: scripts/borrar-todos-libros.sql

# 2. Normalizar archivo con ISBN
node scripts/normalizar-libros.mjs scripts/libros.txt

# 3. Revisar archivo normalizado
cat scripts/libros-normalizado.txt | head -50

# 4. Importar a Supabase
node scripts/importar-libros.mjs scripts/libros-normalizado.tsv

# 5. Verificar en SQL Editor
# SELECT COUNT(*), COUNT(isbn) FROM libros;
```

---

## Estadísticas Esperadas

Después de importar, deberías ver:

```
📚 Total de libros: XXXX
📊 Con ISBN: YYYY
✅ IDs desde 1 hasta XXXX
```

---

## Notas Importantes

1. **Backup:** Este proceso NO hace backup automático. Si necesitas conservar datos, haz un backup manual antes.

2. **ISBN opcional:** Si un libro no tiene ISBN en el archivo original, el campo quedará vacío (NULL).

3. **Secuencia de IDs:** Después del borrado, los nuevos libros empezarán con ID = 1.

4. **Tiempo de importación:** Depende del número de libros. Aproximadamente 100-200 libros por minuto.

---

## Verificación Final

```sql
-- Verificar estructura completa
SELECT
  id,
  code,
  titulo,
  autor,
  isbn,
  editorial,
  año as year,
  precio,
  categoria,
  ubicacion,
  stock
FROM libros
ORDER BY id
LIMIT 5;
```

Deberías ver:
- ✅ IDs empezando en 1
- ✅ ISBN en la columna correspondiente
- ✅ Caracteres correctamente codificados
- ✅ Todos los campos completos
