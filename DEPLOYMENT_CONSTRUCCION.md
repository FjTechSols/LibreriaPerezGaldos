# 🚧 Desplegar Página "En Construcción" con GitHub + Vercel

## ⚡ Método Recomendado: Rama de Git

Como tu proyecto está conectado a GitHub y Vercel, usa este método simple:

### Pasos:

1. **Crear rama de construcción:**
   ```bash
   git checkout -b construccion
   ```

2. **Configurar Vercel para usar la página de construcción:**
   ```bash
   # Renombrar la configuración
   cp vercel-construccion.json vercel.json

   # Hacer commit
   git add vercel.json
   git commit -m "Activar página en construcción"
   ```

3. **Push al repositorio:**
   ```bash
   git push origin construccion
   ```

4. **Cambiar rama de producción en Vercel:**
   - Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
   - Settings → Git
   - En "Production Branch" cambia de `main` a `construccion`
   - Vercel automáticamente desplegará la página de construcción

5. **¡Listo!** Tu sitio ahora muestra la página "En Construcción"

---

## 🔄 Cuando Estés Listo para Lanzar

Simplemente cambia la rama de producción de vuelta:

1. Ve a Vercel → Settings → Git
2. Cambia "Production Branch" de `construccion` a `main`
3. Vercel desplegará automáticamente tu aplicación completa

---

## 📝 Notas Importantes

- ✅ No necesitas crear un proyecto separado en Vercel
- ✅ Puedes seguir desarrollando en la rama `main` sin afectar producción
- ✅ Los cambios a `construccion` se despliegan automáticamente si haces push
- ✅ Mantén la rama `construccion` actualizada si necesitas cambiar algo en la página

---

## 🎨 Personalizar la Página

Antes de hacer push, edita `construccion.html`:

```html
<!-- Línea 97: Título -->
<h1>Librería Pérez Galdós</h1>

<!-- Línea 107: Email -->
<a href="mailto:FjtechSols@gmail.com">FjtechSols@gmail.com</a>
```

Si cambias colores, busca:
```css
/* Línea 71-83 */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

---

## 🆘 Si Algo Sale Mal

Para volver a la aplicación normal inmediatamente:

```bash
# En Vercel Dashboard
Settings → Git → Production Branch → Cambiar a "main"
```

O elimina la rama:
```bash
git checkout main
git branch -D construccion
git push origin --delete construccion
```

---

## 📋 Comandos Completos (Copy & Paste)

```bash
# 1. Crear y cambiar a rama construcción
git checkout -b construccion

# 2. Configurar Vercel
cp vercel-construccion.json vercel.json
git add vercel.json construccion.html
git commit -m "Activar página en construcción"

# 3. Push al repositorio
git push origin construccion

# 4. Ahora ve a Vercel Dashboard y cambia Production Branch a "construccion"
```

---

## 🔍 Preview de la Rama

Vercel automáticamente crea previews para cada rama:
- Tu rama `main` seguirá teniendo su preview en: `tu-proyecto-git-main.vercel.app`
- La rama `construccion` tendrá: `tu-proyecto-git-construccion.vercel.app`
- Producción mostrará la que configures en Settings

---

## ✨ Ventajas de Este Método

1. **Un solo proyecto** - No duplicas configuración
2. **Cambio instantáneo** - Solo cambias una configuración en Vercel
3. **Desarrollo continuo** - Sigues trabajando en `main` sin problemas
4. **Sin costos extra** - Vercel permite ramas ilimitadas
5. **Historial limpio** - Todo en Git, fácil de rastrear

---

## 🎯 Flujo de Trabajo Completo

```
main (desarrollo) -------- tu trabajo continúa aquí
  |
  └─ construccion -------- esta rama va a producción temporalmente
```

**Durante desarrollo:**
- Trabajas en `main`
- Producción muestra `construccion`
- Puedes probar `main` en: `tu-proyecto-git-main.vercel.app`

**Cuando lanzas:**
- Cambias producción a `main`
- Puedes eliminar rama `construccion`
