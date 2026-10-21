-- =====================================================================================
-- E2 · Compra desde la app (cliente)
--
-- La app no inserta pedidos directamente: el servidor calcula precios, envío e IVA con
-- las mismas reglas que la web y crea el pedido web ('interno', 'pending_verification').
-- Después el personal lo acepta (aceptar_pedido_web, migración D) y el cliente paga
-- con el enlace de la web, como hoy.
--
-- Reglas copiadas de la web:
--   · Precio (libroService.applyDiscountsToBookWithId): si el libro tiene oferta propia
--     (oferta = true y precio_original) se respeta su precio; si no, el mayor descuento
--     activo de global_discounts (GLOBAL o de su categoría) sobre el precio, a 2 decimales.
--   · Stock (cartService.validateStock): el libro debe estar activo y con stock >= cantidad.
--     El stock NO se descuenta al crear el pedido (se descuenta al pagar).
--   · Envío (CheckoutForm.getShippingCost + utils/shippingZone): España -> estándar o urgente,
--     gratis desde su umbral; resto -> tarifa internacional de la zona ("desde", sin gratis),
--     el personal fija el coste real al aceptar.
--   · Totales (pedidoService.calcularTotalesPedido): precios con IVA incluido;
--     base = productos / (1 + IVA); el envío se suma sin IVA.
--   · Dirección: "dirección, CP ciudad, provincia, país"; transportista 'Otro'; pago 'tarjeta'.
--
-- Nuevo: columna pedidos.comprobante_app (uuid único) para que un reintento no duplique.
-- =====================================================================================
BEGIN;

ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS comprobante_app uuid;
CREATE UNIQUE INDEX IF NOT EXISTS pedidos_comprobante_app_key ON public.pedidos (comprobante_app) WHERE comprobante_app IS NOT NULL;

