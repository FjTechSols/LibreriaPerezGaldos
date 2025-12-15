-- Migration to add new values to 'tipo_pedido' enum
-- Execute this script in the Supabase SQL Editor to enable the new order types.
ALTER TYPE tipo_pedido
ADD VALUE IF NOT EXISTS 'perez_galdos';
ALTER TYPE tipo_pedido
ADD VALUE IF NOT EXISTS 'galeon';
-- Note: 'interno' is preserved for web orders and existing records.