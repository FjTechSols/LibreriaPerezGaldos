# Sistema de Facturación - Librería Pérez Galdós

## Descripción General

Sistema completo de gestión de facturas integrado con Supabase PostgreSQL, que incluye generación automática de facturas desde pedidos, facturas rectificativas, cálculo automático de IVA, y generación de PDFs profesionales.

## Arquitectura de la Base de Datos

### Tablas Principales

#### 1. **pedidos**
- Gestiona los pedidos de los clientes
- Estados: pendiente, procesando, enviado, completado, cancelado
- Tipos: interno, iberlibro, conecta, uniliber, libreros_de_viejo
- Calcula automáticamente subtotal, IVA (21%) y total

#### 2. **pedido_detalles**
- Líneas de detalle de cada pedido
- Incluye libro, cantidad y precio unitario
- Subtotal calculado automáticamente (cantidad × precio_unitario)

#### 3. **facturas**
- Numeración automática con formato F2025-0001 (incremental por año)
- Tipos: normal y rectificativa
- Campos: subtotal, IVA, total, archivos PDF/XML
- Anulación con motivo

#### 4. **reembolsos**
- Ligados a facturas
- Estados y motivos de reembolso

#### 5. **envios**
- Información de tracking y transportista
- Estados de envío

#### 6. **auditoria**
- Registro automático de cambios
- Datos anteriores y nuevos en formato JSONB

### Características de Seguridad (RLS)

Todas las tablas tienen Row Level Security habilitado:

- **Administradores**: Acceso completo a todos los datos
- **Usuarios**: Solo pueden ver sus propios pedidos y facturas
- **Datos públicos**: Catálogo de libros, categorías y editoriales

## Funcionalidades del Sistema de Facturación

### 1. Generación Automática de Facturas

**Ubicación**: `src/services/facturaService.ts`

```typescript
// Generar factura desde un pedido
const factura = await crearFactura({
  pedido_id: 123,
  tipo: 'normal'
});
```

**Características**:
- Numeración automática (F2025-0001, F2025-0002, etc.)
- Cálculo automático de subtotal, IVA (21%) y total
- Validación de que el pedido existe y tiene detalles
- Almacenamiento en base de datos

### 2. Facturas Rectificativas

Cuando se anula una factura, se genera automáticamente una rectificativa:

```typescript
// Anular factura y crear rectificativa
const rectificativa = await anularFactura(
  facturaId,
  "Motivo de la anulación"
);
```

**Proceso**:
1. Marca la factura original como anulada
2. Guarda el motivo de anulación
3. Genera nueva factura de tipo "rectificativa"
4. Referencia a la factura original

### 3. Generación de PDF

**Ubicación**: `src/utils/pdfGenerator.ts`

```typescript
// Generar y descargar PDF
await descargarFacturaPDF(facturaId);
```

**Contenido del PDF**:
- Datos de la empresa (Librería Pérez Galdós)
- Número de factura y fecha
- Datos del cliente
- Detalle de productos (título, cantidad, precio, subtotal)
- Subtotal, IVA (21%) y Total
- Motivo de rectificación (si aplica)

### 4. Cálculos Automáticos

#### En el Pedido (Triggers de Base de Datos)

Cuando se insertan/actualizan/eliminan detalles de pedido:

```sql
-- Trigger automático
CREATE TRIGGER calcular_totales_pedido_insert
AFTER INSERT ON pedido_detalles
FOR EACH ROW EXECUTE FUNCTION calcular_totales_pedido();
```

El trigger calcula:
- Subtotal: Σ (cantidad × precio_unitario)
- IVA: subtotal × 0.21
- Total: subtotal + IVA

#### En el Frontend (TypeScript)

```typescript
const { subtotal, iva, total } = calcularTotalesFactura(detalles);
```

### 5. Estadísticas de Facturación

```typescript
const stats = await obtenerEstadisticasFacturacion(2025);

// Retorna:
// - totalFacturas
// - totalFacturado
// - totalIVA
// - totalSinIVA
// - facturasPorMes
```

## Componentes del Frontend

### 1. FacturaList
**Archivo**: `src/components/FacturaList.tsx`

Componente principal de gestión de facturas:
- Listado con filtros (tipo, estado, fechas)
- Estadísticas en tarjetas
- Acciones: Ver, Descargar PDF, Anular
- Modal de anulación con generación de rectificativa

### 2. GenerarFacturaModal
**Archivo**: `src/components/GenerarFacturaDesdeped.tsx`

Modal para generar facturas desde pedidos:
- Lista pedidos sin factura (completados/enviados)
- Búsqueda por ID, cliente o email
- Vista previa con cálculos
- Generación con un clic

### 3. Integración en AdminDashboard
**Archivo**: `src/pages/AdminDashboard.tsx`

Sección "Facturas" en el panel de administrador:
- Botón "Nueva Factura" abre GenerarFacturaModal
- FacturaList muestra todas las facturas
- Refresh automático tras operaciones

## Flujo de Trabajo Completo

### Caso 1: Crear Factura desde Pedido

1. Usuario completa un pedido
2. Admin entra en Dashboard → Facturas
3. Clic en "Nueva Factura"
4. Selecciona pedido de la lista
5. Revisa vista previa con cálculos
6. Clic en "Generar Factura"
7. Sistema:
   - Crea factura con número automático
   - Calcula subtotal, IVA y total
   - Guarda en base de datos
   - Retorna confirmación

