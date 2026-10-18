CREATE OR REPLACE FUNCTION public.guard_out_of_stock_order()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $guard$
BEGIN
    IF OLD.estado::text = 'sin_stock' AND NEW.estado IS DISTINCT FROM OLD.estado THEN
        RAISE EXCEPTION 'El pedido está cancelado por falta de stock. Comprueba el inventario y crea un nuevo pedido para retomarlo.';
    END IF;
    RETURN NEW;
END;
$guard$;
DROP TRIGGER IF EXISTS guard_out_of_stock_order ON public.pedidos;
CREATE TRIGGER guard_out_of_stock_order BEFORE UPDATE OF estado ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.guard_out_of_stock_order();

CREATE OR REPLACE FUNCTION public.deduct_stock_force(p_pedido_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_detalle RECORD;
  v_current_stock integer;
BEGIN
    -- A cancelled missing-stock order must never deduct or restore inventory again.
    PERFORM 1 FROM public.pedidos WHERE id = p_pedido_id FOR UPDATE;
    IF EXISTS (SELECT 1 FROM public.pedidos WHERE id = p_pedido_id AND estado::text = 'sin_stock') THEN
        RETURN false;
    END IF;
  -- Verificar que el pedido existe
  IF NOT EXISTS (SELECT 1 FROM public.pedidos WHERE id = p_pedido_id) THEN
    RAISE EXCEPTION 'Pedido % no encontrado', p_pedido_id;
  END IF;

  -- Iterar sobre cada línea de detalle del pedido que tenga un libro asociado
  FOR v_detalle IN
    SELECT pd.libro_id, pd.cantidad
    FROM public.pedido_detalles pd
    WHERE pd.pedido_id = p_pedido_id
      AND pd.libro_id IS NOT NULL
  LOOP
    -- Obtener stock actual
    SELECT stock INTO v_current_stock
    FROM public.libros
    WHERE id = v_detalle.libro_id;

    -- Descontar stock (no bajar de 0)
    UPDATE public.libros
    SET stock = GREATEST(0, stock - v_detalle.cantidad)
    WHERE id = v_detalle.libro_id;
    
    RAISE LOG '[deduct_stock_force] Pedido %, Libro %: stock % -> %', 
      p_pedido_id, v_detalle.libro_id, v_current_stock, 
      GREATEST(0, v_current_stock - v_detalle.cantidad);
  END LOOP;

  RETURN TRUE;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG '[deduct_stock_force] ERROR en pedido %: %', p_pedido_id, SQLERRM;
    RETURN FALSE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.restore_stock_force(p_pedido_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_detalle RECORD;
BEGIN
    -- A cancelled missing-stock order must never deduct or restore inventory again.
    PERFORM 1 FROM public.pedidos WHERE id = p_pedido_id FOR UPDATE;
    IF EXISTS (SELECT 1 FROM public.pedidos WHERE id = p_pedido_id AND estado::text = 'sin_stock') THEN
        RETURN false;
    END IF;
    FOR v_detalle IN
        SELECT *
        FROM pedido_detalles
        WHERE pedido_id = p_pedido_id
    LOOP
        IF v_detalle.libro_id IS NOT NULL THEN
            UPDATE libros
            SET stock = stock + v_detalle.cantidad,
                updated_at = NOW()
            WHERE id = v_detalle.libro_id;
        END IF;
    END LOOP;
    
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$function$
;

