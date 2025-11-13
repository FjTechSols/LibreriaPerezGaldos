/*
  # Add Stripe Payment Fields

  1. Changes
    - Add `stripe_payment_id` column to `pedidos` table to store Stripe Payment Intent ID
    - Add index on `stripe_payment_id` for faster lookups

  2. Security
    - No changes to RLS policies needed
*/

-- Add stripe_payment_id column to pedidos table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pedidos' AND column_name = 'stripe_payment_id'
  ) THEN
    ALTER TABLE pedidos ADD COLUMN stripe_payment_id text;
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pedidos_stripe_payment_id ON pedidos(stripe_payment_id);

-- Add comment
COMMENT ON COLUMN pedidos.stripe_payment_id IS 'Stripe Payment Intent ID for online payments';
