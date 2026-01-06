
import json

input_path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_todos_clean.txt"
output_path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_structured.json"

def clean(text):
    if not text: return None
    t = text.strip()
    return t if t else None

books = []
errors = []

print("Starting TSV parsing...")
with open(input_path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        parts = line.strip().split('\t')
        
        # Valid records usually have ~26 parts (flags at end)
        # Some lines might be malformed, but let's try strict mapping first
        if len(parts) < 20: 
            # Skip noise or empty lines
            continue
            
        try:
            # Mapping based on Step 1237 analysis
            book = {
                "legacy_id": clean(parts[0]),
                "titulo": clean(parts[1]),
                "titulo_secundario": clean(parts[2]), # Guessing based on "Estudio preliminar..." appearing here
                "descripcion": clean(parts[3]),
                "editorial": clean(parts[4]),
                "anio": clean(parts[5]), # Keep as string/int? Clean first
                "autor": clean(parts[6]),
                "ciudad": clean(parts[7]),
                "pais": clean(parts[8]),
                "precio": clean(parts[9]),
                "paginas": clean(parts[10]),
                
                # 11, 12 seem like flags/zeros?
                
                "fecha_ingreso": clean(parts[13]),
                "stock": clean(parts[14]),
                "ubicacion": clean(parts[15]),
                
                # 16, 17 ?
                
                "fecha_modificacion": clean(parts[18]),
                "isbn": clean(parts[19]),
                
                # Flags 20-25
                "flags": [clean(p) for p in parts[20:26]] if len(parts) >= 26 else []
            }
            
            # Type conversion safety
            if book["anio"] and book["anio"].isdigit(): book["anio"] = int(book["anio"])
            if book["stock"] and book["stock"].isdigit(): book["stock"] = int(book["stock"])
            # Price might have comma or dot
            if book["precio"]:
                 try: 
                     book["precio"] = float(book["precio"].replace(',', '.'))
                 except: pass

            books.append(book)
            
        except Exception as e:
            errors.append(f"Line {i+1}: {e}")

print(f"Parsed {len(books)} records.")
if errors:
    print(f"Errors encountered: {len(errors)}")
    print(f"Sample error: {errors[0]}")

with open(output_path, 'w', encoding='utf-8') as out:
    json.dump(books, out, indent=2, ensure_ascii=False)
    
print(f"Saved to {output_path}")
