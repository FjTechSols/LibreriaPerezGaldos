# Limpiar ISBNs en Descripciones

## Problema

En la base de datos antigua, los ISBNs estaban en el campo de descripción en lugar del campo dedicado. Esto causa que las descripciones contengan texto como:

```
"Giampiero Moretti, ISBN: 9788477743163, Editorial MACHADO GRUPO DE DISTRIBUCION, (España)"
```

## Solución

Se han creado dos herramientas:

### 1. Para Archivos Nuevos (Normalización)

El script `normalizar-libros.mjs` ahora extrae automáticamente los ISBNs de las descripciones:

```bash
node scripts/normalizar-libros.mjs scripts/libros.txt
```

**Resultado:**
- ISBN extraído: `9788477743163`
- Descripción limpia: `Giampiero Moretti, Editorial MACHADO GRUPO DE DISTRIBUCION, (España)`

### 2. Para Libros Ya Importados (Limpieza)

El script `limpiar-isbn-descripcion.mjs` limpia los libros que ya están en la base de datos:

```bash
# Ver qué se va a cambiar (sin modificar)
node scripts/limpiar-isbn-descripcion.mjs --dry-run

# Aplicar los cambios
node scripts/limpiar-isbn-descripcion.mjs
```

## Cómo Funciona

### Patrones Detectados

El sistema detecta ISBNs en estos formatos:

- `ISBN: 9788477743163`
- `ISBN 9788477743163`
- `ISBN-9788477743163`
- `, ISBN: 9788477743163`
- `ISBN 978-84-7774-316-3` (con guiones)

### Proceso de Extracción

1. Busca patrones de ISBN en la descripción
2. Extrae el número (10 o 13 dígitos)
3. Si el campo `isbn` está vacío, lo rellena
4. Limpia la descripción removiendo el texto del ISBN
5. Normaliza espacios y puntuación

### Ejemplo Completo

**Antes:**
```json
{
  "isbn": "",
  "descripcion": "Giampiero Moretti, ISBN: 9788477743163, Editorial MACHADO"
}
```

**Después:**
```json
{
  "isbn": "9788477743163",
  "descripcion": "Giampiero Moretti, Editorial MACHADO"
}
```

## Uso Paso a Paso

### Para Archivos Nuevos

```bash
# 1. Normalizar el archivo TXT original
node scripts/normalizar-libros.mjs scripts/libros-originales.txt

# Se generan archivos normalizados con ISBNs extraídos:
# - libros-originales-normalizado.txt
# - libros-originales-normalizado.tsv
# - libros-originales-normalizado.json

# 2. Importar el archivo normalizado
node scripts/importar-libros.mjs scripts/libros-originales-normalizado.tsv --confirm
```

### Para Libros Ya Importados

```bash
# 1. Simular primero para ver qué cambiará
node scripts/limpiar-isbn-descripcion.mjs --dry-run

# Salida de ejemplo:
# 📖 ID 1234: El genio
#    ✨ ISBN extraído: 9788477743163
#    📝 Descripción anterior: Giampiero Moretti, ISBN: 9788477743163...
#    ✅ Descripción limpia: Giampiero Moretti, Editorial MACHADO...

# 2. Si todo se ve bien, aplicar los cambios
node scripts/limpiar-isbn-descripcion.mjs

# 3. Verificar en el Admin Dashboard
```

## Casos Especiales

### Libro Ya Tiene ISBN

Si un libro ya tiene un ISBN en el campo correcto, el script:
- **NO** sobrescribe el ISBN existente
- **SÍ** limpia la descripción removiendo el ISBN duplicado

```bash
# Antes:
# isbn: "9788477743163"
# descripcion: "..., ISBN: 9788477743163, ..."

# Después:
# isbn: "9788477743163" (sin cambios)
# descripcion: "..." (limpia)
```

### ISBNs Diferentes

Si el ISBN en la descripción es diferente al del campo:

```bash
# Campo isbn: "1234567890"
# Descripción: "..., ISBN: 9788477743163, ..."

# Resultado:
# - Mantiene el ISBN del campo: "1234567890"
# - Limpia la descripción
# - Muestra una advertencia en los logs
```

### Sin ISBN en Descripción

Si la descripción contiene la palabra "ISBN" pero no un número válido:

```bash
# Descripción: "Este libro necesita ISBN"
# Resultado: Se salta el libro (no hay ISBN que extraer)
```

## Verificación

### SQL para Verificar ISBNs en Descripciones

```sql
-- Ver libros que aún tienen "ISBN" en descripción
SELECT id, titulo, isbn, descripcion
FROM libros
WHERE activo = true
  AND descripcion ILIKE '%ISBN%'
ORDER BY id
LIMIT 20;

-- Contar cuántos quedan
SELECT COUNT(*)
FROM libros
WHERE activo = true
  AND descripcion ILIKE '%ISBN%';

-- Ver ejemplos de descripciones limpias
SELECT id, titulo, isbn, LEFT(descripcion, 100) as descripcion
FROM libros
WHERE activo = true
  AND isbn IS NOT NULL
  AND isbn != ''
ORDER BY id DESC
LIMIT 10;
```

