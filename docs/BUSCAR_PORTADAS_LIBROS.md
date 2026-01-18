# Buscar y Actualizar Portadas de Libros

Este documento explica cómo buscar y actualizar automáticamente las portadas de los libros en la base de datos.

## Imagen por Defecto

Si no se proporciona una portada para un libro, se utilizará automáticamente una imagen por defecto de alta calidad:

```
https://images.pexels.com/photos/256450/pexels-photo-256450.jpeg?auto=compress&cs=tinysrgb&w=400
```

Esta imagen se aplica automáticamente en los siguientes casos:
- Cuando se crea un libro sin especificar URL de portada
- Cuando no se encuentra una portada en Google Books API
- Cuando un libro tiene `imagen_url` vacío o `null`

## Script Automático de Búsqueda

### Comando

Para buscar y actualizar portadas de libros automáticamente:

```bash
npm run buscar:portadas
```

### Funcionamiento

El script `buscar-portadas.mjs` realiza las siguientes acciones:

1. **Busca libros sin portada** en la base de datos
2. **Intenta buscar la portada usando el ISBN** en Google Books API
3. Si no se encuentra por ISBN, **busca por título y autor**
4. Si no se encuentra ninguna portada, **usa la imagen por defecto**
5. **Actualiza la base de datos** con la URL de la portada encontrada

### Características

- ✅ Busca en Google Books API usando ISBN
- ✅ Búsqueda alternativa por título y autor
- ✅ Usa imagen por defecto si no encuentra portada
- ✅ Respeta límites de API (500ms entre peticiones)
- ✅ Muestra progreso detallado en consola
- ✅ Maneja errores gracefully

### Ejemplo de Salida

```
🔍 Buscando libros sin portada...

📚 Encontrados 5 libros sin portada

📖 Procesando: "Cien años de soledad" por Gabriel García Márquez
   ID: 123 | ISBN: 9780307474728
  ✅ Portada encontrada en Google Books
  💾 Portada actualizada exitosamente

📖 Procesando: "Don Quijote de la Mancha" por Miguel de Cervantes
   ID: 124 | ISBN: N/A
  ✅ Portada encontrada por título/autor
  💾 Portada actualizada exitosamente

============================================================
📊 RESUMEN
============================================================
✅ Libros actualizados: 5
⚠️  Libros sin cambios: 0
📚 Total procesados: 5
============================================================

✨ Proceso completado
```

## Actualizar Portada Manualmente

### Desde el Panel de Administración

1. Ve al **Panel de Administración**
2. Busca el libro que quieres editar
3. Haz clic en **Editar**
4. En el campo **URL de Portada**, pega la URL de la imagen
5. Haz clic en **Guardar**

### Campo de URL de Portada

- Es **opcional**
- Si se deja vacío, se usará la imagen por defecto
- Acepta cualquier URL válida de imagen
- Formatos recomendados: JPG, PNG, WebP
- Tamaño recomendado: 300-400px de ancho

## Buscar Portadas de Buena Calidad

### Fuentes Recomendadas

1. **Google Books**
   - Busca el libro en books.google.com
   - Clic derecho en la portada → Copiar dirección de imagen

2. **Open Library**
   - Visita openlibrary.org
   - Busca por ISBN
   - Descarga o copia URL de la portada

3. **Amazon**
   - Busca el libro en Amazon
   - Clic derecho en la portada → Copiar dirección de imagen

4. **Pexels** (imágenes genéricas)
   - pexels.com
   - Busca "book cover" o "vintage book"

### Formato de URL

Asegúrate de que la URL:
- Comience con `https://`
- Termine en `.jpg`, `.jpeg`, `.png`, o `.webp`
- Sea accesible públicamente (no requiera login)

## Consideraciones

### Google Books API

- **Sin límite estricto** para uso razonable
- El script incluye delays de 500ms entre peticiones
- No requiere API key para búsquedas básicas

### Calidad de Imágenes

Las portadas de Google Books suelen tener estos tamaños:
- `thumbnail`: 128x192px
- `smallThumbnail`: 80x120px

El script automáticamente intenta obtener la versión más grande (`zoom=2`).

### Privacidad y Copyright

- Solo usa portadas de fuentes legítimas
- No redistribuyas las imágenes fuera de tu aplicación
- Google Books permite uso para preview y links

## Troubleshooting

### Error: "No se encontraron libros sin portada"

✅ Todos tus libros ya tienen portada asignada

### Error: "Error al obtener libros"

❌ Verifica la conexión a Supabase
- Revisa las variables de entorno en `.env`
- Verifica que `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` estén correctas

### Portadas no se ven

❌ La URL puede estar rota o bloqueada
- Verifica que la URL funcione en el navegador
- Algunas URLs tienen protección CORS
- Prueba con otra fuente de imágenes

## Mantenimiento

### Actualizar Portadas Periódicamente

Se recomienda ejecutar el script:
- Después de importar libros masivamente
- Mensualmente para libros nuevos
- Cuando se detecten portadas rotas

### Verificar Portadas

```bash
# Ver libros sin portada
npm run buscar:portadas
```

El script solo procesa libros que no tienen portada, por lo que es seguro ejecutarlo múltiples veces.
