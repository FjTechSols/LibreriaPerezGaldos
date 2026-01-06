
import os

def test_encoding(path, encodings=['utf-8', 'latin1', 'cp1252', 'iso-8859-15']):
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return

    with open(path, 'rb') as f:
        # Read a chunk from the middle to ensure we hit some special chars
        f.seek(1000)
        raw = f.read(1000)
    
    print(f"--- Testing {path} ---")
    for enc in encodings:
        try:
            decoded = raw.decode(enc)
            print(f"[{enc}] Snippet: {decoded[:150].replace(chr(10), ' ')}")
        except Exception as e:
            print(f"[{enc}] Error: {e}")

test_encoding('../scripts/files/libros.txt')
