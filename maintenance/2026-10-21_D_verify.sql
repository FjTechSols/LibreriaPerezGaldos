-- Verificación de la migración D. Termina en ROLLBACK: pedidos, libros y facturas de prueba se deshacen.
-- En el editor SQL de Supabase el resultado puede no mostrarse (lo último es el ROLLBACK); ejecutarlo vía CLI para ver la tabla.
BEGIN;
CREATE TEMP TABLE _r (n serial, caso text, esperado text, obtenido text, ok boolean) ON COMMIT DROP;
GRANT ALL ON _r TO anon, authenticated, service_role;
GRANT USAGE ON SEQUENCE _r_n_seq TO anon, authenticated, service_role;

CREATE TEMP TABLE _ctx (k text PRIMARY KEY, v text) ON COMMIT DROP;
GRANT ALL ON _ctx TO anon, authenticated, service_role;
INSERT INTO _ctx VALUES
  ('super', (SELECT auth_user_id::text FROM usuarios WHERE rol_id = 1 AND auth_user_id IS NOT NULL ORDER BY fecha_registro LIMIT 1)),
  ('editor', (SELECT ur.user_id::text FROM usuarios_roles ur JOIN roles r ON r.id = ur.rol_id JOIN usuarios u ON u.auth_user_id = ur.user_id
               WHERE ur.activo AND r.nombre = 'editor' AND u.rol_id = 2 ORDER BY u.fecha_registro LIMIT 1)),
  ('cliente', (SELECT u.auth_user_id::text FROM usuarios u WHERE u.rol_id = 2 AND u.auth_user_id IS NOT NULL
               AND NOT EXISTS (SELECT 1 FROM usuarios_roles ur WHERE ur.user_id = u.auth_user_id AND ur.activo) ORDER BY u.fecha_registro, u.id LIMIT 1)),
  ('cliente_id', (SELECT u.id::text FROM usuarios u WHERE u.rol_id = 2 AND u.auth_user_id IS NOT NULL
               AND NOT EXISTS (SELECT 1 FROM usuarios_roles ur WHERE ur.user_id = u.auth_user_id AND ur.activo) ORDER BY u.fecha_registro, u.id LIMIT 1)),
  ('libro', (SELECT id::text FROM libros WHERE activo ORDER BY id LIMIT 1));

UPDATE libros SET stock = 10 WHERE id = (SELECT v::bigint FROM _ctx WHERE k = 'libro');

-- Pedidos sintéticos: (clave, tipo, estado, cantidad)
CREATE FUNCTION pg_temp._nuevo_pedido(p_tipo text, p_estado text, p_cant int) RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE v_id bigint; BEGIN
  INSERT INTO pedidos (usuario_id, tipo, estado, subtotal, iva, total, metodo_pago, coste_envio, transportista)
  VALUES ((SELECT v::uuid FROM _ctx WHERE k = 'cliente_id'), p_tipo::tipo_pedido, p_estado::estado_pedido, 9.62, 0.38, 10.00 * p_cant, 'tarjeta', 0, NULL)
  RETURNING id INTO v_id;
  INSERT INTO pedido_detalles (pedido_id, libro_id, cantidad, precio_unitario)
  VALUES (v_id, (SELECT v::bigint FROM _ctx WHERE k = 'libro'), p_cant, 10.00);
  RETURN v_id;
END $$;
INSERT INTO _ctx VALUES
  ('p_acepta', pg_temp._nuevo_pedido('interno', 'pending_verification', 1)::text),
  ('p_web', pg_temp._nuevo_pedido('interno', 'payment_pending', 2)::text),
  ('p_express', pg_temp._nuevo_pedido('express', 'pendiente', 1)::text),
  ('p_flash', pg_temp._nuevo_pedido('flash', 'cancelado', 1)::text),
  ('p_vuelta', pg_temp._nuevo_pedido('interno', 'procesando', 1)::text),
  ('p_mucho', pg_temp._nuevo_pedido('interno', 'payment_pending', 50)::text),
  ('p_sinstock', pg_temp._nuevo_pedido('interno', 'sin_stock', 1)::text),
  ('p_cancel', pg_temp._nuevo_pedido('interno', 'procesando', 1)::text);
UPDATE pedidos SET coste_envio = 15 WHERE id = (SELECT v::bigint FROM _ctx WHERE k = 'p_acepta');

