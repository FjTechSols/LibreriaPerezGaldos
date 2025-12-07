# Resumen: Códigos Automáticos por Ubicación

## Qué hace

El sistema ahora genera códigos de libros automáticamente según su ubicación:

| Ubicación | Código Generado | Ejemplo |
|-----------|-----------------|---------|
| almacen | Solo números | `001234` |
| Galeon | Números + G | `001234G` |
| Hortaleza | Números + H | `001234H` |
| Reina | Números + R | `001234R` |
| Abebooks | Números + Ab | `001234Ab` |

## Cuándo se aplica

1. **Al crear un libro nuevo**: Se genera automáticamente según la ubicación seleccionada
2. **Al editar un libro**: Si cambias la ubicación, el código se actualiza automáticamente
3. **Al importar libros**: Los códigos se generan según la ubicación en el archivo

## Ejemplos Rápidos

### Crear un libro

```
1. Vas al Admin Dashboard
2. Creas un nuevo libro
3. Seleccionas ubicación: "Galeon"
4. El código se genera automáticamente: "001234G"
```

### Cambiar ubicación

```
Libro existente: código 001234G en Galeon
Cambias ubicación a: Hortaleza
Código se actualiza a: 001234H
```

### Importar libros

```bash
# Los códigos se generan automáticamente según la columna "ubicacion"
node scripts/importar-libros.mjs scripts/libros.txt --confirm
```

## Migrar libros existentes

Si ya tienes libros en la base de datos con códigos antiguos:

```bash
# Ver qué se va a cambiar (sin modificar)
node scripts/migrar-codigos.mjs --dry-run

# Aplicar los cambios
node scripts/migrar-codigos.mjs
```

## Verificar en SQL

```sql
-- Ver códigos por ubicación
SELECT ubicacion, legacy_id, titulo
FROM libros
WHERE activo = true
ORDER BY ubicacion, id
LIMIT 20;
```

## Documentación completa

Para más detalles, consulta:
- [Documentación completa](./CODIGOS_AUTOMATICOS_POR_UBICACION.md)
