# 📚 ExLibris - Sistema de Gestión de Librería

Sistema completo de gestión para librerías con funcionalidades de e-commerce, inventario, facturación y gestión de pedidos.

---

## 🌟 Características Principales

### **Para Clientes:**
- ✅ Catálogo de libros con búsqueda avanzada
- ✅ Carrito de compras
- ✅ Lista de deseos
- ✅ Checkout con Stripe
- ✅ Historial de pedidos
- ✅ Sistema de autenticación seguro
- ✅ Recuperación de contraseña
- ✅ 2FA (Autenticación de dos factores)
- ✅ Modo oscuro/claro
- ✅ Multilenguaje (ES/EN)

### **Para Administradores:**
- ✅ Panel de administración completo
- ✅ Gestión de inventario
- ✅ Gestión de ubicaciones físicas
- ✅ Sistema de facturación
- ✅ Gestión de pedidos
- ✅ Gestión de clientes
- ✅ Reportes y estadísticas
- ✅ Configuración del sistema
- ✅ Backup de base de datos

---

## 🛠️ Stack Tecnológico

**Frontend:**
- React 18 + TypeScript
- Vite (Build tool)
- React Router 7
- CSS Modules
- Lucide Icons

**Backend:**
- Supabase (PostgreSQL + Auth + Storage)
- Row Level Security (RLS)
- Edge Functions

**Pagos:**
- Stripe (Checkout + Webhooks)

**Deployment:**
- Netlify / Vercel

---

## 📁 Estructura del Proyecto

```
exlibris/
├── src/
│   ├── components/          # Componentes reutilizables
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── BookCard.tsx
│   │   └── ...
│   ├── pages/              # Páginas de la aplicación
│   │   ├── Home.tsx
│   │   ├── Catalog.tsx
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── AdminDashboard.tsx
│   │   └── ...
│   ├── context/            # Context API de React
│   │   ├── AuthContext.tsx
│   │   ├── CartContext.tsx
│   │   ├── ThemeContext.tsx
│   │   └── ...
│   ├── services/           # Servicios y APIs
│   │   ├── libroService.ts
│   │   ├── pedidoService.ts
│   │   ├── facturaService.ts
│   │   └── ...
│   ├── styles/             # Estilos CSS
│   │   ├── components/
│   │   ├── pages/
│   │   └── utilities/
│   └── types/              # TypeScript types
│
├── supabase/
│   ├── migrations/         # Migraciones de BD
│   │   ├── 20251001*.sql
│   │   └── ...
│   └── functions/          # Edge Functions
│       ├── create-payment-intent/
│       └── stripe-webhook/
│
├── docs/                   # Documentación
│   ├── ADMIN_WEBMASTER.md
│   ├── DOCUMENTACION_*.md
│   └── ...
│
├── .env.development        # Variables desarrollo
├── .env.production         # Variables producción
├── .env.example            # Ejemplo de variables
│
├── GUIA_DEPLOYMENT.md      # Guía completa de deployment
├── QUICK_START_DEPLOYMENT.md  # Guía rápida
├── MIGRACIONES_PRODUCCION.md  # Guía de migraciones
│
└── package.json
```

---

## 🚀 Quick Start

### **Desarrollo Local:**

```bash
# 1. Clonar repositorio
git clone [tu-repo]
cd exlibris

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.development
# Editar .env.development con tus credenciales

# 4. Iniciar servidor de desarrollo
npm run dev

# 5. Abrir en navegador
# http://localhost:5173
```

---

## 📦 Comandos Disponibles

```bash
# Desarrollo
npm run dev              # Servidor desarrollo (puerto 5173)

# Build
npm run build            # Build para producción
npm run build:dev        # Build para desarrollo
npm run build:prod       # Build para producción

# Preview
npm run preview          # Preview del build
npm run preview:dev      # Preview build desarrollo
npm run preview:prod     # Preview build producción

# Calidad de código
npm run lint             # Verificar errores de ESLint
```

---

## 🗄️ Base de Datos

### **Tablas Principales:**

- **usuarios** - Usuarios del sistema
- **libros** - Inventario de libros
- **pedidos** - Pedidos de clientes
- **pedido_items** - Items de cada pedido
- **facturas** - Facturas generadas
- **factura_items** - Items de facturas
- **clientes** - Información de clientes
- **ubicaciones** - Ubicaciones físicas en almacén
- **autores** - Autores de libros
- **cart** - Carritos de compra
- **wishlist** - Listas de deseos
- **settings** - Configuración del sistema

### **Aplicar Migraciones:**

Lee `MIGRACIONES_PRODUCCION.md` para detalles completos.

**Desarrollo:**
```bash
# Supabase CLI
supabase link --project-ref TU_REF_DEV
supabase db push
```

**Producción:**
```bash
# Dashboard de Supabase → SQL Editor
# Copiar y ejecutar cada migración manualmente
```

---

## 🔐 Seguridad

### **Row Level Security (RLS):**

✅ Todas las tablas tienen RLS habilitado
✅ Políticas restrictivas por defecto
✅ Usuarios solo acceden a sus datos
✅ Admins tienen permisos elevados

### **Autenticación:**

