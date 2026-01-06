import json

input_path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_structured.json"
output_path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_structured.json"

print("Loading JSON...")
with open(input_path, 'r', encoding='utf-8') as f:
    books = json.load(f)

print(f"Updating {len(books)} records...")
for book in books:
    book["ubicacion_id"] = 1  # Almacén

print("Saving updated JSON...")
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(books, f, indent=2, ensure_ascii=False)

print(f"✅ Done! All {len(books)} records now have ubicacion_id = 1 (Almacén)")
