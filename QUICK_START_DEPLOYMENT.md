# ⚡ Quick Start: Deploy en 15 Minutos

Guía rápida para poner tu app en producción **HOY**.

---

## 🎯 Prerrequisitos (5 minutos)

- [ ] Cuenta en [Supabase](https://supabase.com) (gratis)
- [ ] Cuenta en [Netlify](https://www.netlify.com/) o [Vercel](https://vercel.com/) (gratis)
- [ ] Código en GitHub/GitLab
- [ ] Stripe configurado (modo test está bien para empezar)

---

## 🚀 Opción 1: Deploy con Netlify (MÁS FÁCIL)

### **Paso 1: Supabase (2 minutos)**

```bash
1. Ve a https://supabase.com/dashboard
2. Click "New Project"
   - Name: exlibris-prod
   - Database Password: [genera una segura]
   - Region: [la más cercana a tus usuarios]
3. Click "Create new project"
4. Espera 2 minutos mientras se crea
```

### **Paso 2: Obtener Credenciales (1 minuto)**

```bash
1. En tu proyecto Supabase:
2. Settings (⚙️) → API
3. Copia estos valores:
   - Project URL
   - anon public key
```

### **Paso 3: Aplicar Migraciones (3 minutos)**

```bash
1. Supabase Dashboard → SQL Editor
2. Abre cada archivo de supabase/migrations/ en tu proyecto
3. Copia el contenido
4. Pega en SQL Editor
5. Click "Run"
6. Repite para TODAS las migraciones en orden
```

**Orden de migraciones:**
```
20251001144742_create_invoices_tables.sql
20251001145918_update_invoice_policies.sql
20251001191609_create_complete_bookstore_schema.sql
20251002000000_fix_rls_circular_policies.sql
20251003000000_secure_rls_policies_final.sql
20251003100000_create_cart_table.sql
20251003110000_create_wishlist_table.sql
20251004000000_create_clientes_table.sql
20251006000000_add_external_products_support.sql
20251008000000_create_settings_table.sql
20251010000000_fix_function_security.sql
20251011000000_optimize_performance.sql
20251012000000_create_autores_table.sql
20251013000000_create_ubicaciones_table.sql
20251113000000_add_stripe_payment_fields.sql
```

### **Paso 4: Deploy en Netlify (5 minutos)**

```bash
1. Ve a https://netlify.com
2. Click "Add new site" → "Import from Git"
3. Selecciona tu repositorio de GitHub
4. Configurar:
   Build command: npm run build:prod
   Publish directory: dist
5. Click "Show advanced" → "Add environment variable"
6. Agregar:
   VITE_SUPABASE_URL = [tu URL de Supabase]
   VITE_SUPABASE_ANON_KEY = [tu anon key]
   VITE_STRIPE_PUBLISHABLE_KEY = [tu Stripe key]
7. Click "Deploy"
8. ¡Espera 2-3 minutos!
```

### **Paso 5: Configurar Dominio (Opcional)**

```bash
1. Netlify Dashboard → Domain settings
2. Add custom domain
3. Sigue las instrucciones de DNS
4. ¡Listo!
```

---

## 🚀 Opción 2: Deploy con Vercel

### **Pasos 1-3: Iguales que Netlify**

### **Paso 4: Deploy en Vercel**

```bash
1. Ve a https://vercel.com
2. "New Project" → Import de GitHub
3. Configurar:
   Framework Preset: Vite
   Build Command: npm run build:prod
   Output Directory: dist
4. Environment Variables:
   VITE_SUPABASE_URL = [tu URL]
   VITE_SUPABASE_ANON_KEY = [tu key]
   VITE_STRIPE_PUBLISHABLE_KEY = [tu Stripe key]
5. Click "Deploy"
6. ¡Espera 2-3 minutos!
```

---

## 🔧 Configuración Post-Deploy (5 minutos)

### **1. Crear Usuario Admin**

```bash
1. Ve a tu app: https://tu-app.netlify.app
2. Click "Registrarse"
3. Crea una cuenta con tu email
4. Ve a Supabase Dashboard → Authentication → Users
5. Encuentra tu usuario
6. Click en tu usuario
7. Busca "Raw User Meta Data"
8. Editar JSON:
   {
     "role": "admin"
   }
9. Guardar
10. Refresca tu app → Ya eres admin
```

### **2. Configurar Email (Importante)**

```bash
Supabase Dashboard → Authentication → Email Templates

Configura:
- Confirm signup
- Reset password
- Change email

Personaliza con tu marca
```

### **3. Configurar Storage (Para imágenes de libros)**

```bash
1. Supabase Dashboard → Storage
2. Create bucket: "book-covers"
3. Make public: Yes
4. Configure CORS
```

---

## ✅ Verificación (2 minutos)

### **Checklist:**

```bash
[ ] App carga sin errores
[ ] Puedes registrarte
[ ] Puedes hacer login
[ ] Puedes ver catálogo
[ ] Puedes agregar al carrito
[ ] Panel admin funciona (si eres admin)
[ ] No hay errores en consola
```

### **Probar en navegador:**

```bash
1. Abre https://tu-app.netlify.app
2. F12 → Console
3. No debe haber errores rojos
4. Registra una cuenta
5. Navega por el sitio
6. Todo debe funcionar
```

---

## 🐛 Problemas Comunes

### **"Página en blanco"**

```bash
Causa: Variables de entorno mal configuradas
Solución:
1. Netlify/Vercel → Site settings → Environment variables
2. Verificar que VITE_SUPABASE_URL está correcto
3. Debe tener https:// al inicio
4. Re-deploy
```

### **"No puedo hacer login"**

```bash
Causa: Migraciones no aplicadas
Solución:
1. Supabase → SQL Editor
2. Aplicar todas las migraciones en orden
3. Verificar que tablas existen:
   SELECT * FROM usuarios LIMIT 1;
```

### **"Errors 500 en requests"**

```bash
Causa: RLS bloqueando queries
Solución:
1. Supabase → Database → Tables
2. Verificar que RLS está habilitado
3. Verificar policies existen
```

---

## 📊 Monitoreo

### **Cada día revisa:**

```bash
1. Supabase Dashboard → Database → Usage
   → Ver queries lentas o errores

2. Netlify/Vercel → Analytics
   → Ver tráfico y errores

3. Stripe Dashboard
   → Ver pagos (cuando actives modo live)
```

---

## 🔄 Hacer Updates

### **Cuando quieras actualizar la app:**

```bash
1. Hacer cambios en tu código
2. git add .
3. git commit -m "feat: nueva funcionalidad"
4. git push origin main
5. Netlify/Vercel auto-deploya
6. ¡Listo! (2-3 minutos)
```

---

## 🔒 Stripe en Modo Live

### **Cuando estés listo para aceptar pagos reales:**

```bash
1. Stripe Dashboard → Developers → API keys
2. Copia tu "Live" publishable key (empieza con pk_live_)
3. Netlify/Vercel → Environment variables
4. Actualizar VITE_STRIPE_PUBLISHABLE_KEY
5. Re-deploy
6. ⚠️ IMPORTANTE: Configura webhooks en Stripe
```

---

## 🎉 ¡Felicidades!

Tu app está en producción y lista para recibir usuarios.

### **Próximos pasos:**

- [ ] Agregar dominio personalizado
- [ ] Configurar emails personalizados
- [ ] Agregar Google Analytics
- [ ] Configurar backups automáticos
- [ ] Agregar más libros al catálogo
- [ ] Invitar beta testers
- [ ] ¡Celebrar! 🎊

---

## 📞 Ayuda

Si tienes problemas:

1. Revisa console del navegador (F12)
2. Revisa logs en Netlify/Vercel
3. Revisa logs en Supabase
4. Lee GUIA_DEPLOYMENT.md para más detalles

**Recursos:**
- [Supabase Docs](https://supabase.com/docs)
- [Netlify Docs](https://docs.netlify.com/)
- [Vercel Docs](https://vercel.com/docs)

---

**¡Buena suerte con tu lanzamiento!** 🚀
