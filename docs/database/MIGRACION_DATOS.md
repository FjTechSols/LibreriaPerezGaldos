# Guía de Migración de Datos a Supabase

## Descripción

Esta guía explica cómo migrar datos existentes desde un sistema anterior (MySQL, Excel, CSV, etc.) hacia el nuevo sistema de facturación en Supabase PostgreSQL.

## Estructura de Migración

### 1. Orden de Importación (Importante)

Debido a las relaciones de foreign keys, importar en este orden:

```
1. roles
2. usuarios (requiere auth.users de Supabase)
3. editoriales
4. categorias
5. libros
6. pedidos
7. pedido_detalles
8. facturas
9. reembolsos
10. envios
11. documentos
```

## Métodos de Migración

### Opción 1: Desde MySQL (Recomendado si tienes el script)

#### Paso 1: Exportar desde MySQL

```bash
# Exportar cada tabla a CSV
mysql -u usuario -p -D libreria_perez_galdos -e "SELECT * FROM roles" > roles.csv
mysql -u usuario -p -D libreria_perez_galdos -e "SELECT * FROM usuarios" > usuarios.csv
# ... repetir para cada tabla
```

#### Paso 2: Adaptar Datos

Algunos campos necesitan adaptación de MySQL a PostgreSQL:

**Usuarios**:
```sql
-- MySQL usa INT para ID, PostgreSQL usa UUID
-- Necesitas generar UUIDs para cada usuario

-- En Supabase, ejecutar:
-- Primero crear usuarios en auth.users (si no existen)
INSERT INTO auth.users (email, encrypted_password)
VALUES ('admin@libreria.com', crypt('password', gen_salt('bf')));

-- Luego en tabla usuarios, usar el UUID generado
INSERT INTO usuarios (id, auth_user_id, username, email, rol_id)
VALUES (gen_random_uuid(), auth.uid(), 'admin', 'admin@libreria.com', 1);
```

**Pedidos**:
```sql
-- Adaptar ENUM de MySQL a tipo ENUM de PostgreSQL
-- Los valores deben coincidir exactamente

-- MySQL: ENUM('pendiente','procesando','enviado','completado','cancelado')
-- PostgreSQL: Ya creado como tipo estado_pedido

INSERT INTO pedidos (usuario_id, fecha_pedido, estado, ...)
VALUES ('uuid-del-usuario', NOW(), 'pendiente'::estado_pedido, ...);
```

### Opción 2: Desde Excel/CSV

#### Paso 1: Preparar archivos CSV

Formato requerido para cada tabla:

**roles.csv**
```csv
nombre
admin
usuario
```

**editoriales.csv**
```csv
nombre,direccion,telefono
Penguin Random House,Barcelona,+34900123456
Planeta,Madrid,+34900654321
```

**categorias.csv**
```csv
nombre,descripcion,codigo,activa,parent_id
Literatura,Novelas y poesía,LIT,true,
Historia,Historia general,HIS,true,
```

**libros.csv**
```csv
isbn,titulo,anio,paginas,descripcion,categoria_id,editorial_id,precio,stock,activo
978-84-666-6174-7,Cien años de soledad,1967,471,Novela de Gabriel García Márquez,1,1,24.90,10,true
```

#### Paso 2: Importar en Supabase

**Opción A - Panel Web de Supabase:**

1. Ir a https://app.supabase.com
2. Seleccionar tu proyecto
3. Ir a "Table Editor"
4. Seleccionar tabla
5. Clic en "Insert" → "Import data" → Subir CSV

**Opción B - SQL Editor:**

```sql
-- Crear tabla temporal
CREATE TEMP TABLE libros_temp (
    isbn VARCHAR(20),
    titulo VARCHAR(255),
    anio INT,
    paginas INT,
    descripcion TEXT,
    categoria_id INT,
    editorial_id INT,
    precio DECIMAL(10,2),
    stock INT,
    activo BOOLEAN
);

-- Importar CSV (desde panel SQL de Supabase)
-- Subir archivo y ejecutar:

INSERT INTO libros (isbn, titulo, anio, paginas, descripcion, categoria_id, editorial_id, precio, stock, activo)
SELECT isbn, titulo, anio, paginas, descripcion, categoria_id, editorial_id, precio, stock, activo
FROM libros_temp;
```

