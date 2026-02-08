-- Check column names first
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'libros';

-- Check ISBN content variations
SELECT 'Total' as label, count(*) FROM libros
UNION ALL
SELECT 'Null', count(*) FROM libros WHERE isbn IS NULL
UNION ALL
SELECT 'Empty String', count(*) FROM libros WHERE isbn = ''
UNION ALL
SELECT 'Whitespace only', count(*) FROM libros WHERE trim(isbn) = '' AND isbn IS NOT NULL
UNION ALL
SELECT 'Valid-ish', count(*) FROM libros WHERE length(trim(isbn)) > 5;

-- Sample some "valid" ones to see format
SELECT id, legacy_id, isbn FROM libros WHERE length(trim(isbn)) > 5 LIMIT 10;

-- check if there is another candidate column
SELECT 'cod_barras not null' as label, count(*) FROM libros WHERE cod_barras IS NOT NULL AND cod_barras != '';

-- Check 'observaciones' for ISBN-like patterns
SELECT 'ISBN in Observaciones' as label, count(*) FROM libros 
WHERE observaciones ~* '(ISBN|978-|978\s-|979-)\d+';

-- Check 'descripcion' for ISBN-like patterns
SELECT 'ISBN in Descripcion' as label, count(*) FROM libros 
WHERE descripcion ~* '(ISBN|978-|978\s-|979-)\d+';