-- 1. Zona de envío (copia de web/src/utils/shippingZone.ts) ---------------------------
CREATE OR REPLACE FUNCTION public.zona_envio(p_pais text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $function$
  SELECT CASE
    WHEN v IN ('españa', 'spain', 'es') THEN 'national'
    WHEN v IN ('alemania', 'austria', 'bélgica', 'dinamarca', 'francia', 'grecia', 'holanda', 'hungría', 'irlanda', 'italia',
               'noruega', 'polonia', 'portugal', 'reino unido', 'república checa', 'rumania', 'suecia', 'suiza') THEN 'europe'
    WHEN v IN ('argentina', 'bolivia', 'brasil', 'canadá', 'chile', 'colombia', 'costa rica', 'ecuador', 'estados unidos',
               'méxico', 'panamá', 'paraguay', 'perú', 'uruguay', 'venezuela') THEN 'america'
    WHEN v IN ('china', 'corea del sur', 'filipinas', 'hong kong', 'india', 'indonesia', 'japón', 'malasia', 'singapur',
               'tailandia', 'taiwán', 'vietnam') THEN 'asia'
    WHEN v IN ('france', 'italy', 'germany', 'uk', 'united kingdom', 'belgium', 'netherlands', 'países bajos', 'denmark',
               'sweden', 'norway', 'switzerland', 'ireland', 'greece', 'poland', 'czech republic', 'hungary', 'romania') THEN 'europe'
    ELSE 'other'
  END
  FROM (SELECT lower(btrim(coalesce(p_pais, ''))) AS v) x;
$function$;

-- 2. Cálculo del pedido (carrito y checkout) -------------------------------------------
-- p_items: [{"libro_id": 123, "cantidad": 1}, ...]  (las líneas repetidas se suman)
-- p_metodo: 'standard' | 'express' (fuera de España siempre 'express', como la web)
CREATE OR REPLACE FUNCTION public.calcular_pedido_app(p_items jsonb, p_pais text DEFAULT 'España', p_metodo text DEFAULT 'standard')
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_item record;
  v_lineas jsonb := '[]'::jsonb;
  v_errores int := 0;
  v_productos numeric := 0;
  v_precio numeric;
  v_pct int;
  v_estado text;
  v_zona text := public.zona_envio(p_pais);
  v_metodo text;
  v_envio numeric;
  v_dias int;
  v_tasa numeric;
  v_rates jsonb;
  v_base numeric;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'carrito_vacio');
  END IF;
  IF jsonb_array_length(p_items) > 50 THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'demasiadas_lineas');
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_items) e
             WHERE jsonb_typeof(e) <> 'object'
                OR coalesce(e->>'libro_id', '') !~ '^[0-9]{1,10}$'
                OR coalesce(e->>'cantidad', '') !~ '^[0-9]{1,3}$'
                OR (e->>'cantidad')::int < 1 OR (e->>'libro_id')::bigint > 2147483647) THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'carrito_no_valido');
  END IF;

  FOR v_item IN
    SELECT i.libro_id, i.cantidad, l.id AS existe, l.titulo, l.autor, l.imagen_url, l.precio, l.precio_original,
           coalesce(l.oferta, false) AS oferta, l.categoria_id, coalesce(l.activo, false) AS activo, coalesce(l.stock, 0) AS stock
    FROM (SELECT (e->>'libro_id')::int AS libro_id, sum((e->>'cantidad')::int)::int AS cantidad
          FROM jsonb_array_elements(p_items) e GROUP BY 1) i
    LEFT JOIN public.libros l ON l.id = i.libro_id
    ORDER BY i.libro_id
  LOOP
    IF v_item.existe IS NULL OR NOT v_item.activo OR v_item.precio IS NULL THEN
      v_estado := 'no_disponible'; v_precio := NULL;
    ELSE
      v_estado := CASE WHEN v_item.stock < v_item.cantidad THEN 'stock_insuficiente' ELSE 'ok' END;
      v_precio := v_item.precio;
      IF NOT (v_item.oferta AND v_item.precio_original IS NOT NULL) THEN
        SELECT max(d.discount_percent) INTO v_pct
        FROM public.global_discounts d
        WHERE d.active AND (d.start_date IS NULL OR d.start_date <= now()) AND (d.end_date IS NULL OR d.end_date >= now())
          AND (d.scope = 'GLOBAL' OR (d.scope = 'CATEGORY' AND d.target_category_id = v_item.categoria_id));
        IF coalesce(v_pct, 0) > 0 THEN
          v_precio := round(v_item.precio - v_item.precio * v_pct / 100.0, 2);
        END IF;
      END IF;
    END IF;
    IF v_estado <> 'ok' THEN v_errores := v_errores + 1; END IF;
    IF v_precio IS NOT NULL THEN v_productos := v_productos + v_precio * v_item.cantidad; END IF;
    v_lineas := v_lineas || jsonb_build_array(jsonb_build_object(
      'libro_id', v_item.libro_id, 'cantidad', v_item.cantidad, 'estado', v_estado,
      'titulo', v_item.titulo, 'autor', v_item.autor, 'imagen_url', v_item.imagen_url,
      'precio', v_precio, 'precio_catalogo', v_item.precio, 'stock', v_item.stock));
  END LOOP;
  v_productos := round(v_productos, 2);

  -- Envío según los ajustes de la tienda
  IF v_zona = 'national' THEN
    v_metodo := CASE WHEN lower(coalesce(p_metodo, '')) = 'express' THEN 'express' ELSE 'standard' END;
    IF v_metodo = 'standard' THEN
      v_envio := CASE WHEN v_productos >= coalesce((SELECT (value #>> '{}')::numeric FROM public.settings WHERE key = 'free_shipping_threshold_standard'), 30)
                      THEN 0 ELSE coalesce((SELECT (value #>> '{}')::numeric FROM public.settings WHERE key = 'standard_shipping_cost'), 4) END;
    ELSE
      v_envio := CASE WHEN v_productos >= coalesce((SELECT (value #>> '{}')::numeric FROM public.settings WHERE key = 'free_shipping_threshold_express'), 50)
                      THEN 0 ELSE coalesce((SELECT (value #>> '{}')::numeric FROM public.settings WHERE key = 'express_shipping_cost'), 6) END;
    END IF;
    v_dias := (SELECT (value ->> v_metodo)::int FROM public.settings WHERE key = 'estimated_delivery_days');
  ELSE
    v_metodo := 'express';
    v_rates := (SELECT value FROM public.settings WHERE key = 'international_rates');
    IF v_rates IS NULL THEN
      v_envio := 15;
    ELSE
      v_envio := coalesce((coalesce(v_rates -> v_zona, v_rates -> 'other') ->> 'cost')::numeric, 15);
      v_dias := (coalesce(v_rates -> v_zona, v_rates -> 'other') ->> 'days')::int;
    END IF;
  END IF;

  v_envio := round(v_envio, 2);
  v_tasa := coalesce((SELECT (value #>> '{}')::numeric FROM public.settings WHERE key = 'tax_rate'), 21);
  v_base := v_productos / (1 + v_tasa / 100);

  RETURN jsonb_build_object(
    'ok', v_errores = 0, 'codigo', CASE WHEN v_errores > 0 THEN 'lineas_no_disponibles' END,
    'lineas', v_lineas, 'productos', v_productos,
    'zona', v_zona, 'internacional', v_zona <> 'national', 'metodo', v_metodo, 'dias', v_dias, 'envio', v_envio,
    'tasa_iva', v_tasa, 'subtotal', round(v_base, 2), 'iva', round(v_productos - v_base, 2),
    'total', round(v_productos + v_envio, 2));
END;
$function$;

-- 3. Crear el pedido web desde la app ---------------------------------------------------
-- p_envio: {"nombre","apellidos","telefono","direccion","ciudad","codigo_postal","provincia","pais","observaciones"}
-- p_comprobante: uuid que genera la app por intento de compra; repetirlo devuelve el mismo pedido.
CREATE OR REPLACE FUNCTION public.crear_pedido_app(p_items jsonb, p_envio jsonb, p_metodo text, p_comprobante uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_usuario uuid := public.get_current_user_id();
  v_existente record;
  v_calc jsonb;
  v_campo text;
  v_valor text;
  v_obs text := nullif(btrim(coalesce(p_envio->>'observaciones', '')), '');
  v_direccion text;
  v_pedido bigint;
BEGIN
  IF v_usuario IS NULL OR NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = v_usuario AND coalesce(activo, true)) THEN
    RAISE EXCEPTION 'Inicia sesión para hacer el pedido.' USING ERRCODE = '42501';
  END IF;
  IF p_comprobante IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'comprobante_no_valido');
  END IF;

  -- Reintentos del mismo intento de compra: mismo pedido, nunca uno nuevo
  PERFORM pg_advisory_xact_lock(hashtextextended(p_comprobante::text, 0));
  SELECT id, usuario_id, total INTO v_existente FROM public.pedidos WHERE comprobante_app = p_comprobante;
  IF FOUND THEN
    IF v_existente.usuario_id <> v_usuario THEN
      RETURN jsonb_build_object('ok', false, 'codigo', 'comprobante_no_valido');
    END IF;
    RETURN jsonb_build_object('ok', true, 'repetido', true, 'pedido_id', v_existente.id, 'total', v_existente.total);
  END IF;

  IF p_envio IS NULL OR jsonb_typeof(p_envio) <> 'object' THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'envio_incompleto');
  END IF;
  FOREACH v_campo IN ARRAY ARRAY['nombre', 'apellidos', 'telefono', 'direccion', 'ciudad', 'codigo_postal', 'provincia', 'pais'] LOOP
    v_valor := btrim(coalesce(p_envio->>v_campo, ''));
    IF v_valor = '' THEN RETURN jsonb_build_object('ok', false, 'codigo', 'envio_incompleto', 'campo', v_campo); END IF;
    IF length(v_valor) > 200 THEN RETURN jsonb_build_object('ok', false, 'codigo', 'envio_no_valido', 'campo', v_campo); END IF;
  END LOOP;
  IF length(v_obs) > 1000 THEN RETURN jsonb_build_object('ok', false, 'codigo', 'envio_no_valido', 'campo', 'observaciones'); END IF;

  v_calc := public.calcular_pedido_app(p_items, p_envio->>'pais', p_metodo);
  IF NOT (v_calc->>'ok')::boolean THEN RETURN v_calc; END IF;

  v_direccion := format('%s, %s %s, %s, %s', btrim(p_envio->>'direccion'), btrim(p_envio->>'codigo_postal'),
                        btrim(p_envio->>'ciudad'), btrim(p_envio->>'provincia'), btrim(p_envio->>'pais'));

  INSERT INTO public.pedidos (usuario_id, estado, tipo, subtotal, iva, total, metodo_pago, direccion_envio, transportista,
                              coste_envio, observaciones, comprobante_app)
  VALUES (v_usuario, 'pending_verification', 'interno', (v_calc->>'subtotal')::numeric, (v_calc->>'iva')::numeric,
          (v_calc->>'total')::numeric, 'tarjeta', v_direccion, 'Otro', (v_calc->>'envio')::numeric, v_obs, p_comprobante)
  RETURNING id INTO v_pedido;

  INSERT INTO public.pedido_detalles (pedido_id, libro_id, cantidad, precio_unitario)
  SELECT v_pedido, (l->>'libro_id')::int, (l->>'cantidad')::int, (l->>'precio')::numeric
  FROM jsonb_array_elements(v_calc->'lineas') l;

  -- Aviso al cliente (como la web) y solo al personal que gestiona pedidos
  INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje)
  VALUES (v_usuario, 'pedido', 'Pedido Realizado',
          format('Tu pedido #%s se ha creado correctamente y está pendiente de verificación.', v_pedido));
  INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje)
  SELECT DISTINCT u.id, 'pedido', 'Nuevo pedido web', format('Nuevo pedido #%s desde la app por %s €.', v_pedido, v_calc->>'total')
  FROM public.usuarios u
  WHERE coalesce(u.activo, true) AND u.id <> v_usuario AND (
        EXISTS (SELECT 1 FROM public.roles r WHERE r.id = u.rol_id AND r.nombre IN ('super_admin', 'admin', 'editor'))
     OR EXISTS (SELECT 1 FROM public.usuarios_roles ur JOIN public.roles r ON r.id = ur.rol_id
                WHERE ur.user_id = u.auth_user_id AND ur.activo AND r.nombre IN ('super_admin', 'admin', 'editor')));

  RETURN v_calc || jsonb_build_object('ok', true, 'repetido', false, 'pedido_id', v_pedido, 'direccion', v_direccion);
END;
$function$;

REVOKE ALL ON FUNCTION public.calcular_pedido_app(jsonb, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calcular_pedido_app(jsonb, text, text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.crear_pedido_app(jsonb, jsonb, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crear_pedido_app(jsonb, jsonb, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.zona_envio(text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- Marcha atrás (manual):
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.crear_pedido_app(jsonb, jsonb, text, uuid);
-- DROP FUNCTION IF EXISTS public.calcular_pedido_app(jsonb, text, text);
-- DROP FUNCTION IF EXISTS public.zona_envio(text);
-- DROP INDEX IF EXISTS public.pedidos_comprobante_app_key;
-- ALTER TABLE public.pedidos DROP COLUMN IF EXISTS comprobante_app;
-- COMMIT;
