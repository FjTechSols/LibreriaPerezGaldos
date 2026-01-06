"""
Execute production UPSERT via Python in BATCHES
More robust method for large datasets
"""
import psycopg2
import subprocess
import json
import time
import sys

# Configuration
LAB_CONTAINER = "supabase-db"
BATCH_SIZE = 2500  # Smaller batches for stability
RETRY_LIMIT = 3
RETRY_DELAY = 5
START_BATCH = 104 # Resume from this batch

# Supabase Production credentials
HOST = "aws-1-eu-west-1.pooler.supabase.com"
USER = "postgres.weaihscsaqxadxjgsfbt"
DB_PASSWORD = "693310893471_693sTs" 

def get_lab_data():
    print("📦 Exporting data from local lab...")
    cmd = [
        "docker", "exec", "-i", LAB_CONTAINER,
        "psql", "-U", "postgres", "-t", "-A", "-F,",
        "-c", """
        SELECT json_agg(row_to_json(t)) 
        FROM (
            SELECT 
                legacy_id, isbn, titulo, anio, paginas, descripcion, notas,
                categoria_id, editorial_id, precio, ubicacion, 
                TO_CHAR(fecha_ingreso, 'YYYY-MM-DD') as fecha_ingreso,
                activo, imagen_url, stock, autor, destacado, novedad, oferta, precio_original
            FROM public.libros
            ORDER BY id
        ) t;
        """
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', check=True)
        data = json.loads(result.stdout.strip())
        print(f"✅ Loaded {len(data):,} records from lab")
        return data
    except Exception as e:
        print(f"❌ Error exporting data: {e}")
        sys.exit(1)

def connect_production():
    while True:
        try:
            conn = psycopg2.connect(
                host=HOST,
                database="postgres",
                user=USER,
                password=DB_PASSWORD,
                port=5432,
                connect_timeout=30
            )
            return conn
        except Exception as e:
            print(f"❌ Connection error: {e}")
            print("⏳ Pool exhausted. Retrying in 10 seconds...")
            time.sleep(10)

def execute_batch(cursor, batch_data):
    # Construct huge INSERT statement for the batch
    values_list = []
    params = []
    
    for record in batch_data:
        # TRUNCATION HANDLERS
        def safe_str(val, limit):
            if val and isinstance(val, str) and len(val) > limit:
                return val[:limit]
            return val

        values_list.append("(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)")
        params.extend([
            record.get('legacy_id'), 
            safe_str(record.get('isbn'), 20),      # ISBN limit
            safe_str(record.get('titulo'), 200),   # Titulo limit (Updated from 255)
            record.get('anio'),
            record.get('paginas'), 
            record.get('descripcion'),             # Assumed TEXT
            record.get('notas'),                   # Assumed TEXT
            record.get('categoria_id'), 
            record.get('editorial_id'), 
            record.get('precio'),
            safe_str(record.get('ubicacion'), 100), # Ubicacion limit
            record.get('fecha_ingreso'), 
            record.get('activo'),
            safe_str(record.get('imagen_url'), 200), # URL limit (Updated from 255)
            record.get('stock'), 
            safe_str(record.get('autor'), 200),      # Autor limit (Updated from 255)
            record.get('destacado'), 
            record.get('novedad'), 
            record.get('oferta'),
            record.get('precio_original')
        ])
    
    query = f"""
    INSERT INTO public.libros (
        legacy_id, isbn, titulo, anio, paginas, descripcion, notas,
        categoria_id, editorial_id, precio, ubicacion, fecha_ingreso,
        activo, imagen_url, stock, autor, destacado, novedad, oferta, precio_original
    ) VALUES {','.join(values_list)}
    ON CONFLICT (legacy_id) DO UPDATE SET
        isbn = EXCLUDED.isbn, titulo = EXCLUDED.titulo, anio = EXCLUDED.anio,
        paginas = EXCLUDED.paginas, descripcion = EXCLUDED.descripcion, notas = EXCLUDED.notas,
        categoria_id = EXCLUDED.categoria_id, editorial_id = EXCLUDED.editorial_id,
        precio = EXCLUDED.precio, ubicacion = EXCLUDED.ubicacion, fecha_ingreso = EXCLUDED.fecha_ingreso,
        activo = EXCLUDED.activo, imagen_url = EXCLUDED.imagen_url, stock = EXCLUDED.stock,
        autor = EXCLUDED.autor, destacado = EXCLUDED.destacado, novedad = EXCLUDED.novedad,
        oferta = EXCLUDED.oferta, precio_original = EXCLUDED.precio_original, updated_at = NOW();
    """
    
    cursor.execute(query, params)

def main():
    print("=" * 60)
    print("🚀 PRODUCTION BATCH UPSERT")
    print("=" * 60)
    
    # 1. Get Data
    all_records = get_lab_data()
    total_records = len(all_records)
    total_batches = (total_records + BATCH_SIZE - 1) // BATCH_SIZE
    
    # 2. Connect
    print(f"\n📡 Connecting to {HOST}...")
    conn = connect_production()
    conn.autocommit = False  # We will commit each batch
    print("✅ Connected!")
    
    # 3. Process Batches
    print(f"\n🔄 Starting upload of {total_records:,} records in {total_batches} batches...")
    
    start_time = time.time()
    processed = 0
    errors = 0
    
    for i in range(0, total_records, BATCH_SIZE):
        batch = all_records[i : i + BATCH_SIZE]
        batch_num = (i // BATCH_SIZE) + 1
        
        if batch_num < START_BATCH:
            continue

        success = False
        attempts = 0
        
        while not success and attempts < RETRY_LIMIT:
            try:
                cursor = conn.cursor()
                execute_batch(cursor, batch)
                conn.commit()
                cursor.close()
                success = True
            except psycopg2.Error as e:
                attempts += 1
                conn.rollback()
                print(f"  ⚠️ Error in batch {batch_num} (Attempt {attempts}/{RETRY_LIMIT}): {e.pgcode}")
                # If persistent error, switch to item-by-item processing
                if attempts == RETRY_LIMIT:
                    print(f"  🔄 Switching to SINGLE-ITEM mode for Batch {batch_num}...")
                    params_ok = 0
                    params_fail = 0
                    
                    for record in batch:
                        try:
                            # Execute single item
                            cursor = conn.cursor()
                            execute_batch(cursor, [record])
                            conn.commit()
                            cursor.close()
                            params_ok += 1
                        except psycopg2.Error as item_err:
                            conn.rollback()
                            params_fail += 1
                            print(f"    ❌ Skipping Record {record.get('legacy_id')}: {item_err.pgcode} - {str(item_err).strip()}")
                    
                    print(f"  ✅ Batch {batch_num} recovered: {params_ok} ok, {params_fail} skipped")
                    success = True  # Consider handled
                else:
                    time.sleep(RETRY_DELAY)
                    if conn.closed:
                        print("  🔄 Reconnecting...")
                        conn = connect_production()

        if success:
            processed += len(batch)
            elapsed = time.time() - start_time
            rate = processed / elapsed
            percent = (processed / total_records) * 100
            print(f"\r✅ Batch {batch_num}/{total_batches} done | {percent:.1f}% | {processed:,} recs | {rate:.0f} rec/s", end="")

    total_time = time.time() - start_time
    print(f"\n\n🏁 COMPLETED in {total_time/60:.1f} minutes")
    print(f"Total processed: {processed:,}")
    print(f"Failed batches: {errors}")
    
    conn.close()

if __name__ == "__main__":
    main()
