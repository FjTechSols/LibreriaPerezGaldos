-- Migration to add 'language' column to 'invoices' table
-- This allows storing the language preference (es/en) for later PDF regeneration.
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS language text DEFAULT 'es';
-- Optional: Add check constraint if supported/desired, but app logic handles enum.
-- ALTER TABLE invoices ADD CONSTRAINT check_language CHECK (language IN ('es', 'en'));