### Opción 3: Mediante Script de Node.js

Crear un script `migrate.js`:

```javascript
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import csv from 'csv-parser';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Usar service role key
);

async function migrarLibros() {
  const libros = [];

  fs.createReadStream('libros.csv')
    .pipe(csv())
    .on('data', (row) => {
      libros.push({
        isbn: row.isbn,
        titulo: row.titulo,
        anio: parseInt(row.anio),
        paginas: parseInt(row.paginas),
        descripcion: row.descripcion,
        categoria_id: parseInt(row.categoria_id),
        editorial_id: parseInt(row.editorial_id),
        precio: parseFloat(row.precio),
        stock: parseInt(row.stock),
        activo: row.activo === 'true'
      });
    })
    .on('end', async () => {
      // Insertar en lotes de 100
      for (let i = 0; i < libros.length; i += 100) {
        const lote = libros.slice(i, i + 100);
        const { error } = await supabase
          .from('libros')
          .insert(lote);

        if (error) {
          console.error('Error en lote', i, error);
        } else {
          console.log('Lote', i, 'insertado correctamente');
        }
      }
    });
}

migrarLibros();
```

Ejecutar:
```bash
npm install @supabase/supabase-js csv-parser
node migrate.js
```

## Casos Especiales

### Migrar Usuarios con Autenticación

Los usuarios requieren un proceso especial porque Supabase maneja la autenticación:

```javascript
// 1. Crear usuario en auth
const { data: authData, error: authError } = await supabase.auth.admin.createUser({
  email: 'usuario@example.com',
  password: 'password_temporal_seguro',
  email_confirm: true
});

// 2. Crear entrada en tabla usuarios
if (authData.user) {
  const { error } = await supabase
    .from('usuarios')
    .insert({
      auth_user_id: authData.user.id,
      username: 'usuario123',
      email: 'usuario@example.com',
      rol_id: 2 // usuario normal
    });
}
```

### Migrar Pedidos con Cálculos

Los triggers calcularán automáticamente subtotal, IVA y total, pero puedes insertar valores manualmente:

```sql
-- Los detalles activarán el trigger automáticamente
INSERT INTO pedidos (usuario_id, fecha_pedido, estado, tipo, metodo_pago)
VALUES ('uuid-usuario', '2025-01-15', 'completado', 'interno', 'tarjeta')
RETURNING id;

-- Insertar detalles (trigger calcula totales)
INSERT INTO pedido_detalles (pedido_id, libro_id, cantidad, precio_unitario)
VALUES
  (1, 1, 2, 24.90),
  (1, 2, 1, 19.95);

-- El pedido ahora tiene subtotal, IVA y total calculados
```

### Migrar Facturas Existentes

Si ya tienes facturas generadas:

```sql
INSERT INTO facturas (
  pedido_id,
  numero_factura,
  fecha,
  subtotal,
  iva,
  total,
  tipo,
  anulada
) VALUES (
  1,
  'F2024-0001',
  '2024-12-01',
  44.85,
  9.42,
  54.27,
  'normal',
  false
);
```

**IMPORTANTE**: El trigger de numeración automática solo actúa si `numero_factura` es NULL. Si proporcionas el número, lo respeta.

## Validación Post-Migración

### Script de Validación SQL

