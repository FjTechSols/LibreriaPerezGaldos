# Sistema de Códigos de Libros

## Visión General

El sistema ahora soporta dos tipos de códigos para los libros:

1. **Legacy Code** (`legacy_id`): Para libros de la base de datos antigua
2. **Código Nuevo** (`codigo`): Para libros nuevos que se añadan al sistema

## Comportamiento

### Frontend

- **Campo "Código Interno" es opcional**: Al crear un libro nuevo, no es necesario introducir un código
- **Autogeneración**: Si no se proporciona un código, el sistema generará uno automáticamente
- **Formato automático**: Los códigos generados siguen el formato `LIB000001`, `LIB000002`, etc.
- **Visualización**:
  - Si el libro tiene `legacy_id`: Se mostrará ese código (libros antiguos)
  - Si el libro tiene `codigo`: Se mostrará ese código (libros nuevos)
  - Si no tiene ninguno: Se mostrará el ID del libro con formato `#123`

### Backend (Base de Datos)

El campo `codigo` en la tabla `libros`:
- Es **UNIQUE** (no puede repetirse)
- Es **opcional** al insertar
- Se **autogenera** mediante un trigger si no se proporciona
- Usa una secuencia independiente para garantizar unicidad

## Migración de Base de Datos

### Aplicar la Migración

1. Conectarse a Supabase Dashboard
2. Ir a SQL Editor
3. Ejecutar el script: `docs/add_codigo_libros_migration.sql`

El script realizará las siguientes acciones:

1. Crear secuencia `libros_codigo_seq`
2. Añadir columna `codigo VARCHAR(20) UNIQUE` a tabla `libros`
3. Crear función `generate_libro_codigo()` para generar códigos
4. Crear trigger `libro_codigo_trigger` para autogenerar códigos
5. Generar códigos para libros existentes sin `legacy_id`

### Verificación

Después de ejecutar el script, verifica que todo funciona:

```sql
-- Ver estructura de la tabla
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'libros'
  AND column_name IN ('codigo', 'legacy_id');

-- Probar inserción sin código (debe autogenerar)
INSERT INTO libros (titulo, precio)
VALUES ('Libro de Prueba', 10.00);

-- Verificar que se generó el código
SELECT id, titulo, codigo, legacy_id
FROM libros
WHERE titulo = 'Libro de Prueba';
```

## Casos de Uso

### 1. Importar Libros Antiguos

Cuando importes libros de la base de datos antigua:

```sql
INSERT INTO libros (
  titulo,
  precio,
  legacy_id,  -- Código de la base antigua
  -- otros campos...
)
VALUES (
  'Don Quijote',
  25.00,
  'OLD-12345',  -- Este será el código visible
  -- otros valores...
);
```

El libro mostrará `OLD-12345` como código.

### 2. Añadir Libros Nuevos (sin especificar código)

```sql
INSERT INTO libros (titulo, precio)
VALUES ('Nuevo Libro', 15.00);
```

El sistema generará automáticamente un código como `LIB000001`.

### 3. Añadir Libros Nuevos (con código personalizado)

```sql
INSERT INTO libros (titulo, precio, codigo)
VALUES ('Libro Especial', 20.00, 'CUSTOM-001');
```

El libro usará el código `CUSTOM-001`.

## Helpers de Frontend

Se ha creado un archivo `src/utils/libroHelpers.ts` con funciones útiles:

```typescript
// Obtener el código a mostrar
const codigo = getLibroCodigo(libro);

// Formato con indicador de legacy
const codigoFormateado = formatLibroCodigo(libro);
// Resultado: "Legacy: OLD-123" o "LIB000001"
```

## Migración de Datos Futura

Cuando llegue el momento de importar los libros de la base de datos antigua:

1. Los libros tendrán su `legacy_id` original
2. El campo `codigo` se dejará vacío o null
3. El frontend mostrará el `legacy_id` automáticamente
4. Los nuevos libros seguirán usando el sistema de autogeneración

## Notas Importantes

- **No eliminar `legacy_id`**: Este campo es necesario para identificar libros de la base antigua
- **Secuencia independiente**: La secuencia de códigos nuevos es independiente y no afecta a los legacy codes
- **Códigos únicos**: Tanto `codigo` como `legacy_id` deben ser únicos (no pueden repetirse)
- **Migración gradual**: Puedes tener libros con `legacy_id`, otros con `codigo`, y ambos convivirán sin problemas
