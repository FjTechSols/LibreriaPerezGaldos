/*
  # Corregir Seguridad de Funciones PostgreSQL

  Este script corrige el problema de seguridad "role mutable search_path" en funciones PostgreSQL.

  ## Problema
  Las funciones sin `SECURITY DEFINER` y sin `SET search_path` son vulnerables a ataques
  de search_path manipulation donde un atacante podría crear objetos maliciosos en su propio schema.

  ## Solución
  1. Agregar `SECURITY DEFINER` a todas las funciones
  2. Agregar `SET search_path = public, pg_temp` para fijar el search_path
  3. Recrear las funciones con estas opciones de seguridad

  ## Funciones Corregidas
  - update_updated_at_column()
  - update_clientes_updated_at()
  - generar_numero_factura()
  - calcular_totales_pedido()
  - update_settings_updated_at()
*/

-- =====================================================
-- Función: update_updated_at_column
-- Propósito: Actualizar automáticamente el campo updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- =====================================================
-- Función: update_clientes_updated_at
-- Propósito: Actualizar automáticamente updated_at en clientes
-- =====================================================
CREATE OR REPLACE FUNCTION update_clientes_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- =====================================================
-- Función: generar_numero_factura
-- Propósito: Generar números de factura automáticamente
-- =====================================================
CREATE OR REPLACE FUNCTION generar_numero_factura()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
    anio INT;
    ultimo_numero INT;
    nuevo_numero VARCHAR(50);
BEGIN
    anio := EXTRACT(YEAR FROM CURRENT_DATE);

    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_factura FROM '\d+$') AS INT)), 0)
    INTO ultimo_numero
    FROM facturas
    WHERE numero_factura LIKE 'F' || anio || '-%';

    nuevo_numero := 'F' || anio || '-' || LPAD((ultimo_numero + 1)::TEXT, 4, '0');
    NEW.numero_factura := nuevo_numero;

    RETURN NEW;
END;
$$;

-- =====================================================
-- Función: calcular_totales_pedido
-- Propósito: Calcular automáticamente subtotal, IVA y total del pedido
-- =====================================================
CREATE OR REPLACE FUNCTION calcular_totales_pedido()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
    nuevo_subtotal DECIMAL(10,2);
    nuevo_iva DECIMAL(10,2);
    nuevo_total DECIMAL(10,2);
    tasa_iva DECIMAL(5,2) := 0.21;
BEGIN
    -- Calcular subtotal sumando todos los detalles del pedido
    SELECT COALESCE(SUM(cantidad * precio_unitario), 0)
    INTO nuevo_subtotal
    FROM pedido_detalles
    WHERE pedido_id = NEW.id;

    -- Calcular IVA
    nuevo_iva := nuevo_subtotal * tasa_iva;

    -- Calcular total
    nuevo_total := nuevo_subtotal + nuevo_iva;

    -- Actualizar valores
    NEW.subtotal := nuevo_subtotal;
    NEW.iva := nuevo_iva;
    NEW.total := nuevo_total;

    RETURN NEW;
END;
$$;

-- =====================================================
-- Función: update_settings_updated_at
-- Propósito: Actualizar automáticamente updated_at y updated_by en settings
-- =====================================================
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$;

-- =====================================================
-- Comentarios en las funciones para documentación
-- =====================================================
COMMENT ON FUNCTION update_updated_at_column() IS
'Actualiza automáticamente el campo updated_at al momento actual cuando un registro es modificado.
SECURITY DEFINER protege contra search_path manipulation attacks.';

COMMENT ON FUNCTION update_clientes_updated_at() IS
'Actualiza automáticamente el campo updated_at en la tabla clientes.
SECURITY DEFINER protege contra search_path manipulation attacks.';

COMMENT ON FUNCTION generar_numero_factura() IS
'Genera automáticamente números de factura secuenciales por año (formato: FYYYY-NNNN).
SECURITY DEFINER protege contra search_path manipulation attacks.';

COMMENT ON FUNCTION calcular_totales_pedido() IS
'Calcula automáticamente subtotal, IVA (21%) y total de un pedido basado en sus detalles.
SECURITY DEFINER protege contra search_path manipulation attacks.';

COMMENT ON FUNCTION update_settings_updated_at() IS
'Actualiza automáticamente updated_at y updated_by en configuraciones.
SECURITY DEFINER protege contra search_path manipulation attacks.';
