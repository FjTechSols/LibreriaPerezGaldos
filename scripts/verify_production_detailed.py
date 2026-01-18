import psycopg2
import sys

HOST = "aws-1-eu-west-1.pooler.supabase.com"
USER = "postgres.weaihscsaqxadxjgsfbt"

print("=== PRODUCTION DATA VERIFICATION ===\n")

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
    
    # 1. TOTAL COUNT
    print("\n[1] TOTAL COUNT")
    cur.execute("SELECT COUNT(*) FROM public.libros")
    total = cur.fetchone()[0]
    print(f"   Total libros: {total:,}")
    print(f"   Expected: ~412,697")
    print(f"   Status: {'✅ OK' if 412000 < total < 413000 else '❌ MISMATCH'}")
    
    # 2. STOCK DISTRIBUTION
    print("\n[2] STOCK DISTRIBUTION")
    cur.execute("""
        SELECT 
            CASE 
                WHEN stock = 0 THEN 'Sin Stock'
                WHEN stock BETWEEN 1 AND 5 THEN '1-5 unidades'
                WHEN stock BETWEEN 6 AND 20 THEN '6-20 unidades'
                ELSE 'Más de 20'
            END as rango_stock,
            COUNT(*) as cantidad
        FROM public.libros
        GROUP BY rango_stock
        ORDER BY rango_stock
    """)
    for row in cur.fetchall():
        rango = row[0] if row[0] else 'N/A'
        cantidad = row[1] if row[1] else 0
        print(f"   {rango:<20} {cantidad:>10,}")
    
    # 3. UBICACION DISTRIBUTION
    print("\n[3] UBICACION DISTRIBUTION")
    cur.execute("""
        SELECT 
            COALESCE(ubicacion, 'NULL') as ubicacion,
            COUNT(*) as total_libros
        FROM public.libros
        GROUP BY ubicacion
        ORDER BY ubicacion
    """)
    for row in cur.fetchall():
        ubic = row[0] if row[0] else 'NULL'
        count = row[1] if row[1] else 0
        print(f"   {ubic:<30} {count:>10,} libros")
    
    # 4. SAMPLE BOOKS
    print("\n[4] SAMPLE BOOKS (legacy_id patterns)")
    cur.execute("""
        SELECT 
            legacy_id,
            titulo,
            stock,
            ubicacion,
            precio
        FROM public.libros
        WHERE legacy_id IN ('A-00001', 'G-00001', 'H-00001', 'R-00001', '00001')
        ORDER BY legacy_id
    """)
    print(f"   {'Legacy ID':<12} {'Título':<40} {'Stock':<8} {'Ubicación':<15} {'Precio'}")
    print(f"   {'-'*90}")
    rows = cur.fetchall()
    if rows:
        for row in cur.fetchall():
            legacy = row[0] if row[0] else 'N/A'
            titulo = row[1] if row[1] else 'N/A'
            if len(titulo) > 40:
                titulo = titulo[:37] + '...'
            stock = row[2] if row[2] is not None else 0
            ubic = row[3] if row[3] else 'N/A'
            precio = f"€{row[4]:.2f}" if row[4] is not None else 'N/A'
            print(f"   {legacy:<12} {titulo:<40} {stock:<8} {ubic:<15} {precio}")
    else:
        print("   No samples found")
    
    # 5. DATA QUALITY
    print("\n[5] DATA QUALITY CHECK")
    cur.execute("""
        SELECT 
            COUNT(*) FILTER (WHERE titulo IS NULL OR titulo = '') as sin_titulo,
            COUNT(*) FILTER (WHERE autor IS NULL OR autor = '') as sin_autor,
            COUNT(*) FILTER (WHERE precio IS NULL OR precio <= 0) as sin_precio,
            COUNT(*) FILTER (WHERE ubicacion IS NULL OR ubicacion = '') as sin_ubicacion
        FROM public.libros
    """)
    row = cur.fetchone()
    print(f"   Sin título: {row[0]:,}")
    print(f"   Sin autor: {row[1]:,}")
    print(f"   Sin precio válido: {row[2]:,}")
    print(f"   Sin ubicación: {row[3]:,}")
    
    # 6. LEGACY_ID UNIQUENESS
    print("\n[6] LEGACY_ID UNIQUENESS")
    cur.execute("""
        SELECT COUNT(DISTINCT legacy_id) as unique_ids,
               COUNT(*) as total_records
        FROM public.libros
    """)
    row = cur.fetchone()
    print(f"   Unique legacy_ids: {row[0]:,}")
    print(f"   Total records: {row[1]:,}")
    print(f"   Status: {'✅ All unique' if row[0] == row[1] else '❌ Duplicates found'}")
    
    conn.close()
    print("\n✅ Verification complete!")

except Exception as e:
    print(f"\n❌ ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
