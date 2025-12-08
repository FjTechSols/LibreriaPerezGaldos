# 📚 Índice de Documentación - ExLibris

Guía completa de toda la documentación disponible del proyecto.

---

## 🚀 Deployment & Producción

### Para Deploy Rápido:
- **[Quick Start (15 min)](deployment/QUICK_START_DEPLOYMENT.md)** ⚡
  - Deploy en producción en 15 minutos
  - Paso a paso con Netlify
  - Configuración básica de Supabase

### Para Configuración Avanzada:
- **[Guía Completa de Deployment](deployment/GUIA_DEPLOYMENT.md)** 📖
  - Netlify, Vercel, y VPS
  - Configuración de dominios
  - CI/CD y automatización
  - Monitoreo y backups
  - Rollback strategies

### Información Detallada:
- **[README Deployment](deployment/README_DEPLOYMENT.md)** 📝
  - Stack tecnológico completo
  - Estructura del proyecto
  - Comandos disponibles
  - Troubleshooting completo

---

## 🗄️ Base de Datos

### Gestión de Migraciones:
- **[Migraciones en Producción](database/MIGRACIONES_PRODUCCION.md)** 🔄
  - Workflow de migraciones
  - Aplicar a dev y prod
  - Rollback de migraciones
  - Testing de base de datos
  - Errores comunes

### Setup Inicial:
- **[Configurar Supabase](database/CONFIGURAR_SUPABASE.md)** ⚙️
  - Crear proyecto Supabase
  - Configurar autenticación
  - Row Level Security (RLS)
  - Storage y funciones

### Migraciones y Datos:
- **[Aplicar Migraciones Faltantes](database/APLICAR_MIGRACIONES_FALTANTES.md)**
  - Script de aplicación masiva
  - Verificación de migraciones

- **[Migración de Datos](database/MIGRACION_DATOS.md)**
  - Transferir datos entre entornos
  - Backup y restore
  - Sincronización

### Troubleshooting:
- **[Estado Conexión Backend](database/ESTADO_CONEXION_BACKEND.md)**
  - Verificar conectividad
  - Diagnosticar problemas

- **[Resumen Diagnóstico](database/RESUMEN_DIAGNOSTICO.md)**
  - Estado actual del sistema
  - Issues conocidos

---

## 📝 Guías de Uso

### Para Administradores:
- **[Admin/Webmaster](guides/ADMIN_WEBMASTER.md)** 👨‍💼
  - Panel de administración
  - Gestión de inventario
  - Facturación y pedidos
  - Configuración del sistema

### Setup de Usuarios:
- **[Crear Usuario Admin](guides/CREAR_ADMIN_INSTRUCCIONES.md)** 🔐
  - Crear primer admin
  - Asignar permisos
  - Gestión de roles

- **[Jerarquía de Roles](JERARQUIA_ROLES.md)** 🎭
  - Sistema de roles completo
  - Permisos por rol
  - Super Admin vs Admin
  - Restricciones de seguridad

### Para Desarrolladores:
- **[Incorporación de Desarrollador](guides/GUIA_INCORPORACION_DESARROLLADOR.md)** 👨‍💻
  - Setup del entorno local
  - Arquitectura del proyecto
  - Workflow de desarrollo
  - Best practices

---

## ⚙️ Features Específicas

### Gestión de Inventario:
- **[Gestión de Ubicaciones](features/INSTRUCCIONES_UBICACION_ALMACEN.md)** 📍
  - Ubicaciones físicas en almacén
  - Sistema de códigos
  - Búsqueda de libros por ubicación

### Libros y Productos:
- **[Gestión de Libros Especiales](features/GESTION_LIBROS_ESPECIALES.md)** 📖
  - Libros raros y antiguos
  - Ediciones especiales
  - Campos personalizados

- **[Sistema de Códigos de Libros](features/SISTEMA_CODIGOS_LIBROS.md)** 🔢
  - ISBN, códigos internos
  - Generación automática
  - Búsqueda por código

