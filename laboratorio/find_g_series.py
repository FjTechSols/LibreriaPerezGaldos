import json
import re

input_path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_structured.json"

print("Loading JSON...")
with open(input_path, 'r', encoding='utf-8') as f:
    books = json.load(f)

# Find all records with 'G' in legacy_id
g_series = []

for book in books:
    legacy_id = book.get("legacy_id", "")
    
    if legacy_id and 'G' in legacy_id.upper():
        g_series.append({
            "legacy_id": legacy_id,
            "titulo": book.get("titulo", "")[:50]  # First 50 chars
        })

print(f"\n--- RECORDS WITH 'G' IN LEGACY_ID ---")
print(f"Total found: {len(g_series)}")

if g_series:
    # Show first 20 examples
    print(f"\nFirst 20 examples:")
    for item in g_series[:20]:
        print(f"  {item['legacy_id']} - {item['titulo']}")
    
    # Try to identify patterns
    print(f"\n--- PATTERN ANALYSIS ---")
    
    # Pattern: G followed by digits (e.g., G0001234)
    pattern1 = [x for x in g_series if re.match(r'^G\d+$', x['legacy_id'], re.IGNORECASE)]
    print(f"Pattern 'G' + digits (e.g., G0001234): {len(pattern1)}")
    
    # Pattern: Digits followed by G (e.g., 0001234G)
    pattern2 = [x for x in g_series if re.match(r'^\d+G$', x['legacy_id'], re.IGNORECASE)]
    print(f"Pattern digits + 'G' (e.g., 0001234G): {len(pattern2)}")
    
    if pattern2:
        print(f"\nSample of digits+G pattern:")
        for item in pattern2[:10]:
            print(f"  {item['legacy_id']}")