```sql
-- Verificar integridad referencial
SELECT 'libros sin categoria' as tabla, COUNT(*) as errores
FROM libros WHERE categoria_id NOT IN (SELECT id FROM categorias)
UNION ALL
SELECT 'libros sin editorial', COUNT(*)
FROM libros WHERE editorial_id NOT IN (SELECT id FROM editoriales)
UNION ALL
SELECT 'pedidos sin usuario', COUNT(*)
FROM pedidos WHERE usuario_id NOT IN (SELECT id FROM usuarios)
UNION ALL
SELECT 'facturas sin pedido', COUNT(*)
FROM facturas WHERE pedido_id NOT IN (SELECT id FROM pedidos);

-- Verificar cálculos de pedidos
SELECT
  p.id,
  p.total as total_pedido,
  (SELECT SUM(cantidad * precio_unitario) * 1.21 FROM pedido_detalles WHERE pedido_id = p.id) as total_calculado
FROM pedidos p
WHERE ABS(p.total - (SELECT SUM(cantidad * precio_unitario) * 1.21 FROM pedido_detalles WHERE pedido_id = p.id)) > 0.02;

-- Verificar secuencia de números de factura
SELECT numero_factura
FROM facturas
ORDER BY numero_factura
-- Revisar que sean consecutivos
```

### Script de Validación JavaScript

```javascript
async function validarMigracion() {
  // Verificar conteos
  const tablas = ['usuarios', 'libros', 'pedidos', 'facturas'];

  for (const tabla of tablas) {
    const { count } = await supabase
      .from(tabla)
      .select('*', { count: 'exact', head: true });

    console.log(`${tabla}: ${count} registros`);
  }

  // Verificar relaciones
  const { data: librosSinCategoria } = await supabase
    .from('libros')
    .select('id, titulo')
    .is('categoria_id', null);

  if (librosSinCategoria.length > 0) {
    console.error('Libros sin categoría:', librosSinCategoria);
  }

  // Verificar cálculos
  const { data: pedidos } = await supabase
    .from('pedidos')
    .select(`
      id,
      total,
      detalles:pedido_detalles(cantidad, precio_unitario)
    `);

  pedidos.forEach(pedido => {
    const subtotal = pedido.detalles.reduce(
      (sum, d) => sum + (d.cantidad * d.precio_unitario),
      0
    );
    const totalCalculado = subtotal * 1.21;

    if (Math.abs(pedido.total - totalCalculado) > 0.02) {
      console.error('Error en pedido', pedido.id, {
        total: pedido.total,
        calculado: totalCalculado
      });
    }
  });
}
```

## Limpieza y Optimización

Después de la migración:

```sql
-- Reindexar tablas
REINDEX TABLE libros;
REINDEX TABLE pedidos;
REINDEX TABLE facturas;

-- Actualizar estadísticas
ANALYZE libros;
ANALYZE pedidos;
ANALYZE facturas;

-- Vacuumar para recuperar espacio
VACUUM ANALYZE;
```

## Rollback de Migración

Si algo sale mal, puedes revertir:

```sql
-- Respaldar antes de empezar
CREATE TABLE libros_backup AS SELECT * FROM libros;
CREATE TABLE pedidos_backup AS SELECT * FROM pedidos;
-- ...

-- En caso de error, restaurar
TRUNCATE libros CASCADE;
INSERT INTO libros SELECT * FROM libros_backup;
```

## Checklist de Migración

- [ ] Exportar datos del sistema antiguo
- [ ] Adaptar formatos (fechas, enums, UUIDs)
- [ ] Crear usuarios en auth.users
- [ ] Importar en orden correcto (roles → usuarios → libros → pedidos → facturas)
- [ ] Ejecutar script de validación
- [ ] Verificar cálculos automáticos
- [ ] Probar RLS con usuarios reales
- [ ] Verificar secuencia de números de factura
- [ ] Generar PDF de factura de prueba
- [ ] Hacer backup de Supabase
- [ ] Documentar cualquier dato perdido o transformado

## Soporte

Si encuentras problemas durante la migración:

1. Revisar logs en Supabase Dashboard → Logs
2. Ejecutar script de validación
3. Verificar políticas RLS
4. Contactar: soporte@libreriaperezgaldos.es
