# Web de Librería Pérez Galdós

Aplicación React, TypeScript y Vite. Esta carpeta es la raíz del repositorio Git; conserva el historial y el remoto originales. Los proyectos hermanos quedan fuera de este repositorio.

## Desarrollo

Ejecutar desde esta carpeta:

```sh
npm ci
npm run dev
npm run build
npm test -- --run
```

Crear `.env.local` usando `.env.example` como referencia y completar los valores de Supabase y Stripe. No subir credenciales.

## Automatización y despliegue

El workflow de AbeBooks está en `.github/workflows/abebooks-sync.yml` y ejecuta sus comandos desde la raíz del repositorio.

En Vercel, mantener **Root Directory** en la raíz del repositorio (vacío o `.`), comando de compilación `npm run build` y salida `dist`. La carpeta local se llama `web`, pero su contenido ocupa la raíz al clonar el repositorio. La configuración de rutas está en `vercel.json`.

## Verificación del traslado

Todos los archivos versionados están presentes. La compilación de producción y los 51 tests pasan.

No se ha encontrado un archivo local `.env` o `.env.local`; para usar Supabase y Stripe deben configurarse sus variables. Las variables de producción se configuran en el proveedor de despliegue.

Los comandos `sb*`, `import:books` y `buscar:portadas` ya apuntaban a scripts ausentes antes del traslado (`supabase-safe.mjs`, `importar-libros.mjs` y `buscar-portadas.mjs`). Es necesario recuperarlos antes de usar esos comandos.