### Verificar en el Admin Dashboard

1. Ve a Admin Dashboard → Libros
2. Busca un libro por título
3. Verifica que:
   - El campo ISBN esté rellenado
   - La descripción no contenga "ISBN: ..."

## Troubleshooting

### Problema: No se extrae el ISBN

**Causa:** El formato del ISBN en la descripción no coincide con los patrones

**Solución:**
1. Revisa el formato exacto en la descripción
2. Edita `extractISBN()` en el script
3. Añade un nuevo patrón regex

```javascript
// Ejemplo: añadir nuevo patrón
const patterns = [
  /ISBN[\s:-]*(\d{10,13})/i,
  /TU_NUEVO_PATRON_AQUI/i,  // ← Añadir aquí
];
```

### Problema: Se corta parte de la descripción

**Causa:** El patrón de limpieza es muy agresivo

**Solución:** Revisa el patrón `replace()` en `extractISBN()`

```javascript
// Ajustar esta línea para ser más específico
cleanText = text.replace(/,?\s*ISBN[\s:-]*\d{10,13}/gi, '')
```

### Problema: Demasiados libros para procesar

**Solución:** Procesar por lotes

```sql
-- Opción 1: Actualizar solo primeros 100
UPDATE libros
SET descripcion = REGEXP_REPLACE(descripcion, ',?\s*ISBN[\s:-]*\d{10,13}', '', 'gi'),
    isbn = NULLIF(REGEXP_REPLACE(descripcion, '.*ISBN[\s:-]*(\d{10,13}).*', '\1', 'i'), descripcion)
WHERE activo = true
  AND descripcion ILIKE '%ISBN%'
  AND id <= 100;

-- Opción 2: Usar el script con filtros personalizados
```

## Normalización de Caracteres

Ambos scripts también normalizan automáticamente caracteres especiales mal codificados:

### Caracteres Soportados

**Vocales con tildes:**
- `á é í ó ú` y `Á É Í Ó Ú`
- `Did�cticos` → `Didácticos`
- `R�stica` → `Rústica`

**Letra ñ:**
- `ñ Ñ`
- `Espa�a` → `España`

**Diéresis:**
- `ü ö ä` y `Ü Ö Ä`

**Comillas y símbolos:**
- `"texto"` → `"texto"`
- `—` (guiones largos)
- `©` `®` `™` (símbolos legales)

### Ejemplo de Normalización Completa

```
Entrada:
"Did�cticos. R�stica, ISBN: 9788477743163, Espa�a"

Salida:
isbn: "9788477743163"
descripcion: "Didácticos. Rústica, España"
```

## Ejemplos Reales

### Ejemplo 1: ISBN Simple

```
Entrada:
{
  "descripcion": "Giampiero Moretti, ISBN: 9788477743163"
}

Salida:
{
  "isbn": "9788477743163",
  "descripcion": "Giampiero Moretti"
}
```

### Ejemplo 2: ISBN con Editorial

```
Entrada:
{
  "descripcion": "Giampiero Moretti, ISBN: 9788477743163, Editorial MACHADO, (España)"
}

Salida:
{
  "isbn": "9788477743163",
  "descripcion": "Giampiero Moretti, Editorial MACHADO, (España)"
}
```

### Ejemplo 3: ISBN con Guiones

```
Entrada:
{
  "descripcion": "Autor Ejemplo, ISBN: 978-84-7774-316-3, Año 2020"
}

Salida:
{
  "isbn": "9788477743163",
  "descripcion": "Autor Ejemplo, Año 2020"
}
```

### Ejemplo 4: Con Caracteres Especiales

```
Entrada:
{
  "descripcion": "Did�cticos. R�stica, ISBN: 9788477743163, Editorial MACHADO, Espa�a"
}

Salida:
{
  "isbn": "9788477743163",
  "descripcion": "Didácticos. Rústica, Editorial MACHADO, España"
}
```

### Ejemplo 5: Todo Junto

```
Entrada:
{
  "titulo": "El g�nero de la filosof�a",
  "descripcion": "Gianpiero Moretti, ISBN: 9788477743163, (Espa�a) Nueva edici�n"
}

Salida:
{
  "titulo": "El género de la filosofía",
  "isbn": "9788477743163",
  "descripcion": "Gianpiero Moretti, (España) Nueva edición"
}
```

## Scripts Relacionados

- `normalizar-libros.mjs` - Normaliza archivos TXT antes de importar
- `importar-libros.mjs` - Importa libros normalizados a la BD
- `limpiar-isbn-descripcion.mjs` - Limpia ISBNs de libros ya importados

## Documentación Adicional

- [Importar Libros Masivamente](./IMPORTAR_LIBROS_MASIVAMENTE.md)
- [Normalizar Caracteres](../NORMALIZAR_CARACTERES.md)
