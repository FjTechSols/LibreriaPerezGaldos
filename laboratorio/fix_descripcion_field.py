import json

input_path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_structured.json"
output_path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_structured.json"

print("Loading JSON...")
with open(input_path, 'r', encoding='utf-8') as f:
    books = json.load(f)

moved_count = 0

print(f"Processing {len(books)} records...")
for book in books:
    # Move titulo_secundario to descripcion
    titulo_secundario = book.get("titulo_secundario")
    
    if titulo_secundario:
        book["descripcion"] = titulo_secundario
        moved_count += 1
    
    # Remove titulo_secundario field
    if "titulo_secundario" in book:
        del book["titulo_secundario"]

print(f"\n--- RESULTS ---")
print(f"Records with titulo_secundario moved to descripcion: {moved_count}")
print(f"titulo_secundario field removed from all records")

print("\nSaving updated JSON...")
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(books, f, indent=2, ensure_ascii=False)

print(f"✅ Done! File updated: {output_path}")