---

## 🔧 Documentación Técnica

### Arquitectura:
- **[Backend](DOCUMENTACION_BACKEND.md)** 🖥️
  - Estructura de servicios
  - APIs y endpoints
  - Supabase integration
  - Edge Functions

- **[Frontend](DOCUMENTACION_FRONTEND.md)** 🎨
  - Componentes principales
  - Context API
  - Routing
  - Estado global

### Módulos del Sistema:
- **[Sistema de Facturación](DOCUMENTACION_FACTURACION.md)** 🧾
  - Generación de facturas
  - Gestión de items
  - Clientes y datos fiscales
  - PDFs y reportes

- **[Sistema de Pedidos](DOCUMENTACION_PEDIDOS.md)** 📦
  - Creación de pedidos
  - Estados y flujo
  - Gestión de items
  - Integración con inventario

### Integraciones:
- **[Integración Stripe](INTEGRACION_STRIPE.md)** 💳
  - Setup de Stripe
  - Checkout flow
  - Webhooks
  - Edge Functions
  - Test vs Live mode

- **[Verificación de Email](VERIFICACION_EMAIL.md)** 📧
  - Sistema de emails
  - Templates personalizados
  - Recuperación de contraseña
  - Confirmación de cuenta

---

## 📑 Organización de Carpetas

```
docs/
├── INDEX.md                    # Este archivo
│
├── deployment/                 # Todo sobre deployment
│   ├── QUICK_START_DEPLOYMENT.md
│   ├── GUIA_DEPLOYMENT.md
│   └── README_DEPLOYMENT.md
│
├── database/                   # Base de datos y migraciones
│   ├── MIGRACIONES_PRODUCCION.md
│   ├── CONFIGURAR_SUPABASE.md
│   ├── APLICAR_MIGRACIONES_FALTANTES.md
│   ├── MIGRACION_DATOS.md
│   ├── ESTADO_CONEXION_BACKEND.md
│   └── RESUMEN_DIAGNOSTICO.md
│
├── guides/                     # Guías de uso
│   ├── ADMIN_WEBMASTER.md
│   ├── CREAR_ADMIN_INSTRUCCIONES.md
│   └── GUIA_INCORPORACION_DESARROLLADOR.md
│
├── features/                   # Features específicas
│   ├── INSTRUCCIONES_UBICACION_ALMACEN.md
│   ├── GESTION_LIBROS_ESPECIALES.md
│   └── SISTEMA_CODIGOS_LIBROS.md
│
└── [Documentación técnica]     # Docs técnicas en raíz
    ├── DOCUMENTACION_BACKEND.md
    ├── DOCUMENTACION_FRONTEND.md
    ├── DOCUMENTACION_FACTURACION.md
    ├── DOCUMENTACION_PEDIDOS.md
    ├── INTEGRACION_STRIPE.md
    └── VERIFICACION_EMAIL.md
```

---

## 🎯 Rutas Rápidas

### ¿Necesitas...?

| Necesidad | Documento |
|-----------|-----------|
| **Deployar YA** | [Quick Start](deployment/QUICK_START_DEPLOYMENT.md) |
| **Entender arquitectura** | [Frontend](DOCUMENTACION_FRONTEND.md) + [Backend](DOCUMENTACION_BACKEND.md) |
| **Aplicar migraciones** | [Migraciones](database/MIGRACIONES_PRODUCCION.md) |
| **Crear admin** | [Crear Admin](guides/CREAR_ADMIN_INSTRUCCIONES.md) |
| **Gestionar roles** | [Jerarquía de Roles](JERARQUIA_ROLES.md) |
| **Usar panel admin** | [Admin Webmaster](guides/ADMIN_WEBMASTER.md) |
| **Integrar Stripe** | [Stripe](INTEGRACION_STRIPE.md) |
| **Gestionar pedidos** | [Pedidos](DOCUMENTACION_PEDIDOS.md) |
| **Generar facturas** | [Facturación](DOCUMENTACION_FACTURACION.md) |
| **Onboarding dev** | [Incorporación](guides/GUIA_INCORPORACION_DESARROLLADOR.md) |

