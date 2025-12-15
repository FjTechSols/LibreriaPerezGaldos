-- Drop the unique constraint on the 'isbn' column in the 'libros' table
-- This allows multiple books to share the same ISBN (e.g., diffeent conditions/legacy database entries)
ALTER TABLE public.libros DROP CONSTRAINT IF EXISTS libros_isbn_key;
-- Verify if index exists and drop it if it enforces uniqueness
DROP INDEX IF EXISTS public.libros_isbn_key;
-- Ensure a non-unique index exists for performance if you still want to search by ISBN efficiently
CREATE INDEX IF NOT EXISTS libros_isbn_idx ON public.libros(isbn);