import psycopg2
import sys

HOST = "aws-1-eu-west-1.pooler.supabase.com"
USER = "postgres.weaihscsaqxadxjgsfbt"

print("=== SEARCH ALMACÉN CODES IN 0229 RANGE ===\n")

try:
    password = input(f"Enter DB Password for {USER}: ")
    
    conn = psycopg2.connect(
        host=HOST,
        user=USER,
        password=password,
        port="5432",
        database="postgres"
    )
    
    cur = conn.cursor()
    
    # Search for codes starting with 0229
    print("\n[1] Searching for codes starting with '0229'...")
    cur.execute("""
        SELECT legacy_id, titulo
        FROM public.libros 
        WHERE ubicacion = 'Almacén'
          AND legacy_id LIKE '0229%'
          AND legacy_id ~ '^[0-9]+$'
        ORDER BY CAST(legacy_id AS INTEGER) DESC 
        LIMIT 10
    """)
    
    results = cur.fetchall()
    if results:
        print(f"   Found {len(results)} codes in 0229xxxx range:")
        for row in results:
            titulo = row[1][:50] if row[1] else 'N/A'
            print(f"   - {row[0]} | {titulo}")
        
        max_code = results[0][0]
        next_num = int(max_code) + 1
        print(f"\n   ✅ MAX in 0229 range: {max_code}")
        print(f"   ✅ NEXT code should be: {next_num:08d}")
    else:
        print("   ⚠️  No codes found in 0229xxxx range")
    
    # Also check what's the overall max
    print("\n[2] Overall MAX numeric code for Almacén:")
    cur.execute("""
        SELECT legacy_id, titulo
        FROM public.libros 
        WHERE ubicacion = 'Almacén'
          AND legacy_id ~ '^[0-9]+$'
        ORDER BY CAST(legacy_id AS INTEGER) DESC 
        LIMIT 5
    """)
    
    results = cur.fetchall()
    if results:
        print(f"   Top 5 codes:")
        for row in results:
            titulo = row[1][:50] if row[1] else 'N/A'
            print(f"   - {row[0]} | {titulo}")
    
    conn.close()
    print("\n✅ Search complete!")

except Exception as e:
    print(f"\n❌ ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