### Caso 2: Anular Factura (Rectificativa)

1. Admin busca factura en listado
2. Clic en botón "Anular" (X roja)
3. Modal solicita motivo obligatorio
4. Confirma anulación
5. Sistema:
   - Marca factura original como anulada
   - Genera factura rectificativa automática
   - Nueva numeración (ej: F2025-0123)
   - Referencia a factura original
   - Incluye motivo en PDF

### Caso 3: Descargar PDF

1. Clic en botón "Descargar" en cualquier factura
2. Sistema genera PDF al instante
3. Descarga automática con nombre: `F2025-0001.pdf`

## Configuración del Sistema

### Variables de Entorno

El archivo `.env` debe contener:

```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_publica
```

### Información de la Empresa

Para modificar los datos que aparecen en las facturas, editar:

**Archivo**: `src/utils/pdfGenerator.ts`

```typescript
const COMPANY_INFO = {
  nombre: 'Librería Pérez Galdós',
  direccion: 'Calle Benito Pérez Galdós, 28001 Madrid',
  telefono: '+34 910 123 456',
  email: 'info@libreriaperezgaldos.es',
  cif: 'B-12345678',
  web: 'www.libreriaperezgaldos.es'
};
```

### Tasa de IVA

Para cambiar el porcentaje de IVA:

**Archivo**: `src/services/facturaService.ts`

```typescript
const IVA_RATE = 0.21; // 21% - Cambiar aquí
```

**IMPORTANTE**: También actualizar en la migración SQL:

```sql
-- En el trigger calcular_totales_pedido
nuevo_iva := nuevo_subtotal * 0.21; -- Cambiar aquí
```

## Preparación para Facturae (XML)

El sistema está preparado para soportar Facturae en el futuro:

### Campos Preparados en Base de Datos

```sql
-- Tabla facturas
archivo_xml TEXT  -- Para almacenar ruta del XML generado
```

### Implementación Futura

1. Crear función en `src/services/facturaService.ts`:

```typescript
export const generarFacturaeXML = async (facturaId: number) => {
  // Obtener factura completa
  const factura = await obtenerFacturaPorId(facturaId);

  // Generar XML según especificación Facturae 3.2.2
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <fe:Facturae xmlns:fe="http://www.facturae.es/Facturae/2014/v3.2.2/Facturae">
      <!-- Estructura Facturae -->
    </fe:Facturae>`;

  // Validar contra XSD
  // Guardar en Supabase Storage
  // Actualizar campo archivo_xml
};
```

2. Usar Edge Function de Supabase para validación y firma digital

## Mantenimiento y Auditoría

### Consultas Útiles

```sql
-- Ver todas las facturas de un año
SELECT * FROM facturas
WHERE EXTRACT(YEAR FROM fecha) = 2025
ORDER BY fecha DESC;

-- Total facturado por mes
SELECT
  EXTRACT(MONTH FROM fecha) as mes,
  COUNT(*) as cantidad,
  SUM(total) as total
FROM facturas
WHERE anulada = false
GROUP BY mes
ORDER BY mes;

-- Facturas rectificativas
SELECT f.*, fo.numero_factura as factura_original
FROM facturas f
LEFT JOIN facturas fo ON f.factura_original_id = fo.id
WHERE f.tipo = 'rectificativa';

-- Auditoría de cambios en facturas
SELECT * FROM auditoria
WHERE tabla = 'facturas'
ORDER BY fecha DESC
LIMIT 100;
```

### Backup y Recuperación

Supabase realiza backups automáticos diarios. Para backup manual:

```bash
# Exportar facturas a CSV
pg_dump -h [host] -U [user] -d [database] -t facturas --data-only --column-inserts > facturas_backup.sql
```

## Solución de Problemas

### Problema: Número de factura duplicado

**Causa**: Concurrencia en la generación
**Solución**: El trigger `generar_numero_factura_trigger` maneja esto automáticamente

### Problema: Totales no coinciden

**Causa**: Redondeo en cálculos
**Solución**: Usar `.toFixed(2)` y `Number()` consistentemente

### Problema: PDF no se descarga

**Causa**: Bloqueador de pop-ups del navegador
**Solución**: Permitir pop-ups para el dominio

## Próximas Mejoras

1. **Facturae XML** - Exportación a formato oficial AEAT
2. **Envío automático por email** - Edge Function para enviar facturas
3. **Plantillas personalizables** - Diferentes diseños de PDF
4. **Series de numeración** - Múltiples series (A, B, C...)
5. **Multi-empresa** - Soporte para varias empresas
6. **Firma digital** - Certificados digitales para facturas

## Recursos Adicionales

- [Documentación Supabase](https://supabase.com/docs)
- [jsPDF Documentation](https://github.com/parallax/jsPDF)
- [Especificación Facturae](https://www.facturae.gob.es/)
- [Normativa de facturación española](https://www.agenciatributaria.es/)

## Soporte

Para cualquier duda o problema:
- Email: soporte@libreriaperezgaldos.es
- Documentación interna: Ver este archivo
- Logs: Panel de Supabase → Logs → Functions
