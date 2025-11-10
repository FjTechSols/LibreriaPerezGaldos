# Guía de Incorporación al Proyecto - Sistema de Librería

## Bienvenido al Equipo

Esta guía te ayudará a configurar tu entorno de desarrollo y comenzar a trabajar en el proyecto de la Librería Perez Galdos.

---

## Índice
1. [Requisitos Previos](#requisitos-previos)
2. [Configuración Inicial](#configuración-inicial)
3. [Estructura del Proyecto](#estructura-del-proyecto)
4. [Flujo de Trabajo](#flujo-de-trabajo)
5. [Comandos Principales](#comandos-principales)
6. [Convenciones de Código](#convenciones-de-código)
7. [Recursos y Documentación](#recursos-y-documentación)
8. [Preguntas Frecuentes](#preguntas-frecuentes)
9. [Contacto](#contacto)

---

## Requisitos Previos

### Software Necesario

| Software | Versión Mínima | Descarga |
|----------|----------------|----------|
| Node.js | 18.0+ | [nodejs.org](https://nodejs.org) |
| npm | 9.0+ | Incluido con Node.js |
| Git | 2.30+ | [git-scm.com](https://git-scm.com) |
| Visual Studio Code | Latest | [code.visualstudio.com](https://code.visualstudio.com) |

### Extensiones Recomendadas para VS Code

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "formulahendry.auto-rename-tag",
    "dsznajder.es7-react-js-snippets",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

### Conocimientos Requeridos

- ✅ JavaScript/TypeScript
- ✅ React 18+
- ✅ React Router
- ✅ Context API
- ✅ CSS/Tailwind
- ✅ PostgreSQL (básico)
- ✅ Git (básico)

### Conocimientos Opcionales (Ayudan)

- Supabase
- React Hooks avanzados
- RLS (Row Level Security)
- jsPDF
- Vite

---

## Configuración Inicial

### 1. Clonar el Repositorio

```bash
# Clonar el proyecto
git clone <url-del-repositorio>
cd proyecto-libreria

# Crear tu rama de trabajo
git checkout -b feature/tu-nombre
```

### 2. Instalar Dependencias

```bash
# Instalar todas las dependencias
npm install

# Verificar instalación
npm run dev
```

Deberías ver:
```
VITE v5.4.8  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### 3. Configurar Variables de Entorno

Crear archivo `.env` en la raíz del proyecto:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui

# Optional (solo para scripts de backend)
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

**¿Dónde obtener estas credenciales?**

1. Ve a [supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona el proyecto "Libreria Perez Galdos"
3. Ve a **Settings** → **API**
4. Copia:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** → `VITE_SUPABASE_ANON_KEY`

### 4. Verificar Conexión a Supabase

```bash
# Ejecutar el proyecto
npm run dev

# Abrir http://localhost:5173
# Intentar iniciar sesión o navegar por el catálogo
```

Si ves libros o puedes navegar, ¡la conexión está funcionando! ✅

---

## Estructura del Proyecto

```
proyecto-libreria/
│
├── public/                          # Archivos estáticos
│   └── Logo Exlibris Perez Galdos.png
│
├── src/                             # Código fuente
│   ├── components/                  # Componentes reutilizables
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── BookCard.tsx
│   │   └── ...
│   │
│   ├── pages/                       # Páginas principales
│   │   ├── Home.tsx
│   │   ├── Catalog.tsx
│   │   ├── AdminDashboard.tsx
│   │   └── ...
│   │
│   ├── context/                     # Estado global (Context API)
│   │   ├── AuthContext.tsx
│   │   ├── CartContext.tsx
│   │   └── ...
│   │
│   ├── services/                    # Servicios de API
│   │   ├── libroService.ts
│   │   ├── pedidoService.ts
│   │   └── ...
│   │
│   ├── types/                       # Tipos TypeScript
│   │   └── index.ts
│   │
│   ├── styles/                      # Estilos CSS
│   │   ├── components/
│   │   ├── pages/
│   │   └── utilities/
│   │
│   ├── utils/                       # Utilidades
│   │   └── libroHelpers.ts
│   │
│   ├── lib/                         # Configuraciones
│   │   └── supabase.ts
│   │
│   ├── App.tsx                      # Componente principal
│   └── main.tsx                     # Entry point
│
├── supabase/                        # Migraciones de BD
│   └── migrations/
│       ├── 20251001...sql
│       └── ...
│
├── docs/                            # Documentación
│   ├── DOCUMENTACION_BACKEND.md
│   ├── DOCUMENTACION_FRONTEND.md
│   └── GUIA_INCORPORACION_DESARROLLADOR.md
│
├── .env                             # Variables de entorno (NO commitear)
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## Flujo de Trabajo

### 1. Antes de Empezar una Nueva Tarea

```bash
# Actualizar tu rama con los últimos cambios
git checkout main
git pull origin main

# Crear una nueva rama para tu tarea
git checkout -b feature/nombre-descriptivo
```

**Convención de nombres de ramas:**
- `feature/` - Nueva funcionalidad
- `fix/` - Corrección de bug
- `refactor/` - Refactorización
- `docs/` - Documentación

Ejemplos:
```
feature/agregar-filtro-autores
fix/corregir-calculo-precio
refactor/optimizar-consultas-libros
docs/actualizar-readme
```

### 2. Desarrollo

```bash
# Ejecutar en modo desarrollo
npm run dev

# El proyecto se recarga automáticamente al guardar cambios
```

### 3. Testing Local

Antes de commitear:

1. ✅ Verificar que el código compila sin errores
2. ✅ Probar la funcionalidad manualmente
3. ✅ Verificar que no rompiste funcionalidades existentes
4. ✅ Ejecutar el linter

```bash
# Linter
npm run lint

# Build de producción (verifica que todo compile)
npm run build
```

### 4. Commitear Cambios

```bash
# Ver archivos modificados
git status

# Agregar archivos
git add .

# Commit con mensaje descriptivo
git commit -m "feat: agregar filtro por autor en catálogo"
```

**Convención de mensajes de commit:**
```
feat: nueva funcionalidad
fix: corrección de bug
refactor: refactorización de código
docs: cambios en documentación
style: cambios de estilo (formato, espacios)
test: agregar o modificar tests
```

### 5. Push y Pull Request

```bash
# Push a tu rama
git push origin feature/tu-rama

# Crear Pull Request en GitHub/GitLab
# El equipo revisará tu código
```

---

## Comandos Principales

### Desarrollo

```bash
# Iniciar servidor de desarrollo
npm run dev

# Build de producción
npm run build

# Preview del build
npm run preview

# Linter
npm run lint
```

### Git

```bash
# Ver estado
git status

# Ver diferencias
git diff

# Ver historial
git log --oneline

# Cambiar de rama
git checkout nombre-rama

# Ver todas las ramas
git branch -a
```

### Base de Datos (Supabase)

```bash
# No hay comandos CLI locales
# Todo se gestiona desde Supabase Dashboard
```

Para ejecutar migraciones:
1. Ir a [Supabase Dashboard](https://supabase.com/dashboard)
2. Abrir **SQL Editor**
3. Copiar contenido de archivo `.sql` de `supabase/migrations/`
4. Ejecutar

---

## Convenciones de Código

### 1. TypeScript

```typescript
// ✅ Correcto - Tipos explícitos
interface LibroProps {
  libro: Libro;
  onSelect: (id: number) => void;
}

function LibroCard({ libro, onSelect }: LibroProps) {
  // ...
}

// ❌ Incorrecto - Sin tipos
function LibroCard({ libro, onSelect }) {
  // ...
}
```

### 2. Componentes React

```tsx
// ✅ Estructura recomendada
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/components/Component.css';

interface ComponentProps {
  prop1: string;
}

export function Component({ prop1 }: ComponentProps) {
  const [state, setState] = useState('');
  const { user } = useAuth();

  const handleAction = () => {
    // Lógica
  };

  return (
    <div className="component">
      {/* JSX */}
    </div>
  );
}
```

### 3. Nombres

```typescript
// Componentes: PascalCase
BookCard.tsx
UserDashboard.tsx

// Funciones y variables: camelCase
const handleClick = () => {}
const userName = 'John'

// Constantes: UPPER_CASE
const MAX_ITEMS = 100
const API_URL = 'https://...'

// Archivos de servicios: camelCase
libroService.ts
pedidoService.ts
```

### 4. Imports

```typescript
// Orden de imports:
// 1. Librerías externas
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// 2. Contextos y hooks
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

// 3. Servicios
import { libroService } from '../services/libroService';

// 4. Tipos
import { Libro, Pedido } from '../types';

// 5. Estilos
import '../styles/components/Component.css';
```

### 5. Comentarios

```typescript
// ✅ Comentarios útiles
// Calcular descuento considerando IVA y promociones
const discount = calculateDiscount(price, taxRate);

// ❌ Comentarios obvios (evitar)
// Declarar variable precio
const price = 10;
```

---

## Recursos y Documentación

### Documentación del Proyecto

| Documento | Ubicación | Descripción |
|-----------|-----------|-------------|
| Backend | `docs/DOCUMENTACION_BACKEND.md` | Esquema BD, servicios, RLS |
| Frontend | `docs/DOCUMENTACION_FRONTEND.md` | Componentes, páginas, contextos |
| Esta guía | `docs/GUIA_INCORPORACION_DESARROLLADOR.md` | Onboarding |

### Documentación Externa

- [React Docs](https://react.dev)
- [TypeScript Docs](https://www.typescriptlang.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [React Router Docs](https://reactrouter.com)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Lucide Icons](https://lucide.dev)

### Supabase Dashboard

- **URL:** https://supabase.com/dashboard
- **Proyecto:** Libreria Perez Galdos
- **Secciones importantes:**
  - **Table Editor** - Ver y editar datos
  - **SQL Editor** - Ejecutar queries y migraciones
  - **Authentication** - Gestionar usuarios
  - **Logs** - Ver logs de errores

---

## Preguntas Frecuentes

### ¿Cómo agrego un nuevo libro desde el código?

```typescript
import { libroService } from '../services/libroService';

const nuevoLibro = {
  titulo: 'El Quijote',
  autor: 'Miguel de Cervantes',
  precio: 25.50,
  isbn: '978-84-376-0494-7',
  stock: 10,
  activo: true
};

await libroService.create(nuevoLibro);
```

### ¿Cómo creo un usuario admin?

Ver archivo: `docs/CREAR_ADMIN_INSTRUCCIONES.md`

O ejecutar en SQL Editor de Supabase:
```sql
-- Ver el script completo en docs/crear_admin.sql
```

### ¿Cómo accedo a los datos del usuario actual?

```tsx
import { useAuth } from '../context/AuthContext';

function Component() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <div>No autenticado</div>;
  }

  return <div>Hola {user.email}</div>;
}
```

### ¿Cómo protejo una ruta para solo admins?

```tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AdminRoute({ children }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (user.role !== 'admin') {
    return <Navigate to="/" />;
  }

  return children;
}

// Uso en App.tsx
<Route
  path="/admin"
  element={
    <AdminRoute>
      <AdminDashboard />
    </AdminRoute>
  }
/>
```

### ¿Cómo agrego un nuevo campo a la tabla libros?

1. Crear migración SQL:
```sql
-- supabase/migrations/20251110000000_add_campo_nuevo.sql
ALTER TABLE libros ADD COLUMN campo_nuevo text;
```

2. Ejecutar en SQL Editor de Supabase

3. Actualizar el tipo TypeScript en `src/types/index.ts`:
```typescript
export interface Libro {
  // ... campos existentes
  campo_nuevo?: string; // Agregar aquí
}
```

### ¿Dónde están las credenciales de Supabase?

En el archivo `.env` (local) y en las variables de entorno del servidor de producción.

**¡NUNCA commitear el archivo `.env` al repositorio!**

### ¿Cómo ejecuto una migración?

1. Abrir [Supabase Dashboard](https://supabase.com/dashboard)
2. Ir a **SQL Editor**
3. Copiar contenido de `supabase/migrations/FECHA_nombre.sql`
4. Pegar y ejecutar

### ¿Qué hago si veo un error de RLS?

```
Error: new row violates row-level security policy
```

**Solución:**
1. Verificar que el usuario esté autenticado
2. Verificar que tenga el rol correcto
3. Revisar las políticas RLS en la tabla
4. Ver `docs/DOCUMENTACION_BACKEND.md` sección "Seguridad y RLS"

### ¿Cómo exporto datos de una tabla?

```typescript
import { backupService } from '../services/backupService';

// Exportar libros a CSV
await backupService.exportToCSV('libros');

// Exportar todos los pedidos
await backupService.exportToCSV('pedidos');
```

---

## Estructura de una Tarea Típica

### Ejemplo: Agregar filtro por editorial

#### 1. Análisis
- ¿Qué componente afecta? → `BookFilter.tsx`
- ¿Qué servicio? → `libroService.ts`
- ¿Necesita cambios en BD? → No

#### 2. Implementación

**a) Actualizar el servicio**
```typescript
// src/services/libroService.ts
async getByEditorial(editorialId: number): Promise<Libro[]> {
  const { data, error } = await supabase
    .from('libros')
    .select('*')
    .eq('editorial_id', editorialId)
    .eq('activo', true);

  if (error) throw error;
  return data || [];
}
```

**b) Actualizar el filtro**
```tsx
// src/components/BookFilter.tsx
<select onChange={(e) => onEditorialChange(e.target.value)}>
  <option value="">Todas las editoriales</option>
  {editoriales.map(ed => (
    <option key={ed.id} value={ed.id}>{ed.nombre}</option>
  ))}
</select>
```

**c) Actualizar la página**
```tsx
// src/pages/Catalog.tsx
const [selectedEditorial, setSelectedEditorial] = useState('');

useEffect(() => {
  if (selectedEditorial) {
    libroService.getByEditorial(Number(selectedEditorial))
      .then(setLibros);
  }
}, [selectedEditorial]);
```

#### 3. Testing
- ✅ Probar filtro en navegador
- ✅ Verificar que muestra libros correctos
- ✅ Verificar que se puede resetear

#### 4. Commit
```bash
git add .
git commit -m "feat: agregar filtro por editorial en catálogo"
git push origin feature/filtro-editorial
```

---

## Buenas Prácticas

### 🟢 DO (Hacer)

✅ **Leer la documentación antes de empezar**
✅ **Usar TypeScript con tipos explícitos**
✅ **Seguir convenciones de nombres**
✅ **Comentar código complejo**
✅ **Probar antes de commitear**
✅ **Hacer commits pequeños y frecuentes**
✅ **Escribir mensajes de commit descriptivos**
✅ **Pedir ayuda cuando estés bloqueado**

### 🔴 DON'T (No hacer)

❌ **Commitear código que no compila**
❌ **Commitear el archivo `.env`**
❌ **Hacer commits con mensaje "wip" o "test"**
❌ **Cambiar muchas cosas en un solo commit**
❌ **Ignorar errores del linter**
❌ **Usar `any` en TypeScript sin justificación**
❌ **Dejar `console.log()` en producción**
❌ **Modificar directamente la rama `main`**

---

## Checklist de Primera Tarea

Antes de empezar tu primera tarea, asegúrate de:

- [ ] Haber instalado Node.js y npm
- [ ] Haber clonado el repositorio
- [ ] Haber instalado dependencias (`npm install`)
- [ ] Haber configurado el archivo `.env`
- [ ] Poder ejecutar `npm run dev` sin errores
- [ ] Haber leído `DOCUMENTACION_BACKEND.md`
- [ ] Haber leído `DOCUMENTACION_FRONTEND.md`
- [ ] Tener acceso al Supabase Dashboard
- [ ] Haber explorado la estructura del proyecto
- [ ] Haber probado la app en el navegador

---

## Contacto

### Equipo de Desarrollo

- **Tech Lead:** [Nombre]
- **Backend:** [Nombre]
- **Frontend:** [Nombre]

### Comunicación

- **Chat del equipo:** [Slack/Discord/Teams]
- **Reuniones diarias:** [Horario]
- **Sprint planning:** [Frecuencia]

### Recursos Adicionales

- **Wiki del proyecto:** [URL]
- **Board de tareas:** [Jira/Trello]
- **Servidor de staging:** [URL]

---

## Próximos Pasos

1. ✅ Completar el checklist de primera tarea
2. 🔄 Leer documentación técnica detallada
3. 🔄 Configurar tu entorno de desarrollo
4. 🔄 Explorar el código existente
5. 🔄 Hacer tu primera tarea pequeña
6. 🔄 Hacer tu primer Pull Request

---

## Feedback

¿Encontraste algo confuso en esta guía? ¿Falta información?

Por favor, abre un issue o contacta al equipo para mejorar esta documentación.

---

**¡Bienvenido al equipo y feliz coding!** 🚀📚

---

**Última actualización:** 2025-11-10
