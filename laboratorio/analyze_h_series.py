import json
import re

input_path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_structured.json"

print("Loading JSON...")
with open(input_path, 'r', encoding='utf-8') as f:
    books = json.load(f)

# Find all records with pattern: digits + H
h_series = []

for book in books:
    legacy_id = book.get("legacy_id", "")
    
    # Match pattern: one or more digits followed by 'H'
    if legacy_id and re.match(r'^\d+H$', legacy_id, re.IGNORECASE):
        # Extract the numeric part
        numeric_part = legacy_id[:-1]  # Remove the 'H'
        try:
            num_value = int(numeric_part)
            h_series.append({
                "legacy_id": legacy_id,
                "numeric_value": num_value,
                "titulo": book.get("titulo", "")[:40]
            })
        except ValueError:
            pass

print(f"\n--- DIGITS+H PATTERN ANALYSIS ---")
print(f"Total records: {len(h_series)}")

if h_series:
    # Sort by numeric value
    h_series.sort(key=lambda x: x['numeric_value'])
    
    min_record = h_series[0]
    max_record = h_series[-1]
    
    print(f"\nRange:")
    print(f"  Lowest: {min_record['legacy_id']} (numeric: {min_record['numeric_value']})")
    print(f"    Title: {min_record['titulo']}")
    print(f"  Highest: {max_record['legacy_id']} (numeric: {max_record['numeric_value']})")
    print(f"    Title: {max_record['titulo']}")
    
    print(f"\nFirst 10 records:")
    for item in h_series[:10]:
        print(f"  {item['legacy_id']} - {item['titulo']}")
    
    print(f"\nLast 10 records:")
    for item in h_series[-10:]:
        print(f"  {item['legacy_id']} - {item['titulo']}")
