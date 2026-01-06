
import json

path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_todos_clean.txt"
lines_to_check = [412824, 589]

with open(path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if (i+1) in lines_to_check:
            print(f"--- LINE {i+1} SPLIT BY TAB ---")
            parts = line.strip().split('\t')
            print(f"Count: {len(parts)}")
            for idx, p in enumerate(parts):
                print(f"[{idx}] '{p}'")
