# 📚 Importar Libros desde Supabase Dashboard

Guía definitiva para importar tus 1,706 libros directamente desde Supabase.

---

## ✅ Análisis del Archivo Completado

### 📊 Estadísticas:
- **Total de libros:** 1,706 libros
- **Tamaño original:** 22.571 KB
- **Tamaño SQL:** 529.40 KB
- **Formato:** TSV → SQL
- **Codificación:** Latin-1 → UTF-8 ✅
- **Estado:** Listo para importar

### 🎯 Resultado:
**SÍ SE PUEDE SUBIR** - Archivo convertido exitosamente a SQL

---

## 🚀 OPCIÓN 1: Copiar y Pegar SQL (RECOMENDADA)

### ✅ Ventajas:
- Más rápida (1-2 minutos)
- Sin errores de mapeo
- Categorización automática
- Control total

### 📝 Pasos:

#### 1. **Abre el archivo SQL generado**
```bash
scripts/importar-libros.sql
```

#### 2. **Copia TODO el contenido**
- El archivo tiene 1,706 libros en 18 lotes
- Cada lote tiene ~100 libros
- Total: ~1,900 líneas de SQL

#### 3. **Ve a Supabase Dashboard**
```
1. Abre Supabase Dashboard
2. Ve a "SQL Editor"
3. Click en "New query"
```

#### 4. **Pega el SQL**
```
1. Pega TODO el contenido del archivo
2. Click en "Run" (o Ctrl+Enter)
3. Espera 10-20 segundos
```

#### 5. **Verifica el resultado**
```sql
-- Ejecuta esta consulta para verificar
SELECT COUNT(*) FROM libros;
-- Debería mostrar: 1706
```

#### 6. **¡Listo!** 🎉
Todos tus libros están importados con:
- ✅ Códigos únicos
- ✅ Títulos y autores
- ✅ Precios y páginas
- ✅ Descripciones completas
- ✅ Categorías automáticas
- ✅ Stock inicial de 1
- ✅ Caracteres españoles correctos (ñ, á, é, etc.)

---

## 🔧 OPCIÓN 2: Comando Node.js

Si prefieres usar la terminal:

### Desde tu proyecto:

```bash
# 1. Ya está generado el SQL
# El archivo está en: scripts/importar-libros.sql

# 2. (Opcional) Regenerar si necesitas cambios
node scripts/convertir-a-sql.mjs scripts/libros.txt

# 3. Copiar contenido al portapapeles (macOS)
cat scripts/importar-libros.sql | pbcopy

# 4. Copiar contenido al portapapeles (Linux)
cat scripts/importar-libros.sql | xclip -selection clipboard

# 5. Copiar contenido al portapapeles (Windows)
type scripts/importar-libros.sql | clip

# 6. Pegar en Supabase SQL Editor y ejecutar
```

---

## 📋 Estructura del SQL Generado

### Cada libro tiene estos campos:

```sql
INSERT INTO libros (
  code,           -- Código único (N0001026)
  title,          -- Título del libro
  author,         -- Autor
  editorial,      -- Editorial
  year,           -- Año (o NULL)
  price,          -- Precio (EUR)
  pages,          -- Número de páginas
  description,    -- Descripción completa
  category,       -- Categoría automática
  ubicacion,      -- Ubicación en almacén
  stock,          -- Stock inicial (1)
  isbn,           -- Vacío (agregar después)
  cover_image,    -- Vacío (agregar después)
  rating,         -- 0 (sin valoraciones)
  featured,       -- false
  is_new,         -- false
  on_sale         -- false
)
VALUES
  ('N0001026', 'EN BUSCA DEL GRAN KAN', 'Vicente Blasco Ibañez', 'Plaza y Janés', 1978, 12, 336, 'Descripción...', 'General', 'almacen', 1, '', '', 0, false, false, false),
  -- ... más libros
```

### Características:

1. **ON CONFLICT (code) DO NOTHING**
   - No duplica libros si ejecutas dos veces
   - Usa el código como clave única

