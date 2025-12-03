# Desplegar Página "En Construcción" en Vercel

Esta guía te muestra cómo desplegar una página temporal "En Construcción" en Vercel mientras desarrollas tu plataforma.

## Opción 1: Proyecto Separado (Recomendado)

Esta es la forma más simple y segura. Creas un proyecto de Vercel separado solo para la página de construcción.

### Pasos:

1. **Crear carpeta separada en tu computadora:**
   ```bash
   mkdir libreria-construccion
   cd libreria-construccion
   ```

2. **Copiar el archivo de construcción:**
   - Copia el archivo `construccion.html` a esta nueva carpeta
   - Renómbralo a `index.html`:
   ```bash
   cp ../project/construccion.html index.html
   ```

3. **Desplegar en Vercel:**

   **Opción A - Usando Vercel CLI:**
   ```bash
   # Instalar Vercel CLI si no lo tienes
   npm i -g vercel

   # Iniciar sesión
   vercel login

   # Desplegar
   vercel --prod
   ```

   **Opción B - Usando la Web:**
   - Ve a [vercel.com](https://vercel.com)
   - Click en "Add New" → "Project"
   - Arrastra la carpeta `libreria-construccion` o súbela
   - Click en "Deploy"

4. **Configurar el dominio:**
   - Una vez desplegado, ve a "Settings" → "Domains"
   - Agrega tu dominio personalizado (ej: `perezgaldos.com`)
   - Sigue las instrucciones para configurar los DNS

---

## Opción 2: Usar Rama Temporal

Mantén el mismo proyecto pero usa una rama diferente para la página de construcción.

### Pasos:

1. **Crear rama de construcción:**
   ```bash
   # Asegúrate de estar en la rama principal
   git checkout main

   # Crear nueva rama
   git checkout -b construccion
   ```

2. **Modificar el proyecto:**
   ```bash
   # Renombrar vercel-construccion.json a vercel.json
   cp vercel-construccion.json vercel.json

   # Commit los cambios
   git add vercel.json
   git commit -m "Agregar página de construcción"

   # Push de la rama
   git push origin construccion
   ```

3. **Configurar Vercel:**
   - Ve a tu proyecto en Vercel Dashboard
   - Settings → Git → Production Branch
   - Cambia de `main` a `construccion`
   - Vercel automáticamente desplegará la página de construcción

4. **Para volver al proyecto normal:**
   - Cambia Production Branch de vuelta a `main`
   - Vercel desplegará la aplicación completa

---

## Opción 3: Variable de Entorno

Controla qué mostrar usando una variable de entorno en Vercel.

### Pasos:

1. **Crear archivo de mantenimiento:**

   Crea `public/mantenimiento.html` en tu proyecto (copia el contenido de `construccion.html`)

2. **Modificar vercel.json:**
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "package.json",
         "use": "@vercel/static-build",
         "config": {
           "distDir": "dist"
         }
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "/mantenimiento.html",
         "headers": {
           "cache-control": "s-maxage=0"
         },
         "continue": true,
         "status": 503,
         "when": {
           "env": {
             "MAINTENANCE_MODE": "true"
           }
         }
       },
       {
         "src": "/(.*)",
         "dest": "/index.html"
       }
     ]
   }
   ```

3. **Configurar en Vercel:**
   - Ve a Settings → Environment Variables
   - Agrega: `MAINTENANCE_MODE` = `true`
   - Redeploy el proyecto

4. **Para desactivar el modo mantenimiento:**
   - Elimina la variable `MAINTENANCE_MODE`
   - O cámbiala a `false`
   - Redeploy

---

## Opción 4: Reemplazar temporalmente index.html

La forma más rápida pero menos profesional.

### Pasos:

1. **Backup del index.html original:**
   ```bash
   cp index.html index.html.backup
   ```

2. **Reemplazar con página de construcción:**
   ```bash
   cp construccion.html index.html
   ```

3. **Build y deploy:**
   ```bash
   npm run build
   vercel --prod
   ```

4. **Para restaurar:**
   ```bash
   cp index.html.backup index.html
   npm run build
   vercel --prod
   ```

---

## Personalizar la Página de Construcción

El archivo `construccion.html` es completamente personalizable. Puedes modificar:

### Colores
Busca estos valores en el CSS:
```css
/* Gradiente de fondo */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Cambia los colores a tu preferencia */
background: linear-gradient(135deg, #tu-color-1 0%, #tu-color-2 100%);
```

### Textos
```html
<h1>Librería Pérez Galdós</h1>
<p class="subtitle">¡Próximamente!</p>
```

### Email de Contacto
```html
<a href="mailto:TU-EMAIL@gmail.com" class="contact-link">TU-EMAIL@gmail.com</a>
```

### Logo
Si tienes un logo, reemplaza el SVG:
```html
<div class="logo">
    <img src="tu-logo.png" alt="Logo" style="width: 100%; height: auto;">
</div>
```

### Features
```html
<div class="features">
    <div class="feature">
        <div class="feature-icon">📚</div>
        <div class="feature-text">Tu Feature</div>
    </div>
    <!-- Agrega más features -->
</div>
```

---

## Recomendación

**Para producción:** Usa la **Opción 1** (Proyecto Separado) por estas razones:

✅ **Ventajas:**
- Simple y rápido
- No afecta tu proyecto principal
- No requiere configuración compleja
- Fácil de mantener
- Puedes tener ambos proyectos activos

❌ **Desventajas:**
- Necesitas dos proyectos en Vercel (pero es gratis)

**Para desarrollo:** Usa la **Opción 2** (Rama Temporal) porque:
- Mantienes todo en un solo proyecto
- Fácil cambiar entre construcción y producción
- Historial de Git limpio

---

## Verificar el Deployment

Después de desplegar, verifica que:

1. ✅ La página carga correctamente
2. ✅ El diseño se ve bien en móvil
3. ✅ El email de contacto funciona
4. ✅ No hay errores en la consola del navegador
5. ✅ La página tiene buena velocidad (usa [PageSpeed Insights](https://pagespeed.web.dev/))

---

## Problemas Comunes

### La página no se actualiza
- Limpia caché: Ctrl+Shift+R (Windows) o Cmd+Shift+R (Mac)
- En Vercel: Settings → Deployments → Click en el último → "Redeploy"

### El dominio no funciona
- Verifica configuración DNS (puede tomar hasta 48 horas)
- En Vercel: Settings → Domains → Verifica el estado

### Errores 404
- Verifica que el archivo se llame exactamente `index.html`
- Verifica la configuración de `vercel.json`

---

## Cuando Estés Listo para Lanzar

1. Si usaste Opción 1: Despliega el proyecto principal en Vercel y configura el dominio ahí
2. Si usaste Opción 2: Cambia Production Branch a `main`
3. Si usaste Opción 3: Elimina `MAINTENANCE_MODE`
4. Si usaste Opción 4: Restaura `index.html` original

¡Listo! Tu página de construcción está activa mientras desarrollas.
