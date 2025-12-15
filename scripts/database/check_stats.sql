SELECT count(*) as total_rows,
    count(*) FILTER (
        WHERE stock > 0
    ) as unique_titles_in_stock,
    sum(stock) as total_units_in_stock
FROM libros;