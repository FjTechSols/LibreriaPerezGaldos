# Sistema de Códigos Automáticos por Ubicación

Este sistema genera códigos de libros automáticamente basándose en la ubicación seleccionada.

## Reglas de Generación de Códigos

| Ubicación | Formato | Ejemplo |
|-----------|---------|---------|
| **almacen** | Solo números (6 dígitos) | `001234` |
| **Galeon** | Números + G | `001234G` |
| **Hortaleza** | Números + H | `001234H` |
| **Reina** | Números + R | `001234R` |
| **Abebooks** | Números + Ab | `001234Ab` |

## Funcionamiento

### Al Crear un Libro

1. El libro se inserta en la base de datos sin código
2. Se obtiene el ID autogenerado por la base de datos
3. Se genera el código basado en el ID y la ubicación
4. Se actualiza el libro con el código generado

**Ejemplo:**
```
Libro insertado → ID: 1234
Ubicación: Galeon
Código generado: 001234G
```

### Al Editar un Libro

Cuando se cambia la ubicación de un libro existente:

1. Se extrae el número base del código actual
2. Se genera el nuevo código con el sufijo de la nueva ubicación
3. Se actualiza el libro con el nuevo código

**Ejemplo:**
```
Código actual: 001234H (Hortaleza)
Nueva ubicación: Galeon
Código actualizado: 001234G
```

### Al Importar Libros

Durante la importación masiva desde archivos TSV:

1. Cada libro se inserta sin código
2. Se obtiene el ID autogenerado
3. Se genera el código según la ubicación del archivo
4. Se actualiza el libro con el código

## Implementación Técnica

### Archivo: `src/utils/codigoHelper.ts`

Este archivo contiene las funciones principales:

```typescript
// Genera un código basado en ID y ubicación
generarCodigoLibro(id, ubicacion)

// Actualiza un código existente con nueva ubicación
actualizarCodigoPorUbicacion(codigoActual, nuevaUbicacion)

// Obtiene el sufijo de una ubicación
obtenerSufijoUbicacion(ubicacion)

// Extrae el número base de un código
extraerNumeroBase(codigo)

// Valida si un código es correcto para una ubicación
validarCodigoUbicacion(codigo, ubicacion)

// Normaliza un código según la ubicación
normalizarCodigo(codigo, ubicacion)
```

### Archivo: `src/services/libroService.ts`

Funciones actualizadas:

- **`crearLibro()`**: Genera código automático al crear
- **`actualizarLibro()`**: Actualiza código al cambiar ubicación

### Archivo: `scripts/importar-libros.mjs`

Script de importación actualizado para generar códigos automáticamente.

## Ejemplos de Uso

### Crear un Libro en el Frontend

```typescript
import { crearLibro } from '../services/libroService';

const nuevoLibro = {
  titulo: 'Don Quijote de la Mancha',
  autor: 'Miguel de Cervantes',
  precio: 25.99,
  stock: 10,
  ubicacion: 'Galeon' // Se generará código: XXXXXXG
};

const libroCreado = await crearLibro(nuevoLibro);
// libroCreado.legacy_id = "001234G" (ejemplo)
```

### Cambiar Ubicación

```typescript
import { actualizarLibro } from '../services/libroService';

// Libro actual: código 001234G en Galeon
await actualizarLibro(1234, {
  ubicacion: 'Hortaleza' // Código se actualizará a: 001234H
});
```

### Importar Libros con Ubicación

```bash
# 1. Asegúrate que tu archivo TSV tiene la columna ubicacion
# 2. Ejecuta el script de importación
node scripts/importar-libros.mjs scripts/libros-normalizado.tsv --confirm

# Los códigos se generarán automáticamente según la ubicación de cada libro
```

## Validación

El sistema valida que los códigos sean correctos:

```typescript
import { validarCodigoUbicacion } from '../utils/codigoHelper';

validarCodigoUbicacion('001234', 'almacen');    // ✅ true
validarCodigoUbicacion('001234G', 'Galeon');    // ✅ true
validarCodigoUbicacion('001234H', 'Galeon');    // ❌ false
validarCodigoUbicacion('001234Ab', 'Abebooks'); // ✅ true
```

## Normalización de Códigos Existentes

Si tienes libros con códigos antiguos, puedes normalizarlos:

```typescript
import { normalizarCodigo } from '../utils/codigoHelper';

// Código antiguo: "N0001234"
// Ubicación: Galeon
const codigoNormalizado = normalizarCodigo('N0001234', 'Galeon');
// Resultado: "001234G"
```

## Migración de Códigos Existentes

### Opción 1: Script SQL (Recomendado para pocos libros)

