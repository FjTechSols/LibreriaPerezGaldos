import psycopg2
import sys

HOST = "aws-1-eu-west-1.pooler.supabase.com"
USER = "postgres.weaihscsaqxadxjgsfbt"

print("=== FIX UBICACION INCONSISTENCIES ===\n")

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
    
    print("\n[BEFORE] Current distribution:")
    cur.execute("""
        SELECT COALESCE(ubicacion, 'NULL') as ubicacion, COUNT(*) as total
        FROM public.libros
        GROUP BY ubicacion
        ORDER BY ubicacion
    """)
    for row in cur.fetchall():
        print(f"   {row[0]:<30} {row[1]:>10,}")
    
    print("\n[EXECUTING FIXES...]")
    
    # Fix 1: Case variations
    cur.execute("UPDATE public.libros SET ubicacion = 'Almacén' WHERE ubicacion IN ('almacen', 'Almacen')")
    print(f"   ✅ Fixed case variations of Almacén: {cur.rowcount} rows")
    
    # Fix 2: Galeon -> Galeón
    cur.execute("UPDATE public.libros SET ubicacion = 'Galeón' WHERE ubicacion = 'Galeon'")
    print(f"   ✅ Fixed Galeon -> Galeón: {cur.rowcount} rows")
    
    # Fix 3: Invalid numeric values
    cur.execute("UPDATE public.libros SET ubicacion = 'General' WHERE ubicacion IN ('-1', '0')")
    print(f"   ✅ Fixed invalid values (-1, 0): {cur.rowcount} rows")
    
    # Fix 4: NULL values
    cur.execute("UPDATE public.libros SET ubicacion = 'General' WHERE ubicacion IS NULL OR ubicacion = ''")
    print(f"   ✅ Fixed NULL/empty values: {cur.rowcount} rows")
    
    # Fix 5: XXX placeholder
    cur.execute("UPDATE public.libros SET ubicacion = 'General' WHERE ubicacion LIKE 'XXX%'")
    print(f"   ✅ Fixed XXX placeholder: {cur.rowcount} rows")
    
    conn.commit()
    
    print("\n[AFTER] New distribution:")
    cur.execute("""
        SELECT ubicacion, COUNT(*) as total
        FROM public.libros
        GROUP BY ubicacion
        ORDER BY ubicacion
    """)
    for row in cur.fetchall():
        print(f"   {row[0]:<30} {row[1]:>10,}")
    
    conn.close()
    print("\n✅ Ubicaciones normalized successfully!")

except Exception as e:
    print(f"\n❌ ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
