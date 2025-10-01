# Módulo de Gestión de Pedidos - Librería Pérez Galdós

## Descripción General

Sistema completo de gestión de pedidos integrado con Supabase PostgreSQL, que permite crear, visualizar, editar y gestionar pedidos desde el panel de administración. Incluye cálculo automático de totales, gestión de estados, y generación automática de facturas.

## Arquitectura

### Tablas de Base de Datos

#### 1. **pedidos**
Tabla principal que almacena los pedidos:

```sql
- id (SERIAL PRIMARY KEY)
- usuario_id (UUID) → referencia a usuarios
- fecha_pedido (TIMESTAMPTZ)
- estado (estado_pedido ENUM)
  - 'pendiente'
  - 'procesando'
  - 'enviado'
  - 'completado'
  - 'cancelado'
- tipo (tipo_pedido ENUM)
  - 'interno'
  - 'iberlibro'
  - 'conecta'
  - 'uniliber'
  - 'libreros_de_viejo'
- subtotal (DECIMAL)
- iva (DECIMAL)
- total (DECIMAL)
- metodo_pago (metodo_pago ENUM)
  - 'tarjeta'
  - 'paypal'
  - 'transferencia'
  - 'reembolso'
- direccion_envio (TEXT)
- transportista (transportista ENUM)
- tracking (VARCHAR)
- observaciones (TEXT)
```

**Cálculo Automático**: Los triggers de la base de datos calculan automáticamente subtotal, IVA (21%) y total cuando se modifican los detalles del pedido.

#### 2. **pedido_detalles**
Líneas de detalle de cada pedido:

```sql
- id (SERIAL PRIMARY KEY)
- pedido_id (INT) → referencia a pedidos
- libro_id (INT) → referencia a libros
- cantidad (INT)
- precio_unitario (DECIMAL)
- subtotal (GENERATED ALWAYS AS cantidad * precio_unitario)
```

**Columna Calculada**: El subtotal se calcula automáticamente mediante una columna generada.

### Servicios (Frontend)

**Archivo**: `src/services/pedidoService.ts`

Funciones principales:

```typescript
// Listar pedidos con filtros
obtenerPedidos(filtros?: {
  estado?: EstadoPedido;
  usuario_id?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
}): Promise<Pedido[]>

// Obtener pedido individual con relaciones
obtenerPedidoPorId(id: number): Promise<Pedido | null>

// Crear nuevo pedido
crearPedido(input: CrearPedidoInput): Promise<Pedido | null>

// Actualizar estado del pedido
actualizarEstadoPedido(id: number, estado: EstadoPedido): Promise<boolean>

// Agregar/Eliminar detalles
agregarDetallePedido(pedidoId, libroId, cantidad, precio): Promise<boolean>
eliminarDetallePedido(detalleId: number): Promise<boolean>

// Cálculo de totales
calcularTotalesPedido(detalles): CalculoPedido

// Estadísticas
obtenerEstadisticasPedidos(): Promise<Estadisticas>
```

## Componentes

### 1. PedidosList

**Archivo**: `src/components/PedidosList.tsx`

Vista principal de listado de pedidos.

**Características**:
- Tarjetas de estadísticas (total pedidos, por estado, ventas totales)
- Filtros por estado y búsqueda
- Tabla con información completa de cada pedido
- Cambio de estado directo desde el listado
- Botón para ver detalles de cada pedido

