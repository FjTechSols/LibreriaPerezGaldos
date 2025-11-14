# 🔧 APLICAR MIGRACIONES FALTANTES

## ❌ Problema Detectado

El panel de administración está en blanco porque faltan **2 tablas** en Supabase:
- ❌ `settings` (configuración de la plataforma)
- ❌ `carrito` (carrito de compras)

---

## ✅ Solución Rápida (5 minutos)

### Paso 1: Acceder al SQL Editor de Supabase

1. Ve a: https://supabase.com/dashboard/project/weaihscsaqxadxjgsfbt/sql
2. Inicia sesión si es necesario

### Paso 2: Crear tabla `settings`

**Copia y pega este SQL** en el editor y haz clic en **"Run"**:

```sql
-- =====================================================
-- MIGRACIÓN: Tabla de Configuración (settings)
-- =====================================================

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
DROP POLICY IF EXISTS "Authenticated users can read settings" ON settings;
CREATE POLICY "Authenticated users can read settings"
  ON settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Política: Solo administradores pueden actualizar configuraciones
DROP POLICY IF EXISTS "Admins can update settings" ON settings;
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
DROP POLICY IF EXISTS "Admins can insert settings" ON settings;
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

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS settings_updated_at_trigger ON settings;
CREATE TRIGGER settings_updated_at_trigger
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_settings_updated_at();

-- Insertar configuraciones por defecto
INSERT INTO settings (key, value, category, description) VALUES
  -- Configuración de Empresa
  ('company_name', '"Perez Galdos S.L."', 'company', 'Nombre de la empresa'),
  ('company_address', '"Calle Hortaleza 5, 28004 Madrid, España"', 'company', 'Dirección de la empresa'),
  ('company_phone', '"+34 91 531 26 40"', 'company', 'Teléfono de contacto'),
  ('company_email', '"libreria@perezgaldos.com"', 'company', 'Email de contacto'),
  ('company_website', '"www.perezgaldos.es"', 'company', 'Sitio web'),
  ('company_tax_id', '"B12345678"', 'company', 'NIF/CIF de la empresa'),
  ('company_logo', '"https://images.pexels.com/photos/159866/books-book-pages-read-literature-159866.jpeg?auto=compress&cs=tinysrgb&w=200"', 'company', 'URL del logo'),

  -- Configuración de Facturación
  ('currency', '"EUR"', 'billing', 'Moneda por defecto'),
  ('currency_symbol', '"€"', 'billing', 'Símbolo de la moneda'),
  ('tax_rate', '21', 'billing', 'Porcentaje de IVA'),
  ('invoice_prefix', '"FAC"', 'billing', 'Prefijo de facturas'),
  ('invoice_terms', '"Pago a 30 días. Transferencia bancaria."', 'billing', 'Términos de pago'),
  ('invoice_footer', '"Gracias por su compra. Para cualquier consulta contacte con nosotros."', 'billing', 'Footer de facturas'),

  -- Configuración de Envíos
  ('free_shipping_threshold', '50', 'shipping', 'Umbral para envío gratis'),
  ('standard_shipping_cost', '5.99', 'shipping', 'Costo de envío estándar'),
  ('express_shipping_cost', '12.99', 'shipping', 'Costo de envío express'),
  ('shipping_zones', '["España", "Portugal", "Francia", "Italia"]', 'shipping', 'Zonas de envío disponibles'),
  ('estimated_delivery_days', '{"standard": 5, "express": 2}', 'shipping', 'Días estimados de entrega'),

  -- Configuración de Sistema
  ('items_per_page_catalog', '25', 'system', 'Items por página en catálogo'),
  ('items_per_page_admin', '20', 'system', 'Items por página en admin'),
  ('maintenance_mode', 'false', 'system', 'Modo mantenimiento'),
  ('allow_registration', 'true', 'system', 'Permitir registro de usuarios'),
  ('default_language', '"es"', 'system', 'Idioma por defecto'),
  ('enable_wishlist', 'true', 'system', 'Habilitar lista de deseos'),
  ('enable_reviews', 'true', 'system', 'Habilitar reseñas'),

  -- Configuración de Seguridad
  ('session_timeout', '3600', 'security', 'Timeout de sesión en segundos'),
  ('max_login_attempts', '5', 'security', 'Máximo de intentos de login'),
  ('password_min_length', '8', 'security', 'Longitud mínima de contraseña'),
  ('require_email_verification', 'false', 'security', 'Requerir verificación de email'),
  ('enable_2fa', 'false', 'security', 'Habilitar autenticación de dos factores')
ON CONFLICT (key) DO NOTHING;

SELECT '✅ Tabla settings creada exitosamente' AS resultado;
```

### Paso 3: Crear tabla `carrito`

**Copia y pega este SQL** en el editor y haz clic en **"Run"**:

```sql
-- =====================================================
-- MIGRACIÓN: Tabla de Carrito de Compras
-- =====================================================

CREATE TABLE IF NOT EXISTS carrito (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  libro_id integer NOT NULL REFERENCES libros(id) ON DELETE CASCADE,
  cantidad integer NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, libro_id)
);

-- Habilitar RLS
ALTER TABLE carrito ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Users can view own cart" ON carrito;
CREATE POLICY "Users can view own cart"
  ON carrito FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert to own cart" ON carrito;
CREATE POLICY "Users can insert to own cart"
  ON carrito FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own cart" ON carrito;
CREATE POLICY "Users can update own cart"
  ON carrito FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete from own cart" ON carrito;
CREATE POLICY "Users can delete from own cart"
  ON carrito FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Índices
CREATE INDEX IF NOT EXISTS idx_carrito_user_id ON carrito(user_id);
CREATE INDEX IF NOT EXISTS idx_carrito_libro_id ON carrito(libro_id);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_carrito_updated_at ON carrito;
CREATE TRIGGER update_carrito_updated_at
  BEFORE UPDATE ON carrito
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

SELECT '✅ Tabla carrito creada exitosamente' AS resultado;
```

### Paso 4: Verificar

Ejecuta este script para verificar:

```bash
node check-database-status.mjs
```

Deberías ver:
```
✅ Tablas existentes: 12/12
```

---

## 🎯 Después de aplicar las migraciones

1. **Recarga la aplicación** en el navegador (Ctrl+F5 o Cmd+Shift+R)
2. **El panel de administración** debería funcionar correctamente
3. **Los ajustes** se cargarán con los valores por defecto

---

## 📝 Notas

- Las configuraciones por defecto ya están incluidas en la migración de `settings`
- El carrito funciona por usuario autenticado
- Todos los cambios son idempotentes (se pueden ejecutar varias veces sin problemas)

---

## 🆘 Si aún hay problemas

Ejecuta el diagnóstico completo:

```bash
node check-database-status.mjs
```

Y comparte la salida para ayuda adicional.
