
import re

path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_todos_clean.txt"
lines_to_check = [412824, 589]

with open(path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if (i+1) in lines_to_check:
            print(f"--- LINE {i+1} DELIMITER SCAN ---")
            # Replace non-space content with 'X' to visualize gaps
            masked = re.sub(r'\S', 'X', line)
            print(masked)
            
            # Find all space sequences > 1
            gaps = re.findall(r'\s{2,}', line)
            print("Gaps found:", gaps)
            print(f"Gap counts: {len(gaps)}")
            
            # Try splitting by 3 spaces
            parts3 = re.split(r'\s{3,}', line)
            print(f"Split by 3+ spaces: {len(parts3)} parts")
            for p in parts3[:5]: print(f" > {p.strip()}")
            
            # Try splitting by 2 spaces
            parts2 = re.split(r'\s{2,}', line)
            print(f"Split by 2+ spaces: {len(parts2)} parts")
