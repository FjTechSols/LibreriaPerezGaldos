-- DEBUG ERROR 22P02
-- Intentar reproducir el error 'malformed array literal: "l.stock > 0"'

SELECT * FROM public.search_books(
    'tactica',       -- search_term
    10,              -- limit
    0,               -- offset
    NULL,            -- min_price
    NULL,            -- max_price
    NULL,            -- category_id
    NULL,            -- editorial_id
    'in_stock',      -- p_stock_status (ESTO DEBERÍA DISPARAR EL ERROR)
    true,            -- is_visible
    'relevance'      -- sort_by
);
