# 🚀 Guía de Deployment: Desarrollo y Producción

Esta guía explica cómo configurar y desplegar tu aplicación en **dos entornos separados**: Desarrollo y Producción.

---

## 📋 Tabla de Contenidos

1. [Estrategia de Entornos](#estrategia-de-entornos)
2. [Configuración Inicial](#configuración-inicial)
3. [Desarrollo Local](#desarrollo-local)
4. [Deployment a Producción](#deployment-a-producción)
5. [Mantenimiento](#mantenimiento)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 Estrategia de Entornos

### **¿Por qué dos entornos?**

| Entorno | Propósito | Usuarios | Datos |
|---------|-----------|----------|-------|
| **Desarrollo** | Pruebas, desarrollo, experimentación | Equipo de desarrollo | Datos de prueba |
| **Producción** | Aplicación real para clientes | Clientes finales | Datos reales |

### **Ventajas:**
- ✅ Los clientes nunca ven código en desarrollo
- ✅ Puedes probar cambios sin afectar producción
- ✅ Datos de clientes están protegidos
- ✅ Mayor seguridad y estabilidad

---

## 🛠️ Configuración Inicial

### **Paso 1: Crear Proyectos en Supabase**

#### **Proyecto de Desarrollo**

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Click en "New Project"
3. Nombre: `exlibris-dev` (o el que prefieras)
4. Región: Elige la más cercana
5. Contraseña de base de datos: Guárdala de forma segura
6. Click "Create new project"

#### **Proyecto de Producción**

1. Repite el proceso anterior
2. Nombre: `exlibris-prod`
3. **IMPORTANTE:** Usa una contraseña DIFERENTE

### **Paso 2: Obtener Credenciales**

Para cada proyecto, ve a:
- **Settings** → **API**
- Copia:
  - `Project URL`
  - `anon/public key`

### **Paso 3: Configurar Variables de Entorno**

#### **Archivo: `.env.development`**
```env
# DESARROLLO
VITE_SUPABASE_URL=https://tu-proyecto-dev.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_dev

# Stripe Test Mode
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_tu_clave_test
```

#### **Archivo: `.env.production`**
```env
# PRODUCCIÓN
VITE_SUPABASE_URL=https://tu-proyecto-prod.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_prod

# Stripe Live Mode
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_tu_clave_real
```

---

## 💻 Desarrollo Local

### **Trabajar en Desarrollo:**

```bash
# Iniciar servidor de desarrollo
npm run dev

# La app usa automáticamente .env.development
# Conecta a la base de datos de desarrollo
```

### **Probar Build de Desarrollo:**

```bash
# Compilar para desarrollo
npm run build:dev

# Ver preview del build
npm run preview:dev
```

### **Aplicar Migraciones a Desarrollo:**

Cada vez que hagas cambios en la base de datos:

```bash
# Aplica las migraciones al proyecto de desarrollo
# (Debes configurar el proyecto dev en Supabase CLI)
```

---

## 🌐 Deployment a Producción

### **Opción 1: Netlify (Recomendado)**

#### **Configuración Inicial:**

1. **Conectar Repositorio:**
   - Ve a [Netlify](https://www.netlify.com/)
   - "New site from Git"
   - Conecta tu repositorio de GitHub/GitLab

2. **Configurar Build:**
   ```
   Build command: npm run build:prod
   Publish directory: dist
   ```

3. **Variables de Entorno:**
   - En Netlify Dashboard → Site settings → Environment variables
   - Agregar:
     ```
     VITE_SUPABASE_URL = tu-url-produccion
     VITE_SUPABASE_ANON_KEY = tu-key-produccion
     VITE_STRIPE_PUBLISHABLE_KEY = pk_live_tu_clave
     ```

4. **Deploy:**
   - Netlify automáticamente hace deploy en cada push a `main`
   - O manualmente: "Trigger deploy"

#### **Configurar Dominio Personalizado:**

```
Site settings → Domain management
→ Add custom domain → tu-dominio.com
→ Configurar DNS según instrucciones
```

---

### **Opción 2: Vercel**

#### **Configuración:**

1. **Conectar:**
   - Ve a [Vercel](https://vercel.com/)
   - "Import Project"
   - Conecta tu repositorio

2. **Build Settings:**
   ```
   Framework Preset: Vite
   Build Command: npm run build:prod
   Output Directory: dist
   ```

3. **Environment Variables:**
   - Settings → Environment Variables
   - Agregar las mismas variables de producción

4. **Deploy:**
   - Auto-deploy en cada push
   - O: `vercel --prod`

---

### **Opción 3: Deploy Manual (VPS/Servidor)**

#### **En tu servidor:**

```bash
# 1. Clonar repositorio
git clone tu-repositorio.git
cd tu-proyecto

# 2. Instalar dependencias
npm install

# 3. Configurar .env.production con tus credenciales

# 4. Compilar para producción
npm run build:prod

# 5. Servir con Nginx/Apache
# Los archivos compilados están en /dist
```

#### **Nginx Config Example:**

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    root /ruta/a/tu/proyecto/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 🔄 Workflow Completo

### **Desarrollo Diario:**

```bash
# 1. Hacer cambios en el código
git checkout -b feature/nueva-funcionalidad

# 2. Probar localmente (usa DB dev)
npm run dev

# 3. Hacer commit
git add .
git commit -m "feat: nueva funcionalidad"

# 4. Push a GitHub
git push origin feature/nueva-funcionalidad

# 5. Crear Pull Request
# 6. Mergear a main después de revisión
```

### **Deploy a Producción:**

```bash
# Automático (Netlify/Vercel):
# - Merge a main → Auto-deploy

# Manual:
git checkout main
git pull
npm run build:prod
# Subir archivos de /dist a servidor
```

---

## 🗄️ Migraciones de Base de Datos

### **Aplicar a Desarrollo:**

Cuando creas/modificas tablas:

1. Crea el archivo de migración en `supabase/migrations/`
2. Aplica a desarrollo primero:
   ```bash
   # Conectar a proyecto dev
   supabase link --project-ref tu-ref-dev

   # Aplicar migraciones
   supabase db push
   ```

### **Aplicar a Producción:**

⚠️ **SOLO cuando estés 100% seguro:**

```bash
# Conectar a proyecto prod
supabase link --project-ref tu-ref-prod

# Aplicar migraciones
supabase db push
```

### **Backup Antes de Migrar Producción:**

```bash
# Desde Supabase Dashboard:
Database → Backups → Create backup
```

---

## 🔒 Seguridad

### **Checklist de Seguridad:**

- [ ] `.env` está en `.gitignore`
- [ ] Variables de producción NUNCA en código
- [ ] RLS (Row Level Security) habilitado en todas las tablas
- [ ] Stripe usa claves de producción en prod
- [ ] HTTPS habilitado en dominio de producción
- [ ] Passwords de admin son fuertes
- [ ] Backups automáticos configurados

---

## 🧪 Testing Antes de Producción

### **Checklist Pre-Deploy:**

```bash
# 1. Lint
npm run lint

# 2. Build exitoso
npm run build:prod

# 3. Preview del build
npm run preview:prod

# 4. Probar funcionalidades críticas:
- [ ] Login/Register
- [ ] Búsqueda de libros
- [ ] Carrito de compras
- [ ] Checkout con Stripe
- [ ] Panel de admin
- [ ] Recuperación de contraseña

# 5. Revisar console del navegador
# No debe haber errores
```

---

## 📊 Monitoreo de Producción

### **Métricas a Revisar:**

**En Supabase Dashboard (Producción):**
- Database → Usage → Revisar queries lentas
- Auth → Users → Usuarios registrados
- Storage → Usage → Espacio usado

**En Netlify/Vercel:**
- Analytics → Visitas
- Functions → Logs de edge functions
- Errors → Errores reportados

---

## 🐛 Troubleshooting

### **Problema: "Página en blanco en producción"**

```bash
# Verificar build
npm run build:prod
npm run preview:prod

# Revisar console del navegador
# Buscar errores de CORS o API
```

### **Problema: "No se conecta a base de datos"**

```bash
# Verificar variables de entorno
# En Netlify/Vercel, revisar Environment Variables

# Verificar que VITE_SUPABASE_URL es correcto
# Debe empezar con https://
```

### **Problema: "Stripe no funciona en producción"**

```bash
# Verificar que usas pk_live_ en producción
# NO pk_test_

# Activar Stripe en modo Live
# Dashboard de Stripe → Developers → API keys
```

---

## 📝 Notas Importantes

### **¿Cuándo Deployar a Producción?**

✅ **Deployar cuando:**
- Código probado localmente
- Build exitoso
- PR revisado y aprobado
- Funcionalidades críticas funcionan
- No hay errores en console

❌ **NO deployar cuando:**
- Código sin probar
- Build con errores
- Funcionalidades a medias
- Hay bugs conocidos sin resolver

### **Rollback Rápido:**

Si algo sale mal en producción:

**Netlify:**
```
Deploys → Click en deploy anterior → "Publish deploy"
```

**Vercel:**
```
Deployments → Deploy anterior → ⋯ → "Promote to Production"
```

---

## 🎯 Resumen de Comandos

```bash
# Desarrollo
npm run dev              # Servidor desarrollo
npm run build:dev        # Build desarrollo
npm run preview:dev      # Preview build dev

# Producción
npm run build:prod       # Build producción
npm run preview:prod     # Preview build prod

# Útiles
npm run lint            # Verificar código
```

---

## 📞 Recursos

- [Supabase Docs](https://supabase.com/docs)
- [Vite Env Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Netlify Deploy](https://docs.netlify.com/)
- [Vercel Deploy](https://vercel.com/docs)

---

## ✅ Checklist Final

Antes del primer deploy a producción:

- [ ] Proyecto de producción en Supabase creado
- [ ] Todas las migraciones aplicadas a prod
- [ ] Variables de entorno configuradas
- [ ] Stripe en modo LIVE
- [ ] Dominio configurado con HTTPS
- [ ] Backup de base de datos creado
- [ ] RLS policies verificadas
- [ ] Email de recuperación de contraseña funciona
- [ ] Todas las funcionalidades probadas
- [ ] No hay credenciales hardcodeadas en código

**¡Listo para producción!** 🚀
