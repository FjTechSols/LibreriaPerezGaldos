import psycopg2
import sys

# Script to normalize the 'ubicaciones' table to match 'libros' table normalization

HOST = "aws-1-eu-west-1.pooler.supabase.com"
USER = "postgres.weaihscsaqxadxjgsfbt"

def fix_ubicaciones_table():
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
        
        print("Checking current 'ubicaciones' table content...")
        cur.execute("SELECT id, nombre FROM public.ubicaciones ORDER BY id")
        rows = cur.fetchall()
        for row in rows:
            print(f"ID: {row[0]} | Nombre: '{row[1]}'")

        print("\nUpdating 'Galeon' -> 'Galeón'...")
        cur.execute("UPDATE public.ubicaciones SET nombre = 'Galeón' WHERE LOWER(nombre) = 'galeon'")
        print(f"Rows affected: {cur.rowcount}")

        print("Updating 'Almacen' -> 'Almacén'...")
        cur.execute("UPDATE public.ubicaciones SET nombre = 'Almacén' WHERE LOWER(nombre) = 'almacen'")
        print(f"Rows affected: {cur.rowcount}")

        conn.commit()
        print("\nNormalization complete for 'ubicaciones' table.")
        
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fix_ubicaciones_table()
