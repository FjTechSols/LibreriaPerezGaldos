-- Run before the RPC migration so the new enum value is committed.
ALTER TYPE public.estado_pedido ADD VALUE IF NOT EXISTS 'sin_stock';
