
path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_todos_clean.txt"
line_num = 412824

with open(path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if i + 1 == line_num:
            print("--- LINE REGION 420 -> END ---")
            region = line[420:]
            print(region)
            print("--- RULER (Relative to 420) ---")
            ruler = ""
            for x in range(0, len(region), 10):
                ruler += f"{x:<10}"
            print(ruler)
            
            # Print specific slices relative to 420
            # Editorial: starts at 0 (420)
            # Find next non-space chunk
            editorial = region[0:60].strip() # Guessing width 60?
            print(f"Editorial (Guess): '{editorial}'")
            
            # Look for 1976
            year_idx = region.find("1976")
            print(f"Year '1976' found at relative index: {year_idx}")
            
            # Look for Madrid
            city_idx = region.find("Madrid")
            print(f"City 'Madrid' found at relative index: {city_idx}")
            
            # Look for España
            country_idx = region.find("España")
            print(f"Country 'España' found at relative index: {country_idx}")
            
            # Look for 2 v.
            pages_idx = region.find("2 v.")
            print(f"Pages '2 v.' found at relative index: {pages_idx}")
            
            break
