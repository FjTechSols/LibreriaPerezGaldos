# 📚 Guía de Importación Masiva de Libros

Guía completa para importar tu archivo `libros.txt` a la base de datos.

---

## 📋 Formato del Archivo

Tu archivo está en formato **TSV (Tab-Separated Values)** con esta estructura:

```
N0001026	EN BUSCA DEL GRAN KAN	Descripción...	Plaza y Janés	1978	Vicente Blasco Ibañez	...
```

### Campos que se importan:

| Posición | Campo | Ejemplo | Destino en BD |
|----------|-------|---------|---------------|
| 0 | Código | N0001026 | `code` |
| 1 | Título | EN BUSCA DEL GRAN KAN | `title` |
| 2 | Descripción | Colección... | `description` |
| 4 | Editorial | Plaza y Janés | `editorial` |
| 5 | Año | 1978 | `year` |
| 6 | Autor | Vicente Blasco Ibañez | `author` |
| 9 | Precio | 12.00 | `price` |
| 10 | Páginas | 336 | `pages` |
| 16 | Ubicación | almacen | `ubicacion` |

### Campos que NO se importan:

Los siguientes campos no se usan porque no están en tu archivo o son internos:
- ISBN (vacío en tu archivo)
- Imagen de portada (se agrega después)
- Rating (se calcula después)
- Featured, is_new, on_sale (se marcan manualmente después)

---

## 🚀 Pasos para Importar

### **Paso 1: Preparar el Archivo**

**NO necesitas modificar nada del archivo**, el script lo procesa automáticamente.

El archivo `libros.txt` debe estar en formato TSV (separado por tabuladores).

### **Paso 2: Limpiar Base de Datos (Si es necesario)**

Si quieres empezar desde cero:

```bash
# 1. Hacer backup primero
Supabase Dashboard → Database → Backups → Create backup

# 2. Aplicar limpieza
Supabase Dashboard → SQL Editor
→ Ejecutar: supabase/migrations/20251115000000_clean_production_data.sql
```

### **Paso 3: Instalar Dependencia dotenv**

El script necesita dotenv para leer las variables de entorno:

```bash
npm install dotenv
```

### **Paso 4: Ejecutar Script de Importación**

```bash
# Opción 1: Ver preview (sin importar)
node scripts/importar-libros.mjs libros.txt

# Opción 2: Importar directamente
node scripts/importar-libros.mjs libros.txt --confirm
```

---

## 📊 ¿Qué Hace el Script?

### 1. **Lee el Archivo**
```
📄 Archivo: libros.txt
📊 Tamaño: 22.57 KB
✅ 150 líneas encontradas
```

### 2. **Parsea los Datos**
```
🔄 Parseando datos...
✅ 148 libros parseados correctamente
⚠️  2 líneas omitidas por errores
```

### 3. **Muestra Preview**
```
📋 Muestra de los primeros 3 libros:
1. EN BUSCA DEL GRAN KAN
   Autor: Vicente Blasco Ibañez
   Precio: €12.00
   Categoría: Novela
```

### 4. **Importa en Lotes**
```
📦 Importando 148 libros en lotes de 100...
📤 Procesando lote 1/2 (100 libros)...
✅ Lote 1 importado exitosamente
📤 Procesando lote 2/2 (48 libros)...
✅ Lote 2 importado exitosamente
```

### 5. **Muestra Resumen**
```
📊 RESUMEN DE IMPORTACIÓN
✅ Importados: 148
❌ Errores: 0
📈 Total procesados: 148
```

---

## 🔍 Categorización Automática

El script asigna categorías automáticamente basándose en el título y descripción:

| Palabra clave | Categoría |
|---------------|-----------|
| infantil, niños | Infantil |
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
| (otros) | General |

Puedes cambiar las categorías manualmente después desde el panel de admin.

---

## ⚙️ Configuración del Script

### Variables de Entorno

El script usa las variables de `.env.development`:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

### Tamaño de Lotes

Por defecto importa en lotes de 100 libros. Puedes cambiar esto en el script:

```javascript
const result = await importBooks(books, 50); // Lotes de 50
```

---

## 🎯 Valores por Defecto

El script establece estos valores por defecto:

```javascript
{
  stock: 1,              // 1 en stock por defecto
  isbn: '',              // Vacío (no está en tu archivo)
  cover_image: '',       // Vacío (agregar después)
  rating: 0,             // Sin rating inicial
  featured: false,       // No destacado
  is_new: false,         // No es novedad
  on_sale: false         // No en oferta
}
```

Puedes modificar estos después desde el panel de admin.

---

## ✅ Después de la Importación

### 1. **Verificar en el Panel de Admin**

```bash
1. Login como admin
2. Ve a Panel de Administración
3. Sección "Libros"
4. Verifica que todos los libros aparecen
```

