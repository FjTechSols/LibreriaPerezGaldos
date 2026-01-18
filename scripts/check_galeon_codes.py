import psycopg2
import sys

HOST = "aws-1-eu-west-1.pooler.supabase.com"
USER = "postgres.weaihscsaqxadxjgsfbt"

def check_galeon():
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
        
        print("\n--- GALEÓN TOP 20 CODES ---")
        cur.execute("""
            SELECT legacy_id, id, titulo 
            FROM public.libros 
            WHERE ubicacion = 'Galeón' 
            ORDER BY legacy_id DESC 
            LIMIT 20
        """)
        for row in cur.fetchall():
            print(row)

        print("\n--- GALEÓN RECENTLY CREATED (ID DESC) ---")
        cur.execute("""
            SELECT legacy_id, id, titulo, created_at
            FROM public.libros 
            WHERE ubicacion = 'Galeón' 
            ORDER BY id DESC 
            LIMIT 10
        """)
        for row in cur.fetchall():
            print(row)

        print("\n--- CHECK FOR DUPLICATES IN GALEÓN ---")
        cur.execute("""
            SELECT legacy_id, COUNT(*) 
            FROM public.libros 
            WHERE ubicacion = 'Galeón' 
            GROUP BY legacy_id 
            HAVING COUNT(*) > 1
        """)
        duplicates = cur.fetchall()
        if duplicates:
            print(f"Found {len(duplicates)} duplicates:")
            for d in duplicates:
                print(d)
        else:
            print("No duplicates found in Galeón.")

        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_galeon()