**Estados visuales** (con colores distintivos):
- Pendiente: Amarillo (#fef3c7)
- Procesando: Azul (#dbeafe)
- Enviado: Morado (#ede9fe)
- Completado: Verde (#d1fae5)
- Cancelado: Rojo (#fee2e2)

**Props**:
```typescript
interface PedidosListProps {
  onVerDetalle: (pedido: Pedido) => void;
  refreshTrigger?: number;
}
```

### 2. PedidoDetalle

**Archivo**: `src/components/PedidoDetalle.tsx`

Vista detallada de un pedido individual en modal.

**Características**:
- Información completa del cliente
- Datos de envío y tracking
- Tabla de productos con cantidades y precios
- Cálculo automático de subtotal, IVA (21%) y total
- Cambio de estado
- Botón "Generar Factura" (integrado con módulo de facturación)
- Indicador si ya tiene factura generada

**Secciones**:
1. **Información del Cliente**: Username, email
2. **Fecha del Pedido**: Fecha formateada
3. **Estado**: Selector para cambiar estado
4. **Método de Pago**: Tarjeta, PayPal, etc.
5. **Dirección de Envío**: Dirección completa
6. **Envío**: Transportista y tracking
7. **Observaciones**: Notas adicionales
8. **Productos**: Tabla con todos los libros del pedido
9. **Totales**: Subtotal, IVA, Total

**Props**:
```typescript
interface PedidoDetalleProps {
  pedido: Pedido | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onEditar?: () => void;
}
```

### 3. CrearPedido

**Archivo**: `src/components/CrearPedido.tsx`

Formulario completo para crear nuevos pedidos desde el admin.

**Características**:
- Selección de cliente (dropdown con todos los usuarios)
- Tipo de pedido (interno, iberlibro, etc.)
- Método de pago
- Dirección de envío
- Transportista y tracking
- Buscador de libros con filtro en tiempo real
- Agregar múltiples líneas de productos
- Edición de cantidad y precio por línea
- Cálculo automático en tiempo real
- Vista previa de totales antes de guardar

**Flujo de trabajo**:

1. **Seleccionar Cliente**:
   - Dropdown con lista de usuarios registrados
   - Muestra username y email

2. **Información del Pedido**:
   - Tipo de pedido
   - Método de pago
   - Dirección de envío (opcional)
   - Transportista (opcional)
   - Tracking (opcional)

3. **Agregar Productos**:
   - Campo de búsqueda (por título o ISBN)
   - Selector de libro
   - Input de cantidad
   - Botón "Agregar"

4. **Editar Líneas**:
   - Cada línea se puede modificar:
     - Cantidad (input numérico)
     - Precio unitario (input decimal)
   - Eliminar líneas con botón rojo

5. **Vista Previa de Totales**:
   - Subtotal calculado
   - IVA (21%)
   - Total final

6. **Guardar**:
   - Validación (mínimo un producto)
   - Creación en Supabase
   - Actualización automática del listado

**Props**:
```typescript
interface CrearPedidoProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}
```

## Integración con Supabase

### Queries Principales

**Listar pedidos con relaciones**:
```typescript
const { data } = await supabase
  .from('pedidos')
  .select(`
    *,
    usuario:usuarios(*),
    detalles:pedido_detalles(
      *,
      libro:libros(*)
    )
  `)
  .order('fecha_pedido', { ascending: false });
```

**Crear pedido con detalles**:
```typescript
// 1. Insertar pedido
const { data: pedido } = await supabase
  .from('pedidos')
  .insert({
    usuario_id,
    estado: 'pendiente',
    tipo,
    subtotal,
    iva,
    total,
    metodo_pago,
    direccion_envio,
    transportista,
    tracking,
    observaciones
  })
  .select()
  .single();

// 2. Insertar detalles
const { error } = await supabase
  .from('pedido_detalles')
  .insert(detallesConPedidoId);
```

**Actualizar estado**:
```typescript
await supabase
  .from('pedidos')
  .update({ estado: nuevoEstado })
  .eq('id', pedidoId);
```

### Triggers Automáticos

El sistema incluye triggers que se ejecutan automáticamente:

**Recalcular totales al modificar detalles**:
```sql
CREATE TRIGGER calcular_totales_pedido_insert
AFTER INSERT ON pedido_detalles
FOR EACH ROW EXECUTE FUNCTION calcular_totales_pedido();

CREATE TRIGGER calcular_totales_pedido_update
AFTER UPDATE ON pedido_detalles
FOR EACH ROW EXECUTE FUNCTION calcular_totales_pedido();

CREATE TRIGGER calcular_totales_pedido_delete
AFTER DELETE ON pedido_detalles
FOR EACH ROW EXECUTE FUNCTION calcular_totales_pedido();
```

**Función del trigger**:
```sql
CREATE OR REPLACE FUNCTION calcular_totales_pedido()
RETURNS TRIGGER AS $$
DECLARE
    nuevo_subtotal DECIMAL(10,2);
    nuevo_iva DECIMAL(10,2);
    nuevo_total DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(cantidad * precio_unitario), 0)
    INTO nuevo_subtotal
    FROM pedido_detalles
    WHERE pedido_id = COALESCE(NEW.pedido_id, OLD.pedido_id);

    nuevo_iva := nuevo_subtotal * 0.21;
    nuevo_total := nuevo_subtotal + nuevo_iva;

    UPDATE pedidos
    SET subtotal = nuevo_subtotal,
        iva = nuevo_iva,
        total = nuevo_total
    WHERE id = COALESCE(NEW.pedido_id, OLD.pedido_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

## Seguridad (RLS)

### Políticas Implementadas

**Usuarios pueden ver sus propios pedidos**:
```sql
CREATE POLICY "Users can view own pedidos" ON pedidos FOR SELECT TO authenticated
USING (
  usuario_id = (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
  OR (SELECT rol_id FROM usuarios WHERE auth_user_id = auth.uid()) = 1
);
```

**Usuarios pueden crear sus propios pedidos**:
```sql
CREATE POLICY "Users can create own pedidos" ON pedidos FOR INSERT TO authenticated
WITH CHECK (usuario_id = (SELECT id FROM usuarios WHERE auth_user_id = auth.uid()));
```

**Admin puede gestionar todos los pedidos**:
```sql
CREATE POLICY "Admin can manage all pedidos" ON pedidos FOR ALL TO authenticated
USING ((SELECT rol_id FROM usuarios WHERE auth_user_id = auth.uid()) = 1)
WITH CHECK ((SELECT rol_id FROM usuarios WHERE auth_user_id = auth.uid()) = 1);
```

## Flujo de Trabajo Completo

### Caso 1: Crear Pedido desde Admin

1. Admin accede a Dashboard → Pedidos
2. Clic en "Nuevo Pedido" (botón verde con +)
3. Modal `CrearPedido` se abre
4. Selecciona cliente del dropdown
5. Configura tipo, método de pago, dirección
6. Busca libros y los agrega:
   - Escribe en buscador
   - Selecciona libro del dropdown
   - Indica cantidad
   - Clic en "Agregar"
7. Puede editar cantidades/precios de cada línea
8. Revisa vista previa de totales
9. Clic en "Guardar Pedido"
10. Sistema:
    - Calcula totales finales
    - Inserta pedido en tabla `pedidos`
    - Inserta detalles en `pedido_detalles`
    - Triggers recalculan automáticamente
    - Retorna a listado actualizado

### Caso 2: Ver Detalles de Pedido

1. En listado, clic en botón "Ver" (azul con icono de ojo)
2. Modal `PedidoDetalle` se abre
3. Muestra toda la información:
   - Datos del cliente
   - Fecha del pedido
   - Estado actual
   - Método de pago
   - Dirección de envío
   - Transportista y tracking
   - Tabla de productos
   - Totales calculados
4. Puede cambiar estado desde selector
5. Puede generar factura si no existe

### Caso 3: Cambiar Estado de Pedido

**Opción A - Desde el listado**:
1. En la columna "Acciones", usar dropdown de estado
2. Seleccionar nuevo estado
3. Actualización automática en Supabase
4. Refresh automático del listado
5. Registro en tabla `auditoria`

**Opción B - Desde detalles**:
1. Abrir modal de detalles
2. Cambiar estado en selector de información
3. Actualización automática
4. Modal se actualiza con nuevo estado

### Caso 4: Generar Factura desde Pedido

1. Abrir detalles de pedido (estado: completado o enviado)
2. Clic en botón "Generar Factura" (verde con icono de documento)
3. Sistema:
   - Verifica que el pedido tenga detalles
   - Obtiene información completa del pedido
   - Calcula subtotal, IVA y total
   - Genera número de factura automático (F2025-0001)
   - Crea registro en tabla `facturas`
   - Vincula factura con pedido
4. Modal muestra mensaje de éxito con número de factura
5. Botón cambia a "Factura: F2025-0001" (deshabilitado)

## Estadísticas

El componente muestra tarjetas con estadísticas en tiempo real:

```typescript
{
  total: number;              // Total de pedidos
  pendientes: number;         // Pedidos pendientes
  procesando: number;         // Pedidos en proceso
  enviados: number;           // Pedidos enviados
  completados: number;        // Pedidos completados
  cancelados: number;         // Pedidos cancelados
  totalVentas: number;        // Suma total de ventas (excluye cancelados)
}
```

**Colores de las tarjetas**:
- Total: Degradado morado (#667eea → #764ba2)
- Pendientes: Degradado naranja (#f59e0b → #d97706)
- Procesando: Degradado azul (#3b82f6 → #2563eb)
- Enviados: Degradado morado (#8b5cf6 → #7c3aed)
- Completados: Degradado verde (#10b981 → #059669)
- Ventas: Degradado cian (#06b6d4 → #0891b2)

## Filtros y Búsqueda

### Filtro por Estado
Dropdown que permite filtrar pedidos por:
- Todos los estados
- Pendiente
- Procesando
- Enviado
- Completado
- Cancelado

### Búsqueda
Campo de texto que busca en:
- Número de pedido (ID)
- Username del cliente
- Email del cliente

La búsqueda es en tiempo real (no requiere botón).

## Extensiones Futuras

### 1. Edición de Pedidos Existentes

Permitir modificar pedidos ya creados:
- Agregar/eliminar productos
- Cambiar cantidades
- Actualizar información de envío

**Implementación**:
```typescript
// En PedidoDetalle, agregar botón "Editar Pedido"
const handleEditar = () => {
  // Abrir modal de edición similar a CrearPedido
  // Pre-cargar datos del pedido actual
  // Permitir modificaciones
  // Actualizar en Supabase
};
```

### 2. Historial de Cambios de Estado

Registrar cada cambio de estado con fecha y usuario:

```sql
CREATE TABLE pedido_historial (
  id SERIAL PRIMARY KEY,
  pedido_id INT REFERENCES pedidos(id),
  estado_anterior estado_pedido,
  estado_nuevo estado_pedido,
  usuario_id UUID REFERENCES usuarios(id),
  fecha TIMESTAMPTZ DEFAULT now(),
  notas TEXT
);
```

### 3. Notificaciones por Email

Enviar emails automáticos al cliente:
- Pedido creado
- Estado cambiado
- Pedido enviado (con tracking)
- Pedido completado

**Usar Edge Function de Supabase**:
```typescript
// supabase/functions/send-order-notification/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { pedidoId, evento } = await req.json();

  // Obtener datos del pedido
  // Obtener email del cliente
  // Enviar email con plantilla

  return new Response(JSON.stringify({ success: true }));
});
```

### 4. Exportación de Pedidos

Exportar pedidos a CSV/Excel:

```typescript
const exportarPedidos = async (filtros) => {
  const pedidos = await obtenerPedidos(filtros);

  const csv = pedidos.map(p => ({
    'Nº Pedido': p.id,
    'Cliente': p.usuario?.username,
    'Fecha': new Date(p.fecha_pedido).toLocaleDateString(),
    'Estado': p.estado,
    'Total': p.total,
    'Método Pago': p.metodo_pago,
    'Transportista': p.transportista
  }));

  // Convertir a CSV y descargar
  downloadCSV(csv, 'pedidos.csv');
};
```

### 5. Impresión de Albaranes

Generar documento de albarán para picking/envío:

```typescript
import jsPDF from 'jspdf';

const generarAlbaran = (pedido: Pedido) => {
  const doc = new jsPDF();

  // Encabezado
  doc.text('ALBARÁN DE ENTREGA', 105, 20, { align: 'center' });
  doc.text(`Pedido #${pedido.id}`, 105, 30, { align: 'center' });

  // Cliente
  doc.text(`Cliente: ${pedido.usuario?.username}`, 20, 50);
  doc.text(`Dirección: ${pedido.direccion_envio}`, 20, 60);

  // Productos
  let y = 80;
  pedido.detalles.forEach(detalle => {
    doc.text(`${detalle.libro?.titulo}`, 20, y);
    doc.text(`Cantidad: ${detalle.cantidad}`, 150, y);
    y += 10;
  });

  doc.save(`albaran-${pedido.id}.pdf`);
};
```

### 6. Integración con APIs de Transportistas

Obtener tracking en tiempo real:

```typescript
const obtenerEstadoEnvio = async (tracking: string, transportista: string) => {
  // Llamar a API del transportista
  if (transportista === 'GLS') {
    const response = await fetch(`https://api.gls.es/tracking/${tracking}`);
    return await response.json();
  }
  // Similar para otros transportistas
};
```

### 7. Gestión de Stock Automática

Reducir stock al crear pedido, restaurar al cancelar:

```sql
-- Trigger al insertar detalle de pedido
CREATE TRIGGER reducir_stock_pedido
AFTER INSERT ON pedido_detalles
FOR EACH ROW
EXECUTE FUNCTION reducir_stock();

CREATE OR REPLACE FUNCTION reducir_stock()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE libros
    SET stock = stock - NEW.cantidad
    WHERE id = NEW.libro_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Troubleshooting

### Problema: Totales no coinciden

**Causa**: Los triggers no se ejecutaron correctamente
**Solución**:
```sql
-- Recalcular totales manualmente
SELECT calcular_totales_pedido_manual(pedido_id);
```

### Problema: No se puede cambiar estado

**Causa**: Problemas de permisos RLS
**Solución**: Verificar que el usuario tiene rol de admin
```sql
SELECT rol_id FROM usuarios WHERE auth_user_id = auth.uid();
```

### Problema: No aparecen libros en el buscador

**Causa**: Libros inactivos
**Solución**: El servicio solo muestra libros con `activo = true`

### Problema: Error al crear pedido sin detalles

**Causa**: Validación en el servicio
**Solución**: Agregar al menos un producto antes de guardar

## Testing

### Queries de Prueba

```sql
-- Ver todos los pedidos con sus detalles
SELECT
  p.*,
  u.username,
  array_agg(pd.libro_id) as libros
FROM pedidos p
JOIN usuarios u ON p.usuario_id = u.id
LEFT JOIN pedido_detalles pd ON pd.pedido_id = p.id
GROUP BY p.id, u.username;

-- Verificar cálculos de totales
SELECT
  p.id,
  p.subtotal,
  p.iva,
  p.total,
  SUM(pd.cantidad * pd.precio_unitario) as subtotal_calculado,
  SUM(pd.cantidad * pd.precio_unitario) * 0.21 as iva_calculado
FROM pedidos p
JOIN pedido_detalles pd ON pd.pedido_id = p.id
GROUP BY p.id;

-- Pedidos sin factura
SELECT p.*
FROM pedidos p
LEFT JOIN facturas f ON f.pedido_id = p.id
WHERE f.id IS NULL
AND p.estado IN ('completado', 'enviado');
```

## Recursos Adicionales

- [Documentación Supabase](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Triggers](https://www.postgresql.org/docs/current/sql-createtrigger.html)
- [jsPDF Documentation](https://github.com/parallax/jsPDF)

## Soporte

Para problemas o dudas:
- Revisar logs en Supabase Dashboard
- Verificar políticas RLS
- Comprobar que los triggers están activos
- Contacto: soporte@libreriaperezgaldos.es