### 2. **Ajustar Datos**

Cosas que puedes hacer después:

- ✅ Agregar imágenes de portada
- ✅ Ajustar stock real
- ✅ Marcar libros destacados
- ✅ Marcar novedades
- ✅ Agregar ofertas
- ✅ Ajustar precios
- ✅ Completar ISBNs
- ✅ Mejorar descripciones
- ✅ Corregir categorías

### 3. **Optimizar Base de Datos**

Después de importar muchos libros:

```sql
-- Actualizar estadísticas de la tabla
ANALYZE libros;

-- Verificar índices
SELECT * FROM pg_indexes WHERE tablename = 'libros';
```

---

## 🐛 Troubleshooting

### Error: "Variables de entorno no configuradas"

```bash
Solución:
1. Verifica que existe .env.development
2. Verifica que tiene VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
3. Reinicia el script
```

### Error: "Archivo no encontrado"

```bash
Solución:
1. Verifica la ruta del archivo
2. Usa ruta absoluta: node scripts/importar-libros.mjs /ruta/completa/libros.txt
3. O coloca libros.txt en la raíz del proyecto
```

### Error: "Cannot find package dotenv"

```bash
Solución:
npm install dotenv
```

### Libros duplicados

```bash
Si ejecutas el script dos veces, puede duplicar libros.

Solución:
1. Elimina los duplicados manualmente desde el panel
2. O limpia la BD y vuelve a importar
```

### Errores de RLS (Row Level Security)

```bash
Si tienes error de permisos:

Solución:
1. Asegúrate de estar logueado como admin
2. Verifica las políticas RLS en Supabase Dashboard
3. Considera usar service_role key temporalmente para la importación
```

---

## 📝 Ejemplo Completo

```bash
# 1. Instalar dependencia
npm install dotenv

# 2. Colocar archivo en la raíz del proyecto
cp /ruta/a/libros.txt ./libros.txt

# 3. Hacer backup de BD (si hay datos)
# Supabase Dashboard → Database → Backups → Create

# 4. Limpiar BD (opcional)
# SQL Editor → Ejecutar clean_production_data.sql

# 5. Ver preview
node scripts/importar-libros.mjs libros.txt

# 6. Importar
node scripts/importar-libros.mjs libros.txt --confirm

# 7. Verificar
# Panel Admin → Libros → Ver todos
```

---

## 🔧 Personalizar el Script

### Cambiar Mapeo de Campos

Si tu archivo tiene un formato diferente, edita `FIELD_MAPPING`:

```javascript
const FIELD_MAPPING = {
  0: 'code',           // Tu posición 0
  1: 'title',          // Tu posición 1
  // ... etc
};
```

### Cambiar Categorización

Edita la función `determineCategory`:

```javascript
function determineCategory(title, description) {
  const text = `${title} ${description}`.toLowerCase();

  if (text.includes('tu-palabra')) return 'Tu Categoría';
  // ... etc

  return 'General';
}
```

### Cambiar Valores por Defecto

Edita la función `parseBookLine`:

```javascript
return {
  // ... campos parseados
  stock: 5,           // Cambia stock por defecto
  featured: true,     // Todos destacados por defecto
  // ... etc
};
```

---

## 💡 Tips y Recomendaciones

### 1. **Backup Siempre**
Haz backup antes de cualquier importación masiva.

### 2. **Prueba Primero**
Prueba con un archivo pequeño primero:
```bash
# Crear archivo de prueba con 10 líneas
head -10 libros.txt > libros-test.txt
node scripts/importar-libros.mjs libros-test.txt --confirm
```

### 3. **Importa en Desarrollo Primero**
Importa primero en tu base de datos de desarrollo, verifica que todo está bien, y luego importa en producción.

### 4. **Categorías Manuales**
Si tienes categorías específicas, es mejor asignarlas manualmente después en lugar de confiar en la categorización automática.

### 5. **Imágenes de Portada**
Las imágenes de portada se deben agregar después. Considera:
- Usar Supabase Storage
- URLs de servicios como Open Library
- Subir manualmente las más importantes

---

## 📊 Estadísticas del Archivo

Tu archivo `libros.txt`:
- **Tamaño:** 22.571 KB
- **Estimado de libros:** ~150-200 libros
- **Tiempo de importación:** ~10-20 segundos
- **Formato:** TSV (Tab-Separated Values)
- **Campos por línea:** 27 campos

---

## 🎯 Resumen

1. **Instalar:** `npm install dotenv`
2. **Ejecutar:** `node scripts/importar-libros.mjs libros.txt --confirm`
3. **Verificar:** Panel de Admin → Libros
4. **Ajustar:** Imágenes, stock, precios, categorías
5. **¡Listo!** 📚✨

---

**Última actualización:** 2025-11-15

**Script:** `scripts/importar-libros.mjs`