---

## 📖 Orden Recomendado de Lectura

### Para Nuevos Desarrolladores:

1. **[README principal](../README.md)** - Visión general
2. **[Incorporación Desarrollador](guides/GUIA_INCORPORACION_DESARROLLADOR.md)** - Setup
3. **[Frontend](DOCUMENTACION_FRONTEND.md)** - Estructura frontend
4. **[Backend](DOCUMENTACION_BACKEND.md)** - Estructura backend
5. **[Configurar Supabase](database/CONFIGURAR_SUPABASE.md)** - Base de datos

### Para Deploy a Producción:

1. **[Quick Start](deployment/QUICK_START_DEPLOYMENT.md)** - Deploy rápido
2. **[Migraciones](database/MIGRACIONES_PRODUCCION.md)** - Gestión BD
3. **[Guía Completa](deployment/GUIA_DEPLOYMENT.md)** - Configuración avanzada

### Para Administradores:

1. **[Admin Webmaster](guides/ADMIN_WEBMASTER.md)** - Uso del panel
2. **[Facturación](DOCUMENTACION_FACTURACION.md)** - Sistema de facturas
3. **[Pedidos](DOCUMENTACION_PEDIDOS.md)** - Gestión de pedidos
4. **[Ubicaciones](features/INSTRUCCIONES_UBICACION_ALMACEN.md)** - Inventario físico

---

## 🔍 Buscar por Tema

### Autenticación y Usuarios:
- [Verificación Email](VERIFICACION_EMAIL.md)
- [Crear Admin](guides/CREAR_ADMIN_INSTRUCCIONES.md)
- [Jerarquía de Roles](JERARQUIA_ROLES.md)
- [Sistema Roles y Permisos](SISTEMA_ROLES_PERMISOS.md)
- [Configurar Supabase](database/CONFIGURAR_SUPABASE.md)

### Pagos y Facturación:
- [Stripe Integration](INTEGRACION_STRIPE.md)
- [Sistema Facturación](DOCUMENTACION_FACTURACION.md)
- [Pedidos](DOCUMENTACION_PEDIDOS.md)

### Base de Datos:
- [Migraciones](database/MIGRACIONES_PRODUCCION.md)
- [Configurar Supabase](database/CONFIGURAR_SUPABASE.md)
- [Migración Datos](database/MIGRACION_DATOS.md)

### Deployment:
- [Quick Start](deployment/QUICK_START_DEPLOYMENT.md)
- [Guía Completa](deployment/GUIA_DEPLOYMENT.md)
- [README Deployment](deployment/README_DEPLOYMENT.md)

### Inventario y Libros:
- [Ubicaciones Almacén](features/INSTRUCCIONES_UBICACION_ALMACEN.md)
- [Libros Especiales](features/GESTION_LIBROS_ESPECIALES.md)
- [Códigos Libros](features/SISTEMA_CODIGOS_LIBROS.md)

---

## 💡 Tips

- **Usa Ctrl+F** en cada documento para buscar términos específicos
- **Sigue los enlaces** entre documentos para información relacionada
- **Revisa el README** principal primero para visión general
- **Usa Quick Start** si necesitas deployar urgentemente
- **Lee Incorporación** si eres nuevo en el proyecto

---

## 📞 Ayuda

Si no encuentras lo que buscas:

1. **Busca en este índice** por tema
2. **Revisa el README** principal
3. **Consulta Troubleshooting** en cada guía
4. **Abre un Issue** en GitHub
5. **Revisa la console** del navegador (F12)

---

**Última actualización:** 2025-11-15

**Versión:** 1.0.0
