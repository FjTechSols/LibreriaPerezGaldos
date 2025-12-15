-- Function to get the sum of all stock from active books
CREATE OR REPLACE FUNCTION get_total_books_stock() RETURNS INTEGER LANGUAGE plpgsql AS $$ BEGIN RETURN (
        SELECT COALESCE(SUM(stock), 0)
        FROM libros
        WHERE activo = true
    );
END;
$$;