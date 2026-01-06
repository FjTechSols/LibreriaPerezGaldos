
import json
from collections import Counter

input_path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_structured.json"

try:
    with open(input_path, 'r', encoding='utf-8') as f:
        books = json.load(f)
    
    locations = []
    for b in books:
        if b.get("ubicacion"):
            locations.append(b["ubicacion"].strip())
            
    counts = Counter(locations)
    
    print("--- Unique Locations Found ---")
    for loc, count in counts.most_common():
        print(f"'{loc}': {count}")
        
except Exception as e:
    print(e)
