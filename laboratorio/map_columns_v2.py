
path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_todos_clean.txt"

def print_slices(line, note=""):
    id_ = line[0:8].strip()
    title = line[16:160].strip() # Adjusted based on visual spacing (8 chars ID + 8 spaces?)
    # Let's try the indices derived from 'find' + padding logic
    # ID: 0-8
    # Title: 16-? (Maybe 9 was a single space, but visual looked larger. Let's try flexible processing)
    
    # Actually, if it's strictly fixed width, let's use the find offsets as definitive starts
    # Title starts at 16? 9?
    pass

with open(path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if i == 412823: # The specific line
            print(f"--- LINE {i+1} RAW ---")
            print(id := line[0:8])
            print(f"Char at 8: '{line[8]}'")
            print(f"Char at 9: '{line[9]}'") 
            print(f"Char at 15: '{line[15]}'")
            print(f"Char at 16: '{line[16]}'")
            
            print(f"Title (9-172): '{line[9:172]}'")
            print(f"Author (172-420): '{line[172:420]}'")
            print(f"Publisher (420-625): '{line[420:625]}'")
            print(f"ISBN (625-645): '{line[625:645]}'")
            break
