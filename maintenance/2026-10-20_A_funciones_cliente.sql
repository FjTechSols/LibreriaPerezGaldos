-- =====================================================================================
-- Paso A (aditivo): funciones de servidor para los flujos de cliente
-- Proyecto weaihscsaqxadxjgsfbt · 2026-10-20
--
-- No elimina ni restringe nada existente. Crea:
--   1. tiene_algun_rol(text[])        -> definición única de roles (rol_id + usuarios_roles)
--   2. actualizar_mi_perfil(...)      -> el cliente edita SOLO sus campos de perfil
--   3. resolver_email_login(text)     -> login por nombre de usuario sin leer usuarios
--   4. handle_new_user (redefinida)   -> copia nombre y teléfono del registro + relleno único
--   5. crear_factura_desde_pedido()   -> factura con numeración centralizada (solo servidor)
--   6. confirmar_pago_pedido(...)     -> confirmación única del pago (solo servidor / webhook)
--   7. Política de lectura pública de settings no sensibles
--
-- Deshacer: ver el bloque "ROLLBACK" al final del archivo.
-- =====================================================================================

BEGIN;

-- -------------------------------------------------------------------------------------
-- 1. Roles: única definición de "quién es quién"
--    Considera el rol antiguo (usuarios.rol_id -> roles.nombre) y los roles avanzados
--    activos (usuarios_roles + roles activos). El rol 'usuario' nunca es personal.
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tiene_algun_rol(p_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1
      FROM public.usuarios u
      JOIN public.roles r ON r.id = u.rol_id
      WHERE u.auth_user_id = auth.uid()
        AND coalesce(u.activo, true)
        AND r.nombre::text = ANY (p_roles)
    )
    OR EXISTS (
      SELECT 1
      FROM public.usuarios_roles ur
      JOIN public.roles r ON r.id = ur.rol_id
      WHERE ur.user_id = auth.uid()
        AND ur.activo
        AND coalesce(r.activo, true)
        AND r.nombre::text = ANY (p_roles)
    )
  );
$function$;

