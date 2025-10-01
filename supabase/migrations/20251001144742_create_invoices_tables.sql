/*
  # Sistema de Facturación

  1. Nuevas Tablas
    - `invoices`
      - `id` (uuid, clave primaria)
      - `invoice_number` (text, único, formato: 2025-0001)
      - `customer_name` (text, nombre del cliente)
      - `customer_address` (text, dirección del cliente)
      - `customer_nif` (text, NIF del cliente)
      - `issue_date` (timestamptz, fecha de emisión)
      - `status` (text, estado: Pendiente, Pagada, Anulada)
      - `subtotal` (numeric, subtotal sin IVA)
      - `tax_rate` (numeric, porcentaje de IVA aplicado)
      - `tax_amount` (numeric, cantidad de IVA)
      - `total` (numeric, total con IVA)
      - `payment_method` (text, método de pago - opcional)
      - `order_id` (text, ID de orden relacionada - opcional)
      - `created_at` (timestamptz, fecha de creación)
      - `updated_at` (timestamptz, fecha de actualización)
    
    - `invoice_items`
      - `id` (uuid, clave primaria)
      - `invoice_id` (uuid, referencia a invoices)
      - `book_id` (text, ID del libro)
      - `book_title` (text, título del libro)
      - `quantity` (integer, cantidad)
      - `unit_price` (numeric, precio unitario)
      - `line_total` (numeric, total de la línea)
      - `created_at` (timestamptz, fecha de creación)

  2. Seguridad
    - Habilitar RLS en ambas tablas
    - Políticas para usuarios autenticados (admin)
*/

-- Crear tabla de facturas
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  customer_name text NOT NULL,
  customer_address text NOT NULL,
  customer_nif text NOT NULL,
  issue_date timestamptz DEFAULT now() NOT NULL,
  status text DEFAULT 'Pendiente' NOT NULL CHECK (status IN ('Pendiente', 'Pagada', 'Anulada')),
  subtotal numeric(10, 2) NOT NULL DEFAULT 0,
  tax_rate numeric(5, 2) NOT NULL DEFAULT 4.00,
  tax_amount numeric(10, 2) NOT NULL DEFAULT 0,
  total numeric(10, 2) NOT NULL DEFAULT 0,
  payment_method text,
  order_id text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Crear tabla de líneas de factura
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  book_id text NOT NULL,
  book_title text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric(10, 2) NOT NULL CHECK (unit_price >= 0),
  line_total numeric(10, 2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_name ON invoices(customer_name);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- Habilitar RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Políticas para invoices
CREATE POLICY "Usuarios autenticados pueden ver facturas"
  ON invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear facturas"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar facturas"
  ON invoices FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar facturas"
  ON invoices FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para invoice_items
CREATE POLICY "Usuarios autenticados pueden ver items de facturas"
  ON invoice_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear items de facturas"
  ON invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar items de facturas"
  ON invoice_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar items de facturas"
  ON invoice_items FOR DELETE
  TO authenticated
  USING (true);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en invoices
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insertar factura de ejemplo
INSERT INTO invoices (
  invoice_number,
  customer_name,
  customer_address,
  customer_nif,
  issue_date,
  status,
  subtotal,
  tax_rate,
  tax_amount,
  total
) VALUES (
  '2025-0001',
  'Juan Pérez García',
  'Calle Mayor 123, 28001 Madrid',
  'B12345678',
  '2025-01-15T10:00:00Z',
  'Pagada',
  150.00,
  4.00,
  6.00,
  156.00
) ON CONFLICT (invoice_number) DO NOTHING;

-- Insertar items de la factura de ejemplo
INSERT INTO invoice_items (
  invoice_id,
  book_id,
  book_title,
  quantity,
  unit_price,
  line_total
)
SELECT
  id,
  '1',
  'Cien años de soledad',
  2,
  25.00,
  50.00
FROM invoices
WHERE invoice_number = '2025-0001'
ON CONFLICT DO NOTHING;

INSERT INTO invoice_items (
  invoice_id,
  book_id,
  book_title,
  quantity,
  unit_price,
  line_total
)
SELECT
  id,
  '2',
  '1984',
  5,
  20.00,
  100.00
FROM invoices
WHERE invoice_number = '2025-0001'
ON CONFLICT DO NOTHING;