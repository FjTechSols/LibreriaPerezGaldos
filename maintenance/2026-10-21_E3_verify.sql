-- Verificación de E3 (reservas del cliente). Empieza con BEGIN y TERMINA EN ROLLBACK.
BEGIN;
CREATE TEMP TABLE _r (n serial, caso text, esperado text, obtenido text, ok boolean) ON COMMIT DROP;
CREATE TEMP TABLE _ctx (k text PRIMARY KEY, v text) ON COMMIT DROP;
GRANT ALL ON _r, _ctx TO authenticated; GRANT USAGE ON SEQUENCE _r_n_seq TO authenticated;
CREATE FUNCTION pg_temp.v(p_k text) RETURNS text LANGUAGE sql AS $$ SELECT v FROM _ctx WHERE k = p_k $$;
CREATE FUNCTION pg_temp.chk(p_caso text, p_esperado text, p_obtenido text) RETURNS void LANGUAGE sql AS $$
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES (p_caso, p_esperado, coalesce(p_obtenido, 'NULL'), p_esperado = coalesce(p_obtenido, 'NULL')); $$;
CREATE FUNCTION pg_temp.err(p_sql text) RETURNS text LANGUAGE plpgsql AS $$ BEGIN EXECUTE p_sql; RETURN 'ok'; EXCEPTION WHEN others THEN RETURN SQLSTATE; END $$;
CREATE FUNCTION pg_temp.m(p_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE c bigint; BEGIN EXECUTE 'WITH x AS (' || p_sql || ' RETURNING 1) SELECT count(*) FROM x' INTO c; RETURN c::text; EXCEPTION WHEN others THEN RETURN SQLSTATE; END $$;
CREATE FUNCTION pg_temp.como(p_k text) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', json_build_object('sub', pg_temp.v(p_k), 'role', 'authenticated')::text, true); $$;
GRANT EXECUTE ON FUNCTION pg_temp.v(text), pg_temp.chk(text, text, text), pg_temp.err(text), pg_temp.m(text), pg_temp.como(text) TO authenticated;

INSERT INTO _ctx SELECT 'cliente' || rn, auth_user_id::text FROM (
  SELECT u.auth_user_id, row_number() OVER (ORDER BY u.fecha_registro, u.id) rn FROM usuarios u
  WHERE u.rol_id = 2 AND u.auth_user_id IS NOT NULL AND coalesce(u.activo, true)
    AND NOT EXISTS (SELECT 1 FROM usuarios_roles ur WHERE ur.user_id = u.auth_user_id AND ur.activo)) x WHERE rn <= 2;
INSERT INTO _ctx SELECT k || '_id', u.id::text FROM _ctx c JOIN usuarios u ON u.auth_user_id::text = c.v WHERE c.k IN ('cliente1', 'cliente2');
INSERT INTO _ctx SELECT 'editor', ur.user_id::text FROM usuarios_roles ur JOIN roles r ON r.id = ur.rol_id
  WHERE ur.activo AND r.nombre = 'editor' ORDER BY ur.user_id LIMIT 1;
INSERT INTO _ctx SELECT 'libro', id::text FROM libros WHERE activo AND stock > 0 ORDER BY id LIMIT 1;
WITH r AS (INSERT INTO reservas (usuario_id, libro_id, estado) VALUES (pg_temp.v('cliente2_id')::uuid, pg_temp.v('libro')::bigint, 'pendiente') RETURNING id)
INSERT INTO _ctx SELECT 'reserva_otro', id::text FROM r;
INSERT INTO _ctx SELECT 'avisos_antes', count(*)::text FROM notificaciones;

SET LOCAL ROLE authenticated;
DO $$ BEGIN
  PERFORM pg_temp.como('cliente1');
  PERFORM pg_temp.chk('cliente reserva un libro (pendiente)', 'ok', pg_temp.err(format(
    'INSERT INTO reservas (usuario_id, libro_id, estado) VALUES (%L, %s, ''pendiente'')', pg_temp.v('cliente1_id'), pg_temp.v('libro'))));
  INSERT INTO _ctx SELECT 'reserva', max(id)::text FROM reservas WHERE usuario_id = pg_temp.v('cliente1_id')::uuid;
  PERFORM pg_temp.chk('cliente NO crea reservas ya confirmadas', '42501', pg_temp.err(format(
    'INSERT INTO reservas (usuario_id, libro_id, estado) VALUES (%L, %s, ''confirmada'')', pg_temp.v('cliente1_id'), pg_temp.v('libro'))));
  PERFORM pg_temp.chk('cliente NO reserva a nombre de otro', '42501', pg_temp.err(format(
    'INSERT INTO reservas (usuario_id, libro_id, estado) VALUES (%L, %s, ''pendiente'')', pg_temp.v('cliente2_id'), pg_temp.v('libro'))));
  PERFORM pg_temp.chk('cliente NO se confirma su reserva', '42501', pg_temp.m(format('UPDATE reservas SET estado = ''confirmada'' WHERE id = %s', pg_temp.v('reserva'))));
  PERFORM pg_temp.chk('cliente NO alarga la fecha de recogida', '42501', pg_temp.m(format(
    'UPDATE reservas SET estado = ''cancelada'', fecha_expiracion = now() + interval ''1 year'' WHERE id = %s', pg_temp.v('reserva'))));
  PERFORM pg_temp.chk('cliente cancela su reserva pendiente (web y app)', '1', pg_temp.m(format(
    'UPDATE reservas SET estado = ''cancelada'', updated_at = now() WHERE id = %s AND usuario_id = %L AND estado = ''pendiente''', pg_temp.v('reserva'), pg_temp.v('cliente1_id'))));
  PERFORM pg_temp.chk('cliente NO reabre la reserva cancelada', '0', pg_temp.m(format('UPDATE reservas SET estado = ''pendiente'' WHERE id = %s', pg_temp.v('reserva'))));
  PERFORM pg_temp.chk('cliente NO cancela reservas ajenas', '0', pg_temp.m(format('UPDATE reservas SET estado = ''cancelada'' WHERE id = %s', pg_temp.v('reserva_otro'))));
  PERFORM pg_temp.como('editor');
  PERFORM pg_temp.chk('personal confirma reservas', '1', pg_temp.m(format(
    'UPDATE reservas SET estado = ''confirmada'', fecha_expiracion = now() + interval ''3 days'' WHERE id = %s', pg_temp.v('reserva_otro'))));
END $$;
RESET ROLE;
SELECT pg_temp.chk('aviso de reserva: hay avisos y todos van al personal (paso B)', 'true', (
  SELECT count(*) > 0 AND bool_and(EXISTS (SELECT 1 FROM usuarios u LEFT JOIN roles r1 ON r1.id = u.rol_id
      WHERE u.id = n.usuario_id AND (r1.nombre IN ('super_admin', 'admin', 'editor')
        OR EXISTS (SELECT 1 FROM usuarios_roles ur JOIN roles r ON r.id = ur.rol_id WHERE ur.user_id = u.auth_user_id AND ur.activo AND r.nombre IN ('super_admin', 'admin', 'editor')))))
  FROM (SELECT usuario_id FROM notificaciones ORDER BY id DESC LIMIT ((SELECT count(*) FROM notificaciones) - pg_temp.v('avisos_antes')::int)) n)::text);

SELECT n, ok, caso, esperado, obtenido FROM _r ORDER BY n;
ROLLBACK;
