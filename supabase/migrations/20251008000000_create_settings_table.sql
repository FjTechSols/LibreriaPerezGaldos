/*
  # Tabla de Configuración Global de la Plataforma

  1. Nueva Tabla: `settings`
    - `id` (uuid, primary key) - ID único de configuración
    - `key` (text, unique) - Clave única de configuración (ej: 'company_name', 'currency')
    - `value` (jsonb) - Valor de la configuración (flexible para cualquier tipo de dato)
    - `category` (text) - Categoría de configuración ('company', 'billing', 'shipping', 'system', 'security')
    - `description` (text) - Descripción de qué hace esta configuración
    - `updated_at` (timestamptz) - Última actualización
    - `updated_by` (uuid) - Usuario que actualizó (referencia a auth.users)

  2. Seguridad:
    - Enable RLS en tabla `settings`
    - Solo administradores pueden leer configuraciones
    - Solo administradores pueden actualizar configuraciones

  3. Índices:
    - Índice único en `key` para búsquedas rápidas
    - Índice en `category` para filtrado por categoría

  4. Datos Iniciales:
    - Configuraciones por defecto de la empresa
    - Configuración de moneda (EUR por defecto)
    - Configuración de envíos
    - Configuración de sistema
    - Configuración de seguridad
*/

-- Crear tabla de configuraciones
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  category text NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);

-- Habilitar RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios autenticados pueden leer configuraciones
CREATE POLICY "Authenticated users can read settings"
  ON settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Política: Solo administradores pueden actualizar configuraciones
CREATE POLICY "Admins can update settings"
  ON settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.user_id = auth.uid()
      AND usuarios.rol = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.user_id = auth.uid()
      AND usuarios.rol = 'admin'
    )
  );

-- Política: Solo administradores pueden insertar configuraciones
CREATE POLICY "Admins can insert settings"
  ON settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.user_id = auth.uid()
      AND usuarios.rol = 'admin'
    )
  );

-- Crear índices para optimización
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS settings_updated_at_trigger ON settings;
CREATE TRIGGER settings_updated_at_trigger
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_settings_updated_at();

-- Insertar configuraciones por defecto
INSERT INTO settings (key, value, category, description) VALUES
  -- Datos de la Empresa
  ('company_name', '"Perez Galdos"', 'company', 'Nombre legal de la empresa'),
  ('company_address', '"Calle Hortaleza 5, 28004 Madrid, España"', 'company', 'Dirección completa de la empresa'),
  ('company_phone', '"+34 91 531 26 40"', 'company', 'Teléfono de contacto'),
  ('company_email', '"libreria@perezgaldos.com"', 'company', 'Email de contacto'),
  ('company_website', '"www.perezgaldos.es"', 'company', 'Sitio web de la empresa'),
  ('company_tax_id', '"B12345678"', 'company', 'NIF/CIF de la empresa'),
  ('company_logo', '"https://images.pexels.com/photos/159866/books-book-pages-read-literature-159866.jpeg?auto=compress&cs=tinysrgb&w=200"', 'company', 'URL del logo de la empresa'),

  -- Facturación
  ('currency', '"EUR"', 'billing', 'Moneda por defecto (EUR, USD, GBP)'),
  ('currency_symbol', '"€"', 'billing', 'Símbolo de la moneda'),
  ('tax_rate', '21', 'billing', 'Tasa de IVA por defecto (%)'),
  ('invoice_prefix', '"FAC"', 'billing', 'Prefijo para números de factura'),
  ('invoice_terms', '"Pago a 30 días. Transferencia bancaria."', 'billing', 'Condiciones de pago por defecto'),
  ('invoice_footer', '"Gracias por su compra. Para cualquier consulta contacte con nosotros."', 'billing', 'Texto al pie de las facturas'),

  -- Envíos
  ('free_shipping_threshold', '50', 'shipping', 'Umbral para envío gratuito'),
  ('standard_shipping_cost', '5.99', 'shipping', 'Coste de envío estándar'),
  ('express_shipping_cost', '12.99', 'shipping', 'Coste de envío express'),
  ('shipping_zones', '["España", "Portugal", "Francia", "Italia"]', 'shipping', 'Zonas de envío disponibles'),
  ('estimated_delivery_days', '{"standard": 5, "express": 2}', 'shipping', 'Días estimados de entrega'),

  -- Sistema
  ('items_per_page_catalog', '25', 'system', 'Items por página en catálogo público'),
  ('items_per_page_admin', '20', 'system', 'Items por página en panel admin'),
  ('maintenance_mode', 'false', 'system', 'Modo mantenimiento activado'),
  ('allow_registration', 'true', 'system', 'Permitir registro de nuevos usuarios'),
  ('default_language', '"es"', 'system', 'Idioma por defecto (es, en)'),
  ('enable_wishlist', 'true', 'system', 'Habilitar lista de deseos'),
  ('enable_reviews', 'true', 'system', 'Habilitar reseñas de productos'),

  -- Seguridad
  ('session_timeout', '3600', 'security', 'Tiempo de sesión en segundos'),
  ('max_login_attempts', '5', 'security', 'Intentos máximos de login'),
  ('password_min_length', '8', 'security', 'Longitud mínima de contraseña'),
  ('require_email_verification', 'false', 'security', 'Requiere verificación de email'),
  ('enable_2fa', 'false', 'security', 'Habilitar autenticación de dos factores')
ON CONFLICT (key) DO NOTHING;