```sql
-- Actualizar códigos de libros en Galeon
UPDATE libros
SET legacy_id = LPAD(id::text, 6, '0') || 'G'
WHERE ubicacion = 'Galeon';

-- Actualizar códigos de libros en Hortaleza
UPDATE libros
SET legacy_id = LPAD(id::text, 6, '0') || 'H'
WHERE ubicacion = 'Hortaleza';

-- Actualizar códigos de libros en Reina
UPDATE libros
SET legacy_id = LPAD(id::text, 6, '0') || 'R'
WHERE ubicacion = 'Reina';

-- Actualizar códigos de libros en Abebooks
UPDATE libros
SET legacy_id = LPAD(id::text, 6, '0') || 'Ab'
WHERE ubicacion = 'Abebooks';

-- Actualizar códigos de libros en almacen
UPDATE libros
SET legacy_id = LPAD(id::text, 6, '0')
WHERE ubicacion = 'almacen' OR ubicacion IS NULL;
```

### Opción 2: Script Node.js (Para muchos libros)

Crea un archivo `scripts/migrar-codigos.mjs`:

```javascript
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

function generarCodigo(id, ubicacion) {
  const numero = id.toString().padStart(6, '0');
  const sufijos = {
    'almacen': '',
    'Galeon': 'G',
    'Hortaleza': 'H',
    'Reina': 'R',
    'Abebooks': 'Ab'
  };
  return numero + (sufijos[ubicacion] || '');
}

async function migrarCodigos() {
  const { data: libros, error } = await supabase
    .from('libros')
    .select('id, ubicacion');

  if (error) {
    console.error('Error:', error);
    return;
  }

  for (const libro of libros) {
    const nuevoCodigo = generarCodigo(libro.id, libro.ubicacion || 'almacen');

    await supabase
      .from('libros')
      .update({ legacy_id: nuevoCodigo })
      .eq('id', libro.id);

    console.log(`✅ Libro ${libro.id}: ${nuevoCodigo}`);
  }

  console.log('✅ Migración completada');
}

migrarCodigos();
```

Ejecutar:
```bash
node scripts/migrar-codigos.mjs
```

## Verificación Post-Migración

```sql
-- Verificar códigos por ubicación
SELECT
  ubicacion,
  COUNT(*) as total,
  COUNT(legacy_id) as con_codigo,
  COUNT(*) - COUNT(legacy_id) as sin_codigo
FROM libros
GROUP BY ubicacion;

-- Ver ejemplos de códigos
SELECT id, legacy_id, ubicacion, titulo
FROM libros
ORDER BY ubicacion, id
LIMIT 20;

-- Verificar códigos incorrectos (almacen debe ser solo números)
SELECT id, legacy_id, ubicacion
FROM libros
WHERE ubicacion = 'almacen' AND legacy_id ~ '[^0-9]';

-- Verificar códigos incorrectos (Galeon debe terminar en G)
SELECT id, legacy_id, ubicacion
FROM libros
WHERE ubicacion = 'Galeon' AND legacy_id !~ '\d+G$';
```

## Preguntas Frecuentes

### ¿Puedo cambiar el formato del código?

Sí, edita las funciones en `src/utils/codigoHelper.ts`. Por ejemplo, para usar 8 dígitos en lugar de 6:

```typescript
generarCodigoLibro(id, ubicacion, 8) // En lugar de 6
```

### ¿Qué pasa si creo un libro sin ubicación?

Se asigna automáticamente a `almacen` y se genera un código numérico.

### ¿Los códigos son únicos?

Sí, porque se basan en el ID autogenerado de la base de datos, que es único.

### ¿Puedo usar otras ubicaciones?

Sí, añade tu ubicación en la función `obtenerSufijoUbicacion()`:

```typescript
switch (ubicacionNormalizada) {
  case 'almacen':
    return '';
  case 'galeon':
    return 'G';
  case 'tu_nueva_ubicacion':
    return 'TU'; // Tu sufijo personalizado
  // ...
}
```

## Resolución de Problemas

### Problema: Los códigos no se generan

**Solución:** Verifica que el servicio de libros esté importando correctamente `codigoHelper.ts`.

### Problema: Los códigos no tienen el sufijo correcto

**Solución:** Revisa que la ubicación esté escrita exactamente como en `obtenerSufijoUbicacion()` (sensible a mayúsculas/minúsculas).

### Problema: Al cambiar ubicación no se actualiza el código

**Solución:** Verifica que estés usando la función `actualizarLibro()` del servicio, no una actualización directa.

## Roadmap

Futuras mejoras:

- [ ] Generación de códigos personalizados por categoría
- [ ] Prefijos opcionales para diferentes tiendas
- [ ] Interfaz gráfica para configurar formatos de código
- [ ] Validación en tiempo real en el formulario
- [ ] Códigos de barras automáticos
