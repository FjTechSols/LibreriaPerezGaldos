import json

input_path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_structured.json"

print("Loading JSON...")
with open(input_path, 'r', encoding='utf-8') as f:
    books = json.load(f)

# Counters
total_numeric_8digit = 0
in_range = 0
out_of_range = 0

min_id = 0
max_id = 2292927

for book in books:
    legacy_id = book.get("legacy_id", "")
    
    # Check if it's 8 digits and numeric
    if legacy_id and legacy_id.isdigit() and len(legacy_id) == 8:
        total_numeric_8digit += 1
        id_num = int(legacy_id)
        
        if min_id <= id_num <= max_id:
            in_range += 1
        else:
            out_of_range += 1

print(f"\n--- NUMERIC LEGACY_ID ANALYSIS ---")
print(f"Total records in file: {len(books)}")
print(f"\nTotal con legacy_id numérico (8 dígitos): {total_numeric_8digit}")
print(f"\n  Dentro del rango [00000000 - 02292927]: {in_range}")
print(f"  Fuera del rango (> 02292927): {out_of_range}")
