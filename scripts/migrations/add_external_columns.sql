-- Add supporting columns for external products (not in catalog)
ALTER TABLE pedido_detalles
ADD COLUMN IF NOT EXISTS nombre_externo TEXT,
    ADD COLUMN IF NOT EXISTS url_externa TEXT;
-- Allow libro_id to be NULL (since external products don't link to libros)
ALTER TABLE pedido_detalles
ALTER COLUMN libro_id DROP NOT NULL;
-- Remove old constraint to avoid conflicts
ALTER TABLE pedido_detalles DROP CONSTRAINT IF EXISTS check_item_source;
-- Add constraint: Must have EITHER a linked book OR an external name
ALTER TABLE pedido_detalles
ADD CONSTRAINT check_item_source CHECK (
        (libro_id IS NOT NULL)
        OR (nombre_externo IS NOT NULL)
    );
-- Force schema cache reload
NOTIFY pgrst,
'reload config';