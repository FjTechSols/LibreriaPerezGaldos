import json
import csv

input_json = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_import_ready.json"
output_csv = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_import.csv"

print("Loading JSON...")
with open(input_json, 'r', encoding='utf-8') as f:
    books = json.load(f)

print(f"Converting {len(books)} records to CSV...")

# Define columns in the order they appear in the table
columns = [
    'isbn', 'titulo', 'anio', 'paginas', 'descripcion', 'notas',
    'categoria_id', 'editorial_id', 'legacy_id', 'precio', 'ubicacion',
    'fecha_ingreso', 'activo', 'imagen_url', 'stock', 'autor',
    'destacado', 'novedad', 'oferta', 'precio_original'
]

with open(output_csv, 'w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=columns, extrasaction='ignore')
    writer.writeheader()
    
    for book in books:
        # Create row with only the columns we need
        row = {}
        for col in columns:
            value = book.get(col)
            # Convert None to empty string for CSV (PostgreSQL will treat as NULL)
            row[col] = value if value is not None else ''
        
        writer.writerow(row)

print(f"✅ CSV created: {output_csv}")
print(f"Ready for PostgreSQL COPY command")
