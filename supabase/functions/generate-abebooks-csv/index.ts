
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2.95.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get minimum price from settings
    let minPrice = 12; // Default value
    try {
      const { data: settingsData } = await supabaseClient
        .from('settings')
        .select('value')
        .eq('key', 'integrations')
        .single();
      
      if (settingsData?.value?.abeBooks?.ftps?.minPrice) {
        minPrice = Number(settingsData.value.abeBooks.ftps.minPrice);
      }
    } catch (settingsError) {
      console.warn('Could not fetch minPrice from settings, using default:', settingsError);
    }

    console.log(`Using minimum price: €${minPrice}`);

    // 1. Fetch ALL books with pagination (Supabase default limit is 1000)
    const BATCH_SIZE = 1000;
    let allBooks = [];
    let from = 0;
    let hasMore = true;

    console.log('Starting paginated fetch of all eligible books...');

    while (hasMore) {
      const { data: books, error } = await supabaseClient
        .from('libros')
        .select('id, legacy_id, titulo, autor, isbn, precio, stock, editoriales(nombre), descripcion, anio, ubicacion, imagen_url, estado, paginas') // Added paginas
        .gt('stock', 0) // Only active stock
        .gte('precio', minPrice) // Dynamic minimum price from settings
        .order('id', { ascending: true })
        .range(from, from + BATCH_SIZE - 1);

      if (error) throw error;

      if (!books || books.length === 0) {
        hasMore = false;
        break;
      }

      allBooks.push(...books);
      console.log(`Fetched batch: ${books.length} books (total so far: ${allBooks.length})`);

      // Check if we got a full batch (indicates more data might exist)
      hasMore = books.length === BATCH_SIZE;
      from += BATCH_SIZE;
    }

    console.log(`Pagination complete. Total books fetched: ${allBooks.length}`);

    if (allBooks.length === 0) {
       return new Response("No books found", { status: 404, headers: corsHeaders })
    }

    // 2. Generate Legacy "Software Normal" Format
    // Based on user sample: "N0000928" "TITLE" "DESC" "NO" "PUB" "YEAR" "AUT" "PLACE" "CNTRY" 15 "QTY" ""
    
    // We try to guess headers or leave them generic as we mimic a legacy export
    const headers = [
        "Codigo", "Titulo", "Descripcion", "Imagen", "Editorial", "Ano", 
        "Autor", "Lugar", "Pais", "Precio", "Cantidad", "ISBN"
    ];
    
    // Helper for this specific quoted format
    const q = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`; // Quoted string
    const u = (val: any) => String(val || ''); // Unquoted string (for price)

    const separator = '\t';
    // Remove Header Row as per user request and reference file
    // const headerRow = headers.map(h => q(h)).join(separator);
    const rows: string[] = [];

    for (const book of allBooks) {
        const sku = book.legacy_id || book.id;
        const description = (book.descripcion || '').replace(/\s+/g, ' ').trim(); 
        const editorialName = book.editoriales?.nombre || '';
        let imageUrl = "NO";
        if (book.imagen_url && 
            book.imagen_url.trim() !== "" && 
            !book.imagen_url.includes("default-book-cover") &&
            (book.imagen_url.startsWith("http") || book.imagen_url.startsWith("https"))) {
             imageUrl = book.imagen_url;
        }
        
        // Construct row obeying the sample structure:
        // Col 1: SKU (Quoted)
        // Col 2: Title (Quoted)
        // Col 3: Description (Quoted)
        // Col 4: Image/Flag (Quoted) -> We put ImageURL or "NO"
        // Col 5: Publisher (Quoted)
        // Col 6: Year (Quoted)
        // Col 7: Author (Quoted)
        // Col 8: Place (Quoted) -> Empty default
        // Col 9: Country (Quoted) -> Empty default
        // Col 10: Price (UNQUOTED) -> distinct feature
        // Col 11: Quantity (Quoted) 
        // Col 12: ISBN (Quoted) -> Was Extra

        const row = [
            q(sku),
            q(book.titulo || 'Untitled'),
            q(description),
            q(imageUrl), 
            q(editorialName),
            q(book.anio || ''),
            q(book.autor || 'Unknown'),
            q(""), // Place
            q("España"), // Country
            u(Number(book.precio).toFixed(2)), // Col 10: Price
            q(book.paginas || ''), // Col 11: Pages (Was Stock)
            q(book.stock), // Col 12: Quantity (Was ISBN/Empty in reference)
            q(book.isbn || "") // Col 13: ISBN (Appended, hoping it works or is ignored if not standard)
        ];
        rows.push(row.join(separator));
    }

    // Strict CRLF for Windows compatibility
    const txtContent = rows.join('\r\n');

    return new Response(txtContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'attachment; filename="abebooks_inventory.txt"'
      },
      status: 200,
    })

  } catch (error: any) {
    console.error("CRITICAL ERROR in generate-abebooks-csv:", error);
    return new Response(
      JSON.stringify({ 
          error: "Internal Server Error", 
          details: error.message, 
          stack: error.stack 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

function sanitizeTxt(value: string | number | null): string {
    return String(value).replace(/[\t\r\n]+/g, ' ').trim();
}

function mapCondition(estado: string): string {
    // Map DB 'estado' to AbeBooks conditions
    // DB values: 'leido', 'nuevo', 'usado' (assumed), 'deteriorado'
    if (!estado) return 'Good'; // Default
    const e = estado.toLowerCase();
    
    if (e.includes('nuevo')) return 'New';
    if (e.includes('como nuevo')) return 'Fine';
    if (e.includes('bueno') || e.includes('leido') || e.includes('usado')) return 'Good';
    if (e.includes('aceptable') || e.includes('regular')) return 'Fair';
    if (e.includes('pobre') || e.includes('malo')) return 'Poor';
    
    return 'Good'; // Fallback
}
