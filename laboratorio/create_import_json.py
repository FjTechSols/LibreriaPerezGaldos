import json
import re
from datetime import datetime

input_path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_structured.json"
output_path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_import_ready.json"

def parse_paginas(paginas_value):
    """Parse paginas field which might be string like '237', '2 v.', etc."""
    if not paginas_value:
        return None
    
    if isinstance(paginas_value, int):
        return paginas_value
    
    if isinstance(paginas_value, str):
        # Try to extract first number from string
        match = re.search(r'\d+', paginas_value)
        if match:
            try:
                return int(match.group())
            except ValueError:
                return None
    
    return None

print("Loading JSON...")
with open(input_path, 'r', encoding='utf-8') as f:
    books = json.load(f)

import_ready = []

print(f"Processing {len(books)} records...")
for book in books:
    # Map fields to database schema
    record = {
        # Direct mappings
        "isbn": book.get("isbn"),
        "titulo": book.get("titulo"),
        "descripcion": book.get("descripcion"),
        "notas": None,
        "autor": book.get("autor"),
        "legacy_id": book.get("legacy_id"),
        "imagen_url": None,
        
        # Numeric fields with type conversion
        "anio": book.get("anio") if isinstance(book.get("anio"), int) else None,
        "paginas": parse_paginas(book.get("paginas")),  # Fixed parsing
        "precio": book.get("precio") if isinstance(book.get("precio"), (int, float)) else None,
        "precio_original": None,
        "stock": book.get("stock") if isinstance(book.get("stock"), int) else None,
        
        # Foreign keys
        "categoria_id": None,
        "editorial_id": None,
        "ubicacion": None,
        
        # Date fields
        "fecha_ingreso": book.get("fecha_ingreso"),
        
        # Boolean fields
        "activo": True,
        "destacado": False,
        "novedad": False,
        "oferta": False,
    }
    
    # Map ubicacion_id to ubicacion name
    ubicacion_map = {
        1: "Almacén",
        3: "Galeon",
        4: "Reina",
        5: "Hortaleza",
        7: "General"
    }
    ubicacion_id = book.get("ubicacion_id")
    if ubicacion_id:
        record["ubicacion"] = ubicacion_map.get(ubicacion_id, "General")
    
    import_ready.append(record)

print(f"\nProcessed {len(import_ready)} records")

# Count how many have paginas
paginas_count = sum(1 for r in import_ready if r.get("paginas") is not None)
print(f"Records with paginas: {paginas_count}")

print("\nSaving import-ready JSON...")
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(import_ready, f, indent=2, ensure_ascii=False)

print(f"✅ Done! Import-ready file created: {output_path}")
