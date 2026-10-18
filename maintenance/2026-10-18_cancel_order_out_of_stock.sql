-- Cancel an order and reconcile its inventory in one transaction.
CREATE OR REPLACE FUNCTION public.cancel_order_out_of_stock(p_pedido_id bigint, p_libros_sin_stock integer[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    current_order record;
    item record;
    restore_remaining boolean;
    missing_ids integer[];
    stock_changes jsonb := '[]'::jsonb;
BEGIN
    IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo los administradores pueden cancelar por falta de stock' USING ERRCODE = '42501'; END IF;
    SELECT * INTO current_order FROM public.pedidos WHERE id = p_pedido_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Pedido no encontrado'; END IF;
    -- Retried or double-clicked requests must never restore stock twice.
    IF current_order.estado::text = 'sin_stock' THEN RETURN true; END IF;
    SELECT array_agg(DISTINCT id) INTO missing_ids FROM unnest(p_libros_sin_stock) AS id WHERE id IS NOT NULL;
    IF coalesce(array_length(missing_ids, 1), 0) = 0 THEN RAISE EXCEPTION 'Selecciona al menos un libro sin stock'; END IF;
    PERFORM id FROM public.pedido_detalles WHERE pedido_id = p_pedido_id FOR UPDATE;
    IF EXISTS (
        SELECT 1 FROM unnest(missing_ids) AS selected(id)
        WHERE NOT EXISTS (SELECT 1 FROM public.pedido_detalles d JOIN public.libros l ON l.id = d.libro_id WHERE d.pedido_id = p_pedido_id AND d.libro_id = selected.id)
    ) THEN RAISE EXCEPTION 'Hay libros seleccionados que no pertenecen al pedido'; END IF;
    -- Always acquire book locks in a consistent order, including repeated book lines.
    PERFORM l.id FROM public.libros l
    WHERE l.id IN (SELECT d.libro_id FROM public.pedido_detalles d WHERE d.pedido_id = p_pedido_id)
    ORDER BY l.id FOR UPDATE;
    restore_remaining := coalesce(current_order.estado::text IN ('procesando', 'enviado', 'completado') OR
        (current_order.tipo::text IN ('express', 'flash') AND current_order.estado::text NOT IN ('cancelado', 'devolucion')), false);
    FOR item IN
        SELECT l.id, l.stock, sum(d.cantidad)::integer AS quantity
        FROM public.pedido_detalles d JOIN public.libros l ON l.id = d.libro_id
        WHERE d.pedido_id = p_pedido_id GROUP BY l.id, l.stock ORDER BY l.id
    LOOP
        IF item.id = ANY(missing_ids) THEN
            UPDATE public.libros SET stock = 0 WHERE id = item.id;
        ELSIF restore_remaining THEN
            UPDATE public.libros SET stock = coalesce(stock, 0) + item.quantity WHERE id = item.id;
        END IF;
        stock_changes := stock_changes || jsonb_build_array(jsonb_build_object('libro_id', item.id, 'stock_anterior', item.stock,
            'stock_nuevo', CASE WHEN item.id = ANY(missing_ids) THEN 0 WHEN restore_remaining THEN coalesce(item.stock, 0) + item.quantity ELSE item.stock END));
    END LOOP;
    UPDATE public.pedidos SET estado = 'sin_stock' WHERE id = p_pedido_id;
    INSERT INTO public.auditoria(tabla, registro_id, accion, datos_anteriores, datos_nuevos)
    VALUES ('pedidos', p_pedido_id, 'UPDATE', jsonb_build_object('estado', current_order.estado),
        jsonb_build_object('estado', 'sin_stock', 'motivo', 'Cancelado por falta de stock', 'libros_sin_stock', missing_ids, 'stock', stock_changes));
    RETURN true;
END;
$function$;
REVOKE ALL ON FUNCTION public.cancel_order_out_of_stock(bigint, integer[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_order_out_of_stock(bigint, integer[]) TO authenticated;
NOTIFY pgrst, 'reload schema';