CREATE FUNCTION pg_temp._stock() RETURNS int LANGUAGE sql AS $$ SELECT stock FROM libros WHERE id = (SELECT v::bigint FROM _ctx WHERE k = 'libro') $$;
CREATE FUNCTION pg_temp._p(k text) RETURNS bigint LANGUAGE sql AS $$ SELECT v::bigint FROM _ctx WHERE _ctx.k = $1 $$;
CREATE FUNCTION pg_temp._como(k text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', (SELECT v FROM _ctx WHERE _ctx.k = $1), 'role', 'authenticated')::text, true);
END $$;
GRANT EXECUTE ON FUNCTION pg_temp._stock(), pg_temp._p(text), pg_temp._como(text) TO authenticated;

SET LOCAL ROLE authenticated;

-- ---------- Permisos ----------
DO $$ DECLARE v_err text; BEGIN
  PERFORM pg_temp._como('cliente');
  BEGIN PERFORM aceptar_pedido_web(pg_temp._p('p_acepta'), 10); v_err := 'sin error'; EXCEPTION WHEN others THEN v_err := SQLERRM; END;
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('cliente no acepta pedidos', 'error de permiso', v_err, v_err ILIKE '%permiso%');
  BEGIN PERFORM cambiar_estado_pedido(pg_temp._p('p_web'), 'procesando', 'payment_pending'); v_err := 'sin error'; EXCEPTION WHEN others THEN v_err := SQLERRM; END;
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('cliente no cambia estados', 'error de permiso', v_err, v_err ILIKE '%permiso%');
  BEGIN PERFORM cancel_order_out_of_stock(pg_temp._p('p_web'), ARRAY[pg_temp._p('libro')::int]); v_err := 'sin error'; EXCEPTION WHEN others THEN v_err := SQLERRM; END;
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('cliente no cancela por falta de stock', 'error de permiso', v_err, v_err ILIKE '%personal%');
  BEGIN PERFORM emitir_factura_pedido(pg_temp._p('p_web')); v_err := 'sin error'; EXCEPTION WHEN others THEN v_err := SQLERRM; END;
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('cliente no emite facturas', 'error de permiso', v_err, v_err ILIKE '%administradores%');

  PERFORM pg_temp._como('editor');
  BEGIN PERFORM emitir_factura_pedido(pg_temp._p('p_web')); v_err := 'sin error'; EXCEPTION WHEN others THEN v_err := SQLERRM; END;
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('editor NO emite facturas', 'error de permiso', v_err, v_err ILIKE '%administradores%');
END $$;

-- ---------- Aceptar pedido web (editor) ----------
DO $$ DECLARE r jsonb; s0 int; BEGIN
  PERFORM pg_temp._como('editor');
  r := aceptar_pedido_web(pg_temp._p('p_acepta'), 12.345);
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('aceptar: 3 decimales rechazado', 'coste_no_valido', r->>'codigo', r->>'codigo' = 'coste_no_valido');
  r := aceptar_pedido_web(pg_temp._p('p_acepta'), 600);
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('aceptar: por encima del tope rechazado', 'coste_no_valido', r->>'codigo', r->>'codigo' = 'coste_no_valido');
  s0 := pg_temp._stock();
  r := aceptar_pedido_web(pg_temp._p('p_acepta'), 22);
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('aceptar: editor acepta, total = líneas + envío, ajustado, sin tocar stock',
    'ok / 32 / ajustado / payment_pending / stock igual',
    (r->>'ok') || ' / ' || (r->>'total') || ' / ' || (r->>'ajustado') || ' / ' || (SELECT estado::text FROM pedidos WHERE id = pg_temp._p('p_acepta')) || ' / ' || (pg_temp._stock() = s0)::text,
    (r->>'ok')::boolean AND (r->>'total')::numeric = 32 AND (r->>'ajustado')::boolean
      AND (SELECT estado::text FROM pedidos WHERE id = pg_temp._p('p_acepta')) = 'payment_pending' AND pg_temp._stock() = s0);
  r := aceptar_pedido_web(pg_temp._p('p_acepta'), 22);
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('aceptar: segunda vez -> estado_no_valido', 'estado_no_valido / payment_pending',
    (r->>'codigo') || ' / ' || (r->>'estado_actual'), r->>'codigo' = 'estado_no_valido' AND r->>'estado_actual' = 'payment_pending');
END $$;

-- ---------- Cambios de estado: regla de stock de la web (editor) ----------
DO $$ DECLARE r jsonb; s0 int; BEGIN
  PERFORM pg_temp._como('editor');

  s0 := pg_temp._stock();
  r := cambiar_estado_pedido(pg_temp._p('p_web'), 'procesando', 'payment_pending');
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('interno payment_pending -> procesando descuenta 2', (s0 - 2)::text || ' / descontar', pg_temp._stock() || ' / ' || (r->>'stock_accion'), pg_temp._stock() = s0 - 2 AND r->>'stock_accion' = 'descontar');

  s0 := pg_temp._stock();
  r := cambiar_estado_pedido(pg_temp._p('p_web'), 'procesando', 'payment_pending');
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('repetir el mismo cambio -> ya_aplicado, stock igual', 'ya_aplicado / ' || s0, coalesce(r->>'ya_aplicado', 'f') || ' / ' || pg_temp._stock(), (r->>'ya_aplicado')::boolean AND pg_temp._stock() = s0);

  r := cambiar_estado_pedido(pg_temp._p('p_web'), 'completado', 'pendiente');
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('estado esperado distinto -> conflicto', 'conflicto / procesando', (r->>'codigo') || ' / ' || (r->>'estado_actual'), r->>'codigo' = 'conflicto' AND r->>'estado_actual' = 'procesando');

  r := cambiar_estado_pedido(pg_temp._p('p_web'), 'enviado', 'procesando');
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('interno -> enviado sin seguimiento rechazado', 'falta_envio', r->>'codigo', r->>'codigo' = 'falta_envio');

  s0 := pg_temp._stock();
  r := cambiar_estado_pedido(pg_temp._p('p_web'), 'enviado', 'procesando', 'Correos', 'PK123');
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('procesando -> enviado con seguimiento: sin tocar stock', 'ok / ninguna / ' || s0 || ' / PK123',
    (r->>'ok') || ' / ' || (r->>'stock_accion') || ' / ' || pg_temp._stock() || ' / ' || (SELECT tracking FROM pedidos WHERE id = pg_temp._p('p_web')),
    (r->>'ok')::boolean AND r->>'stock_accion' = 'ninguna' AND pg_temp._stock() = s0 AND (SELECT tracking FROM pedidos WHERE id = pg_temp._p('p_web')) = 'PK123');

  s0 := pg_temp._stock();
  r := cambiar_estado_pedido(pg_temp._p('p_web'), 'cancelado', 'enviado');
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('interno enviado -> cancelado restaura 2', (s0 + 2)::text || ' / restaurar', pg_temp._stock() || ' / ' || (r->>'stock_accion'), pg_temp._stock() = s0 + 2 AND r->>'stock_accion' = 'restaurar');

  s0 := pg_temp._stock();
  r := cambiar_estado_pedido(pg_temp._p('p_express'), 'cancelado', 'pendiente');
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('express pendiente -> cancelado restaura 1 (descontó al crearse)', (s0 + 1)::text, pg_temp._stock()::text, pg_temp._stock() = s0 + 1);

  s0 := pg_temp._stock();
  r := cambiar_estado_pedido(pg_temp._p('p_flash'), 'procesando', 'cancelado');
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('flash cancelado -> procesando NO descuenta (como la web)', s0::text || ' / ninguna', pg_temp._stock() || ' / ' || (r->>'stock_accion'), pg_temp._stock() = s0 AND r->>'stock_accion' = 'ninguna');

  s0 := pg_temp._stock();
  r := cambiar_estado_pedido(pg_temp._p('p_vuelta'), 'pendiente', 'procesando');
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('interno procesando -> pendiente NO restaura (como la web)', s0::text || ' / ninguna', pg_temp._stock() || ' / ' || (r->>'stock_accion'), pg_temp._stock() = s0 AND r->>'stock_accion' = 'ninguna');

  r := cambiar_estado_pedido(pg_temp._p('p_sinstock'), 'procesando', 'sin_stock');
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('sin_stock no se reabre', 'sin_stock_cerrado', r->>'codigo', r->>'codigo' = 'sin_stock_cerrado');

  r := cambiar_estado_pedido(pg_temp._p('p_web'), 'payment_pending', 'cancelado');
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('destino payment_pending no permitido', 'destino_no_valido', r->>'codigo', r->>'codigo' = 'destino_no_valido');

  s0 := pg_temp._stock();
  r := cambiar_estado_pedido(pg_temp._p('p_mucho'), 'procesando', 'payment_pending');
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('stock insuficiente: queda a 0 y se avisa', '0 / insuficiente', pg_temp._stock() || ' / ' || coalesce(r->'stock'->0->>'insuficiente', 'null'),
    pg_temp._stock() = 0 AND (r->'stock'->0->>'insuficiente')::boolean);
END $$;

-- ---------- Guardar envío con conflicto ----------
DO $$ DECLARE r jsonb; v_upd timestamptz; BEGIN
  PERFORM pg_temp._como('editor');
  SELECT updated_at INTO v_upd FROM pedidos WHERE id = pg_temp._p('p_vuelta');
  r := guardar_envio_pedido(pg_temp._p('p_vuelta'), 'GLS', 'X1', v_upd - interval '1 minute');
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('guardar envío con fecha antigua -> conflicto', 'conflicto', r->>'codigo', r->>'codigo' = 'conflicto');
  r := guardar_envio_pedido(pg_temp._p('p_vuelta'), 'GLS', 'X1', v_upd);
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('guardar envío con fecha actual -> ok', 'ok / X1', (r->>'ok') || ' / ' || (SELECT tracking FROM pedidos WHERE id = pg_temp._p('p_vuelta')),
    (r->>'ok')::boolean AND (SELECT tracking FROM pedidos WHERE id = pg_temp._p('p_vuelta')) = 'X1');
END $$;

-- ---------- Cancelar por falta de stock (editor, función existente con guarda nueva) ----------
DO $$ DECLARE v_ok boolean; BEGIN
  PERFORM pg_temp._como('editor');
  v_ok := cancel_order_out_of_stock(pg_temp._p('p_cancel'), ARRAY[pg_temp._p('libro')::int]);
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('editor cancela por falta de stock: libro a 0, pedido sin_stock', 'true / 0 / sin_stock',
    v_ok || ' / ' || pg_temp._stock() || ' / ' || (SELECT estado::text FROM pedidos WHERE id = pg_temp._p('p_cancel')),
    v_ok AND pg_temp._stock() = 0 AND (SELECT estado::text FROM pedidos WHERE id = pg_temp._p('p_cancel')) = 'sin_stock');
END $$;

-- ---------- Factura desde pedido (super_admin) ----------
DO $$ DECLARE r1 jsonb; r2 jsonb; r3 jsonb; BEGIN
  PERFORM pg_temp._como('super');
  r1 := emitir_factura_pedido(pg_temp._p('p_vuelta'));
  r2 := emitir_factura_pedido(pg_temp._p('p_vuelta'));
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('factura: dos llamadas -> una factura, mismo número', 'creada=t, luego f / 1 factura / AAAA-NNNN',
    (r1->>'creada') || ', luego ' || (r2->>'creada') || ' / ' || (SELECT count(*) FROM invoices WHERE order_id = pg_temp._p('p_vuelta')::text) || ' / ' || (r1->>'numero'),
    (r1->>'creada')::boolean AND NOT (r2->>'creada')::boolean AND r1->>'factura_id' = r2->>'factura_id'
      AND (SELECT count(*) FROM invoices WHERE order_id = pg_temp._p('p_vuelta')::text) = 1 AND r1->>'numero' ~ ('^' || to_char(now(), 'YYYY') || '-[0-9]{4}$'));
  r3 := emitir_factura_pedido(pg_temp._p('p_web'));
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('factura: pedido cancelado rechazado', 'estado_no_valido', r3->>'codigo', r3->>'codigo' = 'estado_no_valido');
END $$;

RESET ROLE;

INSERT INTO _r (caso, esperado, obtenido, ok)
SELECT 'auditoría con autor en las acciones', '>0 filas con usuario', count(*)::text, count(*) > 0
FROM auditoria WHERE tabla = 'pedidos' AND usuario_id IS NOT NULL
  AND registro_id IN (SELECT v::bigint FROM _ctx WHERE k LIKE 'p\_%');

SELECT n, ok, caso, esperado, obtenido FROM _r ORDER BY n;

-- Obligatorio: deshace todos los datos de prueba aunque se ejecute suelto en el editor SQL.
ROLLBACK;
