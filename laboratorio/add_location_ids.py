import json
import re

input_path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_structured.json"
output_path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_structured.json"

# Mapping based on production table from image
LOCATION_MAP = {
    "almacen": 1,      # Almacén
    "galeon": 3,       # Galeon
    "reina": 4,        # Reina
    "hortaleza": 5,    # Hortaleza
    "abebooks": 6,     # Abebooks
    "general": 7,      # General
    "uniliber": 8,     # UniLiber
    
    # Additional mappings based on analysis
    "historia": 7,     # Map to General (no specific match)
    "religion": 7,     # Map to General
    "machado": 7,      # Map to General
    "tienda": 4,       # Map to Reina (assuming main store)
    "alfaomega": 7,
    "ased": 7,
    "sintesis": 7,
    "gedisa": 7,
    "verbodivino": 7,
    "herder": 7,
    "dilve": 7,
    "losada": 7,
    "cornelsen": 7,
    "jose": 7,
    "docesillas": 7,
}

DEFAULT_LOCATION_ID = 7  # General

def normalize_location(text):
    if not text:
        return DEFAULT_LOCATION_ID
    
    # Clean and lowercase
    clean = text.strip().lower()
    
    # Check if it's a date (DD-MM-YYYY) or number - invalid data
    if re.match(r'\d{2}-\d{2}-\d{4}', clean) or clean.isdigit():
        return DEFAULT_LOCATION_ID
    
    # Direct lookup
    return LOCATION_MAP.get(clean, DEFAULT_LOCATION_ID)

print("Loading JSON...")
with open(input_path, 'r', encoding='utf-8') as f:
    books = json.load(f)

print(f"Processing {len(books)} records...")
for book in books:
    book["ubicacion_id"] = normalize_location(book.get("ubicacion"))

print("Saving updated JSON...")
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(books, f, indent=2, ensure_ascii=False)

print("Done! Added ubicacion_id to all records.")