2. **Lotes de 100 libros**
   - Evita timeouts
   - Facilita debugging

3. **Categorización automática**
   - Basada en título y descripción
   - 13 categorías diferentes
   - Ver lista completa abajo

---

## 🏷️ Categorías Automáticas Asignadas

El script asigna estas categorías automáticamente:

| Palabras clave | Categoría |
|----------------|-----------|
| infantil, niño, niña | Infantil |
| novela, narrativa | Novela |
| historia, histórico | Historia |
| poesía, poema | Poesía |
| ensayo | Ensayo |
| biografía, memoria | Biografía |
| arte | Arte |
| ciencia | Ciencia |
| filosofía | Filosofía |
| teatro, drama | Teatro |
| religión, religioso | Religión |
| diccionario, enciclopedia | Referencia |
| (ninguna coincidencia) | General |

**Ejemplo del archivo:**
- "MARALÍ. NOVELA PARA NIÑAS" → Infantil ✅
- "OBRAS COMPLETAS DE CERVANTES" → Novela ✅
- "SHIBUMI" (descripción: "novela de intriga") → Novela ✅

---

## 🔍 Verificación Post-Importación

### 1. **Contar libros totales**
```sql
SELECT COUNT(*) as total_libros FROM libros;
-- Esperado: 1706
```

### 2. **Ver libros por categoría**
```sql
SELECT category, COUNT(*) as total
FROM libros
GROUP BY category
ORDER BY total DESC;
```

### 3. **Ver autores más frecuentes**
```sql
SELECT author, COUNT(*) as total
FROM libros
GROUP BY author
ORDER BY total DESC
LIMIT 10;
```

### 4. **Ver rango de precios**
```sql
SELECT
  MIN(price) as precio_minimo,
  MAX(price) as precio_maximo,
  AVG(price) as precio_promedio
FROM libros;
```

### 5. **Ver libros sin año**
```sql
SELECT COUNT(*) as libros_sin_año
FROM libros
WHERE year IS NULL;
```

### 6. **Ver primeros 10 libros**
```sql
SELECT code, title, author, price
FROM libros
ORDER BY code
LIMIT 10;
```

---

## ⚙️ Personalización del SQL

Si necesitas cambiar algo antes de importar:

### Cambiar stock inicial:

Busca y reemplaza en el archivo SQL:
```sql
-- Buscar:
, 1, '', '', 0, false, false, false)

-- Reemplazar con (ejemplo: stock 5):
, 5, '', '', 0, false, false, false)
```

### Marcar todos como destacados:

```sql
-- Buscar:
, 0, false, false, false)

-- Reemplazar con:
, 0, true, false, false)
```

### Cambiar categoría de un libro:

```sql
-- Buscar el libro por código y cambiar manualmente:
('N0001026', '...', '...', 'General', ...)

-- Cambiar 'General' por la categoría que quieras
```

---

## 🐛 Troubleshooting

### Error: "duplicate key value violates unique constraint"

**Causa:** Ya existen libros con esos códigos en la BD

**Solución:**
```sql
-- Opción 1: Limpiar tabla primero
DELETE FROM libros;

-- Opción 2: El SQL ya incluye ON CONFLICT DO NOTHING
-- No hace nada si el libro ya existe
```

### Error: "syntax error at or near"

**Causa:** Problema al copiar el SQL

**Solución:**
1. Asegúrate de copiar TODO el contenido
2. Verifica que no se cortó a la mitad
3. El archivo debe terminar con `;`

### Error: "timeout"

**Causa:** Demasiados libros de una vez

**Solución:**
1. Importa por lotes (copia solo algunos INSERT)
2. Ejecuta lotes de 100-200 libros cada vez
3. El archivo ya está dividido en lotes

### Caracteres raros (�, �, etc.)

**Causa:** Problema de codificación

**Solución:**
1. El script ya convierte Latin-1 → UTF-8
2. Si aún ves problemas, regenera el SQL:
   ```bash
   node scripts/convertir-a-sql.mjs scripts/libros.txt
   ```