-- Se usa dentro de políticas RLS: anon y authenticated necesitan poder evaluarla.
REVOKE ALL ON FUNCTION public.tiene_algun_rol(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tiene_algun_rol(text[]) TO anon, authenticated, service_role;

-- -------------------------------------------------------------------------------------
-- 2. Perfil propio
--    Semántica por campo: NULL = no cambiar · '' = vaciar · otro valor = guardar.
--    Nunca toca rol_id, email, username ni activo.
--    El nombre se guarda en nombre_completo (canónico) y se copia a nombre (legado).
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.actualizar_mi_perfil(
  p_nombre_completo  text DEFAULT NULL,
  p_fecha_nacimiento text DEFAULT NULL,
  p_telefono         text DEFAULT NULL,
  p_direccion        text DEFAULT NULL,
  p_ciudad           text DEFAULT NULL,
  p_codigo_postal    text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_id uuid;
  v_nombre text := nullif(btrim(p_nombre_completo), '');
  v_tel text := nullif(btrim(p_telefono), '');
  v_dir text := nullif(btrim(p_direccion), '');
  v_ciudad text := nullif(btrim(p_ciudad), '');
  v_cp text := nullif(btrim(p_codigo_postal), '');
  v_fecha date;
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para actualizar tu perfil.' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_id FROM public.usuarios WHERE auth_user_id = auth.uid() FOR UPDATE;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'No se encuentra tu perfil.' USING ERRCODE = 'P0002';
  END IF;

  IF length(v_nombre) > 255 THEN RAISE EXCEPTION 'El nombre es demasiado largo (máximo 255 caracteres).' USING ERRCODE = '22023'; END IF;
  IF length(v_tel) > 20 THEN RAISE EXCEPTION 'El teléfono es demasiado largo (máximo 20 caracteres).' USING ERRCODE = '22023'; END IF;
  IF length(v_dir) > 500 THEN RAISE EXCEPTION 'La dirección es demasiado larga (máximo 500 caracteres).' USING ERRCODE = '22023'; END IF;
  IF length(v_ciudad) > 100 THEN RAISE EXCEPTION 'La ciudad es demasiado larga (máximo 100 caracteres).' USING ERRCODE = '22023'; END IF;
  IF length(v_cp) > 10 THEN RAISE EXCEPTION 'El código postal es demasiado largo (máximo 10 caracteres).' USING ERRCODE = '22023'; END IF;

  IF nullif(btrim(p_fecha_nacimiento), '') IS NOT NULL THEN
    BEGIN
      v_fecha := btrim(p_fecha_nacimiento)::date;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'La fecha de nacimiento no es válida (formato AAAA-MM-DD).' USING ERRCODE = '22023';
    END;
    IF v_fecha > current_date OR v_fecha < date '1900-01-01' THEN
      RAISE EXCEPTION 'La fecha de nacimiento no es válida.' USING ERRCODE = '22023';
    END IF;
  END IF;

  UPDATE public.usuarios SET
    nombre_completo  = CASE WHEN p_nombre_completo  IS NULL THEN nombre_completo  ELSE v_nombre END,
    nombre           = CASE WHEN p_nombre_completo  IS NULL THEN nombre           ELSE v_nombre END,
    fecha_nacimiento = CASE WHEN p_fecha_nacimiento IS NULL THEN fecha_nacimiento ELSE v_fecha END,
    telefono         = CASE WHEN p_telefono         IS NULL THEN telefono         ELSE v_tel END,
    direccion        = CASE WHEN p_direccion        IS NULL THEN direccion        ELSE v_dir END,
    ciudad           = CASE WHEN p_ciudad           IS NULL THEN ciudad           ELSE v_ciudad END,
    codigo_postal    = CASE WHEN p_codigo_postal    IS NULL THEN codigo_postal    ELSE v_cp END
  WHERE id = v_id
  RETURNING jsonb_build_object(
    'id', id, 'username', username, 'email', email,
    'nombre_completo', nombre_completo, 'nombre', nombre,
    'fecha_nacimiento', fecha_nacimiento, 'telefono', telefono,
    'direccion', direccion, 'ciudad', ciudad, 'codigo_postal', codigo_postal,
    'fecha_registro', fecha_registro
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.actualizar_mi_perfil(text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.actualizar_mi_perfil(text, text, text, text, text, text) TO authenticated;

-- -------------------------------------------------------------------------------------
-- 3. Login por nombre de usuario
--    Devuelve solo el email para una coincidencia exacta (sin distinguir mayúsculas).
--    Sustituye la lectura anónima de toda la tabla usuarios. Si hay ambigüedad, NULL.
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolver_email_login(p_identificador text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_id text := btrim(coalesce(p_identificador, ''));
  v_email text;
  v_count int;
BEGIN
  IF v_id = '' OR length(v_id) > 255 THEN RETURN NULL; END IF;
  IF position('@' IN v_id) > 0 THEN RETURN v_id; END IF;

  SELECT count(*), min(email) INTO v_count, v_email
  FROM public.usuarios WHERE lower(username) = lower(v_id);
  IF v_count = 1 THEN RETURN v_email; END IF;
  IF v_count > 1 THEN RETURN NULL; END IF;

  SELECT count(*), min(email) INTO v_count, v_email
  FROM public.usuarios WHERE lower(nombre) = lower(v_id);
  IF v_count = 1 THEN RETURN v_email; END IF;

  RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.resolver_email_login(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolver_email_login(text) TO anon, authenticated;

-- -------------------------------------------------------------------------------------
-- 4. Alta de usuario: copiar nombre y teléfono del registro (sustituye la autorreparación
--    que hacía el navegador al iniciar sesión) + relleno único de los existentes.
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_full_name text := nullif(btrim(coalesce(
    NEW.raw_user_meta_data->>'full_name',
    concat_ws(' ', NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'last_name')
  )), '');
  v_phone text := nullif(btrim(NEW.raw_user_meta_data->>'phone'), '');
BEGIN
  INSERT INTO public.usuarios (auth_user_id, username, email, rol_id, activo, nombre_completo, nombre, telefono)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    2,
    true,
    left(v_full_name, 255),
    left(v_full_name, 255),
    left(v_phone, 20)
  );
  RETURN NEW;
END;
$function$;

-- Relleno único: solo campos vacíos y solo si hay dato en los metadatos del registro.
UPDATE public.usuarios u SET
  nombre_completo = coalesce(nullif(u.nombre_completo, ''), left(m.full_name, 255)),
  telefono        = coalesce(nullif(u.telefono, ''), left(m.phone, 20))
FROM (
  SELECT a.id,
         nullif(btrim(coalesce(a.raw_user_meta_data->>'full_name',
           concat_ws(' ', a.raw_user_meta_data->>'first_name', a.raw_user_meta_data->>'last_name'))), '') AS full_name,
         nullif(btrim(a.raw_user_meta_data->>'phone'), '') AS phone
  FROM auth.users a
) m
WHERE m.id = u.auth_user_id
  AND ((nullif(u.nombre_completo, '') IS NULL AND m.full_name IS NOT NULL)
    OR (nullif(u.telefono, '') IS NULL AND m.phone IS NOT NULL));

-- -------------------------------------------------------------------------------------
-- 5. Factura desde pedido (solo servidor)
--    Replica InvoiceContext.createInvoice de la web: precios con IVA incluido,
--    base = productos / (1 + tipo), cuota = productos - base, total = productos + envío.
--    El envío sigue fuera de la base (pendiente del asesor; no se cambia aquí).
--    Numeración AAAA-NNNN centralizada con bloqueo por año.
--    Nombre del cliente: cliente asociado o perfil del usuario (nunca "undefined").
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crear_factura_desde_pedido(p_pedido_id bigint, p_estado text DEFAULT 'Pagada')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_pedido record;
  v_tax numeric;
  v_bruto numeric;
  v_base numeric;
  v_year text := to_char(now(), 'YYYY');
  v_next int;
  v_number text;
  v_invoice_id uuid;
  v_nombre text;
  v_nif text;
  v_intento int := 0;
BEGIN
  IF p_estado NOT IN ('Pendiente', 'Pagada') THEN
    RAISE EXCEPTION 'Estado de factura no válido: %', p_estado;
  END IF;

  SELECT p.*, c.nombre AS c_nombre, c.apellidos AS c_apellidos, c.nif AS c_nif,
         u.nombre_completo AS u_nombre_completo, u.nombre AS u_nombre, u.username AS u_username
    INTO v_pedido
  FROM public.pedidos p
  LEFT JOIN public.clientes c ON c.id = p.cliente_id
  LEFT JOIN public.usuarios u ON u.id = p.usuario_id
  WHERE p.id = p_pedido_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido % no encontrado', p_pedido_id; END IF;

  -- Ya existe factura para el pedido: solo asegurar el estado (comportamiento actual de la web)
  SELECT id INTO v_invoice_id FROM public.invoices WHERE order_id = p_pedido_id::text ORDER BY created_at LIMIT 1;
  IF v_invoice_id IS NOT NULL THEN
    IF p_estado = 'Pagada' THEN
      UPDATE public.invoices SET status = 'Pagada' WHERE id = v_invoice_id AND status <> 'Pagada';
    END IF;
    RETURN v_invoice_id;
  END IF;

  SELECT coalesce((SELECT (value #>> '{}')::numeric FROM public.settings WHERE key = 'tax_rate' LIMIT 1), 4) INTO v_tax;

  SELECT coalesce(sum(cantidad * precio_unitario), 0) INTO v_bruto FROM public.pedido_detalles WHERE pedido_id = p_pedido_id;
  v_base := v_bruto / (1 + v_tax / 100);

  v_nombre := coalesce(
    nullif(btrim(concat_ws(' ', v_pedido.c_nombre, v_pedido.c_apellidos)), ''),
    nullif(btrim(v_pedido.u_nombre_completo), ''),
    nullif(btrim(v_pedido.u_nombre), ''),
    nullif(btrim(v_pedido.u_username), ''),
    'Cliente'
  );
  v_nif := coalesce(v_pedido.c_nif, '');

  -- Numeración: bloqueo por año + reintento si otro cliente (panel manual) usó el número
  PERFORM pg_advisory_xact_lock(hashtext('invoices_number_' || v_year));
  LOOP
    v_intento := v_intento + 1;
    SELECT coalesce(max(split_part(invoice_number, '-', 2)::int), 0) + 1 INTO v_next
    FROM public.invoices WHERE invoice_number ~ ('^' || v_year || '-[0-9]+$');
    v_number := v_year || '-' || lpad(v_next::text, 4, '0');
    BEGIN
      INSERT INTO public.invoices (invoice_number, customer_name, customer_address, customer_nif, issue_date, status,
                                   subtotal, tax_rate, tax_amount, total, payment_method, order_id, language)
      VALUES (v_number, v_nombre, coalesce(v_pedido.direccion_envio, ''), v_nif, now(), p_estado,
              round(v_base, 2), v_tax, round(v_bruto - v_base, 2), round(v_bruto + coalesce(v_pedido.coste_envio, 0), 2),
              'Stripe', p_pedido_id::text, 'es')
      RETURNING id INTO v_invoice_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_intento >= 5 THEN RAISE; END IF;
    END;
  END LOOP;

  INSERT INTO public.invoice_items (invoice_id, book_id, book_title, quantity, unit_price, line_total)
  SELECT v_invoice_id,
         d.libro_id::text,
         coalesce(l.titulo, d.nombre_externo, 'Producto'),
         d.cantidad,
         round(d.precio_unitario / (1 + v_tax / 100), 2),
         round(d.precio_unitario / (1 + v_tax / 100) * d.cantidad, 2)
  FROM public.pedido_detalles d
  LEFT JOIN public.libros l ON l.id = d.libro_id
  WHERE d.pedido_id = p_pedido_id
  ORDER BY d.id;

  RETURN v_invoice_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.crear_factura_desde_pedido(bigint, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crear_factura_desde_pedido(bigint, text) TO service_role;

-- -------------------------------------------------------------------------------------
-- 6. Confirmación única del pago (webhook de Stripe, service_role)
--    Una transacción: bloqueo, idempotencia, importe y moneda, stock, estado, factura, auditoría.
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirmar_pago_pedido(
  p_pedido_id bigint,
  p_payment_intent text,
  p_importe_centimos integer,
  p_moneda text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_pedido record;
  v_esperado integer;
  v_pagable boolean;
  v_nota text;
  v_invoice uuid;
BEGIN
  IF p_payment_intent IS NULL OR btrim(p_payment_intent) = '' THEN
    RAISE EXCEPTION 'Falta el identificador de pago';
  END IF;

  SELECT * INTO v_pedido FROM public.pedidos WHERE id = p_pedido_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  -- Idempotencia: el mismo pago ya confirmado no vuelve a tocar nada
  IF v_pedido.stripe_payment_id = p_payment_intent
     AND v_pedido.estado::text IN ('procesando', 'enviado', 'completado') THEN
    RETURN jsonb_build_object('status', 'already_confirmed');
  END IF;

  v_esperado := round(v_pedido.total * 100)::integer;
  v_pagable := CASE
    WHEN v_pedido.tipo::text = 'interno' THEN v_pedido.estado::text = 'payment_pending'
    ELSE v_pedido.estado::text NOT IN ('procesando', 'enviado', 'completado', 'cancelado', 'devolucion', 'sin_stock')
  END;

  IF NOT v_pagable
     OR lower(coalesce(p_moneda, '')) <> 'eur'
     OR p_importe_centimos IS DISTINCT FROM v_esperado THEN
    v_nota := format('Pago %s no confirmado automáticamente: estado %s, importe %s %s, esperado %s EUR. Revisar.',
                     p_payment_intent, v_pedido.estado, round(coalesce(p_importe_centimos, 0) / 100.0, 2),
                     upper(coalesce(p_moneda, '?')), round(v_esperado / 100.0, 2));
    UPDATE public.pedidos
       SET observaciones = CASE WHEN coalesce(observaciones, '') = '' THEN v_nota ELSE observaciones || E'\n' || v_nota END
     WHERE id = p_pedido_id;
    RETURN jsonb_build_object('status', 'mismatch', 'detail', v_nota);
  END IF;

  -- Descontar stock (misma lógica que deduct_stock_force: nunca por debajo de 0)
  UPDATE public.libros l
     SET stock = GREATEST(0, l.stock - d.cantidad)
    FROM (SELECT libro_id, sum(cantidad) AS cantidad
            FROM public.pedido_detalles
           WHERE pedido_id = p_pedido_id AND libro_id IS NOT NULL
           GROUP BY libro_id) d
   WHERE l.id = d.libro_id;

  UPDATE public.pedidos
     SET estado = 'procesando',
         stripe_payment_id = p_payment_intent,
         metodo_pago = 'tarjeta'
   WHERE id = p_pedido_id;

  v_invoice := public.crear_factura_desde_pedido(p_pedido_id, 'Pagada');

  INSERT INTO public.auditoria (tabla, registro_id, accion, datos_anteriores, datos_nuevos)
  VALUES ('pedidos', p_pedido_id, 'PAGO_CONFIRMADO',
          jsonb_build_object('estado', v_pedido.estado, 'stripe_payment_id', v_pedido.stripe_payment_id),
          jsonb_build_object('estado', 'procesando', 'stripe_payment_id', p_payment_intent,
                             'importe_centimos', p_importe_centimos, 'factura_id', v_invoice));

  RETURN jsonb_build_object('status', 'confirmed', 'invoice_id', v_invoice);
END;
$function$;

REVOKE ALL ON FUNCTION public.confirmar_pago_pedido(bigint, text, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirmar_pago_pedido(bigint, text, integer, text) TO service_role;

-- -------------------------------------------------------------------------------------
-- 7. Lectura pública de ajustes no sensibles (tarifas, IVA, datos de empresa, sistema)
--    Corrige que los clientes sin sesión recibieran 0 filas y vieran tarifas/IVA por defecto.
-- -------------------------------------------------------------------------------------
CREATE POLICY "Public can read non-sensitive settings"
  ON public.settings
  FOR SELECT
  TO anon, authenticated
  USING (category = ANY (ARRAY['company', 'billing', 'shipping', 'system']));

COMMIT;

-- =====================================================================================
-- ROLLBACK (ejecutar manualmente si hiciera falta deshacer el paso A)
-- =====================================================================================
-- BEGIN;
-- DROP POLICY IF EXISTS "Public can read non-sensitive settings" ON public.settings;
-- DROP FUNCTION IF EXISTS public.confirmar_pago_pedido(bigint, text, integer, text);
-- DROP FUNCTION IF EXISTS public.crear_factura_desde_pedido(bigint, text);
-- DROP FUNCTION IF EXISTS public.resolver_email_login(text);
-- DROP FUNCTION IF EXISTS public.actualizar_mi_perfil(text, text, text, text, text, text);
-- DROP FUNCTION IF EXISTS public.tiene_algun_rol(text[]);
-- -- handle_new_user: restaurar la definición de maintenance/2026-10-20_pre_rls/03_functions.sql
-- -- El relleno único de nombre/teléfono no se deshace (solo completó campos vacíos).
-- COMMIT;
