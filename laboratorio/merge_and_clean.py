
import os

# Define paths
base_dir = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos"
file1 = os.path.join(base_dir, "scripts", "files", "libros.txt")
file2 = os.path.join(base_dir, "scripts", "files", "libros1.txt")
output_file = os.path.join(base_dir, "scripts", "files", "libros_todos_clean.txt")

# Encoding strategy: Read as latin1 (covers cp1252/iso-8859-1), Write as utf-8
source_encoding = 'latin1' 

def process_file(src_path, dest_handle):
    if not os.path.exists(src_path):
        print(f"Skipping missing file: {src_path}")
        return

    print(f"Processing {src_path}...")
    with open(src_path, 'r', encoding=source_encoding, errors='replace') as src:
        for line in src:
            dest_handle.write(line)

print("Starting merge and encoding fix...")
try:
    with open(output_file, 'w', encoding='utf-8') as dest:
        process_file(file1, dest)
        process_file(file2, dest)
    print(f"Success! Merged file created at: {output_file}")
except Exception as e:
    print(f"Error during merge: {e}")