- Email/Password con Supabase Auth
- 2FA opcional con TOTP
- Recuperación de contraseña
- Verificación de email
- Sesiones seguras

### **Pagos:**

- Stripe Checkout (PCI compliant)
- Webhooks para confirmación
- Test mode para desarrollo
- Live mode para producción

---

## 🌍 Deployment

### **Opción 1: Netlify (Recomendado)**

```bash
1. Conecta tu repo de GitHub
2. Build command: npm run build:prod
3. Publish directory: dist
4. Variables de entorno: Ver .env.production
5. Deploy automático en cada push
```

### **Opción 2: Vercel**

```bash
1. Import de GitHub
2. Framework: Vite
3. Build: npm run build:prod
4. Output: dist
5. Variables de entorno
6. Deploy
```

### **Documentación Completa:**

- **Guía Completa:** `GUIA_DEPLOYMENT.md`
- **Quick Start:** `QUICK_START_DEPLOYMENT.md`
- **Migraciones:** `MIGRACIONES_PRODUCCION.md`

---

## 🔧 Configuración

### **Variables de Entorno Requeridas:**

```env
# Supabase
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_o_pk_live_tu_clave
```

### **Entornos:**

- **Desarrollo:** `.env.development`
- **Producción:** `.env.production`
- **Local override:** `.env.local` (no se commitea)

---

## 📊 Flujo de Trabajo

### **Desarrollo:**

```bash
1. Crear rama: git checkout -b feature/nueva-funcionalidad
2. Desarrollar en local: npm run dev
3. Probar cambios
4. Commit: git commit -m "feat: descripción"
5. Push: git push origin feature/nueva-funcionalidad
6. Pull Request
7. Mergear a main
8. Auto-deploy a producción
```

### **Migraciones:**

```bash
1. Crear migración en supabase/migrations/
2. Aplicar a desarrollo
3. Probar en desarrollo
4. Aplicar a producción
5. Verificar en producción
```

---

## 🧪 Testing

### **Manual Testing:**

```bash
# Antes de cada deploy:
[ ] Login/Logout funciona
[ ] Registro de usuario funciona
[ ] Catálogo carga
[ ] Búsqueda funciona
[ ] Carrito funciona
[ ] Checkout funciona (modo test)
[ ] Panel admin funciona
[ ] No hay errores en console
```

### **Build Testing:**

```bash
npm run build:prod
npm run preview:prod
# Probar en http://localhost:4173
```

---

## 📈 Monitoreo

### **Métricas a Revisar:**

**Supabase:**
- Database → Usage (queries, storage)
- Auth → Users (usuarios registrados)
- Logs → Errors

**Netlify/Vercel:**
- Analytics → Tráfico
- Functions → Logs de edge functions
- Errors → Errores reportados

**Stripe:**
- Payments → Transacciones
- Customers → Clientes
- Webhooks → Events

---

## 🐛 Troubleshooting

### **App no carga:**
```bash
1. Verificar variables de entorno
2. Revisar console del navegador (F12)
3. Verificar que build fue exitoso
4. Revisar logs de Netlify/Vercel
```

### **Errores de base de datos:**
```bash
1. Verificar que migraciones están aplicadas
2. Verificar RLS policies
3. Revisar logs de Supabase
4. Verificar permisos de usuario
```

### **Pagos no funcionan:**
```bash
1. Verificar clave de Stripe correcta
2. Modo test vs live
3. Webhooks configurados
4. Edge functions deployadas
```

---

## 📚 Documentación Adicional

### **En `/docs`:**

- **ADMIN_WEBMASTER.md** - Guía para webmasters
- **DOCUMENTACION_BACKEND.md** - Arquitectura backend
- **DOCUMENTACION_FRONTEND.md** - Arquitectura frontend
- **DOCUMENTACION_FACTURACION.md** - Sistema de facturación
- **DOCUMENTACION_PEDIDOS.md** - Sistema de pedidos
- **INTEGRACION_STRIPE.md** - Integración de pagos
- **VERIFICACION_EMAIL.md** - Sistema de emails

### **En raíz del proyecto:**

- **GUIA_DEPLOYMENT.md** - Deployment completo
- **QUICK_START_DEPLOYMENT.md** - Guía rápida
- **MIGRACIONES_PRODUCCION.md** - Gestión de BD

---

## 🤝 Contribuir

### **Convenciones:**

- **Commits:** Conventional Commits
  - `feat:` Nueva funcionalidad
  - `fix:` Corrección de bug
  - `docs:` Documentación
  - `style:` Formato de código
  - `refactor:` Refactorización
  - `test:` Tests
  - `chore:` Mantenimiento

- **Branches:**
  - `main` - Producción
  - `develop` - Desarrollo
  - `feature/*` - Nuevas funcionalidades
  - `fix/*` - Correcciones
  - `hotfix/*` - Correcciones urgentes

---

## 📝 Licencia

[Tu licencia aquí]

---

## 👥 Equipo

[Tu información aquí]

---

## 📞 Soporte

Para preguntas o problemas:
- Email: [tu-email]
- Documentación: Ver carpeta `/docs`
- Issues: GitHub Issues

---

**¡Gracias por usar ExLibris!** 📚✨
