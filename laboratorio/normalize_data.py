
import json
import re

input_path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_todos_clean.txt"
output_path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_structured.json"

def clean_text(text):
    if not text: return None
    return text.strip()

def parse_publisher_block(text):
    # This block (420-625) contains Editorial, City, Country, Year, Pages mixed up
    # Strategy: Extract Year first, then try to separate Editorial
    text = clean_text(text)
    if not text: return {"editorial": None, "anio": None, "ciudad": None, "pais": None, "paginas": None}
    
    # Extract Year (4 digits)
    year_match = re.search(r'\b(18|19|20)\d{2}\b', text)
    year = int(year_match.group(0)) if year_match else None
    
    # Editorial is usually at the start. 
    # Heuristic: Take everything before the first period or comma or year?
    # For now, let's take the whole string as "raw_editorial_data" and a guess at the name
    # "Instituto de Estudios de Administración Local (España).."
    
    editorial_guess = text.split('.')[0].strip()
    
    return {
        "raw": text,
        "editorial_guess": editorial_guess,
        "anio": year
    }

books = []
errors = []

print("Starting parsing...")
try:
    with open(input_path, 'r', encoding='utf-8') as f:
        for i, line in enumerate(f):
            try:
                # Based on previous mapping
                # ID: 0-8
                # Title: 9-172
                # Author: 172-420
                # Publisher Block: 420-625
                # ISBN: 625-645
                # Tail (Price, Stock..): 645+
                
                # Validation: Line should be long enough
                if len(line) < 645:
                    continue # Skip short lines/footer

                book = {
                    "original_line": i + 1,
                    "legacy_id": clean_text(line[0:8]),
                    "titulo": clean_text(line[9:172]),
                    "autor": clean_text(line[172:420]),
                    "publisher_data": parse_publisher_block(line[420:625]),
                    "isbn": clean_text(line[625:645]),
                }
                
                # Parse Tail for Price/Stock
                # Tail looks like: "0       0       0       0       0       1       ... prices?"
                # Need to map this closer if precise price needed. 
                # For now, let's just save the tail to debug
                # book["tail_debug"] = line[645:].strip()
                
                books.append(book)
                
            except Exception as e:
                errors.append(f"Line {i+1}: {str(e)}")

    print(f"Parsed {len(books)} books.")
    
    with open(output_path, 'w', encoding='utf-8') as out:
        json.dump(books, out, indent=2, ensure_ascii=False)
        
    print(f"JSON saved to {output_path}")

except Exception as e:
    print(f"Fatal error: {e}")
