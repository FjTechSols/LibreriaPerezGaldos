/*
  # Create Reviews System

  1. New Tables
    - `reviews`
      - `id` (bigint, primary key, auto-increment)
      - `libro_id` (bigint, foreign key to libros)
      - `usuario_id` (uuid, foreign key to auth.users)
      - `rating` (integer, 1-5)
      - `comment` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `reviews` table
    - Policy: Authenticated users can create reviews
    - Policy: Users can read all reviews
    - Policy: Users can update/delete their own reviews
    - Constraint: Rating must be between 1 and 5
    - Constraint: One review per user per book

  3. Functions
    - Function to calculate average rating for books
*/

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id bigserial PRIMARY KEY,
  libro_id bigint NOT NULL REFERENCES libros(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(libro_id, usuario_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_reviews_libro_id ON reviews(libro_id);
CREATE INDEX IF NOT EXISTS idx_reviews_usuario_id ON reviews(usuario_id);

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Policies for reviews
CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can update own reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can delete own reviews"
  ON reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = usuario_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_reviews_updated_at ON reviews;
CREATE TRIGGER trigger_update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_reviews_updated_at();

-- Function to get average rating for a book
CREATE OR REPLACE FUNCTION get_book_average_rating(book_id bigint)
RETURNS numeric AS $$
  SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0)
  FROM reviews
  WHERE libro_id = book_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to get review count for a book
CREATE OR REPLACE FUNCTION get_book_review_count(book_id bigint)
RETURNS bigint AS $$
  SELECT COUNT(*)
  FROM reviews
  WHERE libro_id = book_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
