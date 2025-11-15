# Normalización de Caracteres en Libros

## Problema

Los textos en la base de datos contienen caracteres mal codificados que aparecen como símbolos de interrogación:

```
1ª ed., 1ª imp. edición. rústica
```

Debería aparecer como:

```
1ª ed., 1ª imp. edición. rústica
```

## Solución Implementada

Se ha creado una **Edge Function de Supabase** que:

1. Lee todos los libros de la base de datos (usando `service_role` para bypass RLS)
2. Normaliza los caracteres mal codificados en campos: `titulo`, `autor`, `descripcion`, `ubicacion`
3. Actualiza solo los libros que tengan cambios

## Caracteres Corregidos

La función corrige estos caracteres comunes mal codificados:

| Mal codificado | Correcto | Descripción |
|----------------|----------|-------------|
| `�` | á, é, í, ó, ú | Vocales con tilde |
| `�` | Á, É, Í, Ó, Ú | Vocales con tilde mayúsculas |
| `�` | ñ, Ñ | Eñe |
| `�` | ü, Ü | Diéresis |
| `�` | ª, º | Símbolos ordinales |
| `�` | ¿, ¡ | Signos de puntuación |
| `�` | ", ' | Comillas |
| `�` | €, –, —, … | Otros símbolos |

## Despliegue de la Edge Function

### Opción 1: Desplegar manualmente desde Supabase Dashboard

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Navega a **Edge Functions**
3. Haz clic en **Deploy a new function**
4. Nombre: `normalizar-caracteres`
5. Copia y pega el contenido de:
   ```
   supabase/functions/normalizar-caracteres/index.ts
   ```
6. Haz clic en **Deploy**

### Opción 2: Desplegar usando Supabase CLI (si está disponible)

```bash
npx supabase functions deploy normalizar-caracteres
```

## Ejecución

Una vez desplegada la función, ejecuta:

```bash
node scripts/ejecutar-normalizacion.mjs
```

### Salida Esperada

```
🔄 Llamando a la función de normalización...

📡 URL: https://tu-proyecto.supabase.co/functions/v1/normalizar-caracteres

✨ Resultado de la normalización:

   📚 Total de libros: 79400
   ✅ Actualizados: 12543
   ⏭️  Sin cambios: 66857
   ❌ Errores: 0

✨ Normalización completada: 12543 libros actualizados, 66857 sin cambios, 0 errores
```

## Verificación

Después de ejecutar la normalización, puedes verificar los cambios:

1. Ve al **Admin Dashboard**
2. Busca libros que tenían caracteres extraños
3. Verifica que ahora muestren los caracteres correctamente

## Ejemplos de Correcciones

### Antes
```
- "1� ed., 1� imp. edici�n. r�stica"
- "Cat�logo de exposici�n"
- "Espa�a"
- "�ltima edici�n"
```

### Después
```
- "1ª ed., 1ª imp. edición. rústica"
- "Catálogo de exposición"
- "España"
- "Última edición"
```

## Notas Técnicas

- La función procesa libros en lotes de 10 para evitar sobrecargar la base de datos
- Usa `SUPABASE_SERVICE_ROLE_KEY` para bypass RLS y acceder a todos los libros
- Solo actualiza registros que tienen cambios (optimizado)
- Proporciona logs detallados del progreso

## Seguridad

- La función está protegida por autenticación de Supabase
- Solo usuarios autenticados pueden llamar a la función
- Usa service_role internamente pero no expone la clave
- Los cambios son permanentes - se recomienda hacer backup antes

## Troubleshooting

### Error: "Function not found"
- Verifica que la función esté desplegada correctamente
- Revisa el nombre de la función en el dashboard

### Error: "Unauthorized"
- Verifica que las variables de entorno estén configuradas
- Verifica que `VITE_SUPABASE_ANON_KEY` sea correcta

### Error: "Timeout"
- Si hay muchos libros, la función puede tardar
- La función procesa en lotes para evitar timeouts
- Revisa los logs en Supabase Dashboard > Edge Functions > Logs

## Mantenimiento

Esta función puede ejecutarse múltiples veces sin problemas:
- Solo actualiza registros que necesiten corrección
- No causa duplicados ni pérdida de datos
- Es idempotente (ejecutarla varias veces da el mismo resultado)

## Archivos Relacionados

- Edge Function: `supabase/functions/normalizar-caracteres/index.ts`
- Script de ejecución: `scripts/ejecutar-normalizacion.mjs`
- Script local (alternativa): `scripts/normalizar-caracteres.mjs` (no funciona por RLS)