---

## 📊 Ejemplo del Resultado

Después de importar, verás tus libros así en la tabla:

| code | title | author | editorial | year | price | pages | category |
|------|-------|--------|-----------|------|-------|-------|----------|
| N0001026 | EN BUSCA DEL GRAN KAN | Vicente Blasco Ibañez | Plaza y Janés | 1978 | 12.00 | 336 | General |
| N0001027 | FLOR DE MAYO | Vicente Blasco Ibañez | Plaza y Janés | 1978 | 12.00 | 237 | General |
| N0001028 | SONNICA LA CORTESANA | Vicente Blasco Ibañez | Plaza y Janés | 1978 | 12.00 | 260 | General |
| N0001001 | MARALÍ. NOVELA PARA NIÑAS | Ilde Gir | Juventud | 1952 | 15.00 | 80 | Infantil |

---

## 🎯 Próximos Pasos Después de Importar

### 1. **Verificar en el Panel de Admin**
```
1. Login como admin en tu aplicación
2. Panel de Administración → Libros
3. Deberías ver 1,706 libros
```

### 2. **Ajustar Información**
- ✅ Agregar imágenes de portada
- ✅ Completar ISBNs si los tienes
- ✅ Ajustar stock real de cada libro
- ✅ Marcar libros destacados
- ✅ Crear ofertas especiales
- ✅ Revisar y ajustar categorías
- ✅ Mejorar descripciones si es necesario

### 3. **Optimizar Base de Datos**
```sql
-- Actualizar estadísticas
ANALYZE libros;

-- Ver índices
SELECT * FROM pg_indexes WHERE tablename = 'libros';

-- Verificar tamaño de la tabla
SELECT pg_size_pretty(pg_total_relation_size('libros'));
```

### 4. **Backup**
```
1. Supabase Dashboard → Database → Backups
2. Create a manual backup
3. Guardar por si acaso
```

---

## 📦 Archivos Generados

### En tu proyecto:

```
scripts/
├── libros.txt              (Original - 22.5 KB - 1706 líneas)
├── convertir-a-sql.mjs     (Script de conversión)
└── importar-libros.sql     (SQL generado - 529 KB - 1900 líneas)
```

### Backup del proceso:

Si quieres regenerar el SQL en el futuro:

```bash
# Regenerar SQL desde el TXT original
node scripts/convertir-a-sql.mjs scripts/libros.txt

# El nuevo SQL sobrescribe el anterior
# Ubicación: scripts/importar-libros.sql
```

---

## 💡 Tips Importantes

### ✅ DO:
1. Haz backup de tu BD antes de importar
2. Verifica el SQL antes de ejecutarlo
3. Ejecuta en lotes si tienes problemas
4. Revisa los primeros 10 libros importados
5. Ajusta categorías manualmente si es necesario

### ❌ DON'T:
1. No ejecutes el SQL dos veces sin limpiar primero
2. No modifiques el código único de los libros
3. No importes sin verificar que las columnas coinciden
4. No olvides hacer backup primero

---

## 🎉 Resumen Ejecutivo

### Lo que tienes:
- ✅ 1,706 libros listos para importar
- ✅ SQL generado automáticamente
- ✅ Categorización inteligente
- ✅ Caracteres españoles correctos
- ✅ Sin duplicados (ON CONFLICT)
- ✅ Lotes de 100 libros para estabilidad

### Cómo importar:
1. Abre `scripts/importar-libros.sql`
2. Copia TODO el contenido
3. Pega en Supabase SQL Editor
4. Click "Run"
5. ¡Listo en 20 segundos! 🚀

### Después de importar:
1. Verificar en panel de admin
2. Agregar imágenes
3. Ajustar stock
4. Marcar destacados
5. ¡Abrir tu tienda! 🎊

---

**Última actualización:** 2025-11-14

**Archivos:**
- `scripts/libros.txt` (Original)
- `scripts/importar-libros.sql` (SQL generado)
- `scripts/convertir-a-sql.mjs` (Conversor)
