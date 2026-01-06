
import json
import re

input_path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_todos_clean.txt"
output_path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_structured.json"

def clean(text):
    if not text: return None
    return text.strip()

def parse_publisher_zone(text):
    # Zone 420-625 contains: Editorial, City, Country, Year, Pages, Price, Stock, Location, Dates
    # Strategy: Regex for structured data, remainder is Editorial/City/Country/Page
    
    data = {
        "editorial": None,
        "ciudad": None,
        "pais": None,
        "anio": None,
        "paginas": None,
        "precio": None,
        "stock": None,
        "ubicacion": None,
        "fecha_ingreso": None,
        "fecha_modificacion": None
    }
    
    if not text: return data

    # 1. Dates (DD-MM-YYYY)
    dates = re.findall(r'(\d{2}-\d{2}-\d{4})', text)
    if len(dates) >= 1: data["fecha_ingreso"] = dates[0]
    if len(dates) >= 2: data["fecha_modificacion"] = dates[1]
    
    # 2. Location (almacen / tienda / etc)
    # Heuristic: Find 'almacen'
    loc_match = re.search(r'\b(almacen|tienda)\b', text, re.IGNORECASE)
    if loc_match:
        data["ubicacion"] = loc_match.group(0)
        
        # 3. Stock is usually the number BEFORE location?
        # Context analysis in step 1190: "... 1 almacen 2 ..."
        # So look for digit before location
        pre_loc = text[:loc_match.start()].strip()
        stock_match = re.search(r'(\d+)$', pre_loc)
        if stock_match:
            data["stock"] = int(stock_match.group(1))
    
    # 4. Price (Decimal)
    # Regex for price: Look for number with decimal point
    # Exclude typical year (19xx/20xx) if possible, but price can be anything
    price_match = re.search(r'\b(\d+\.\d{2})\b', text)
    if price_match:
         data["precio"] = float(price_match.group(1))

    # 5. Year
    year_match = re.search(r'\b(18|19|20)\d{2}\b', text)
    if year_match:
        data["anio"] = int(year_match.group(0))

    # 6. Editorial (Everything else?)
    # Rough split by common delimiters
    parts = re.split(r'\.\s+', text)
    if parts:
        data["editorial"] = clean(parts[0]) # First chunk usually editorial
        
    return data

books = []

print("Starting full parsing...")
with open(input_path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if len(line) < 640: continue

        # Zone slicing
        legacy_id = clean(line[0:8])
        titulo = clean(line[9:127])
        descripcion = clean(line[127:172])
        autor = clean(line[172:420])
        pub_zone = line[420:625]
        isbn = clean(line[625:645])
        
        # Parse complex zone
        pub_data = parse_publisher_zone(pub_zone)
        
        book = {
            "legacy_id": legacy_id,
            "isbn": isbn,
            "titulo": titulo,
            "autor": autor,
            "descripcion": descripcion, # Likely truncated in source
            "editorial": pub_data["editorial"],
            "anio": pub_data["anio"],
            "paginas": pub_data["paginas"], # Not extracted yet, minor priority
            "stock": pub_data["stock"],
            "precio": pub_data["precio"],
            "ubicacion": pub_data["ubicacion"],
            "fecha_ingreso": pub_data["fecha_ingreso"],
            "fecha_modificacion": pub_data["fecha_modificacion"]
        }
        books.append(book)

print(f"Parsed {len(books)} records.")
with open(output_path, 'w', encoding='utf-8') as out:
    json.dump(books, out, indent=2, ensure_ascii=False)
    
print(f"Saved to {output_path}")
