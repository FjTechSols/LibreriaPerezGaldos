
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

    // Get minimum price settings
    let minPrice = 12;
    try {
      const { data } = await supabaseClient
        .from('settings')
        .select('value')
        .eq('key', 'integrations')
        .single();
      if (data?.value?.abeBooks?.ftps?.minPrice) {
        minPrice = Number(data.value.abeBooks.ftps.minPrice);
      }
    } catch (e) {
      console.warn('Settings fetch error:', e);
    }
    console.log(`Min Price: ${minPrice}`);

    // Create a ReadableStream to stream the CSV data
    const stream = new ReadableStream({
      async start(controller) {
        const BATCH_SIZE = 1000;
        let from = 0;
        let hasMore = true;
        const separator = '\t';

        // Helper for quoting
        const q = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;
        const u = (val: any) => String(val || '');

        try {
          while (hasMore) {
            const { data: books, error } = await supabaseClient
              .from('libros')
              .select('id, legacy_id, titulo, autor, isbn, precio, stock, editoriales(nombre), descripcion, anio, ubicacion, imagen_url, estado, paginas')
              .order('id', { ascending: true })
              .range(from, from + BATCH_SIZE - 1);

            if (error) {
              console.error('Fetch error:', error);
              controller.error(error);
              return;
            }

            if (!books || books.length === 0) {
              hasMore = false;
              break;
            }

            let chunk = "";
            
            // Fila de cabecera obligatoria en el formato oficial de 2024-10 para anular "Custom Profiles" locales 
            if (from === 0) {
                const headers = [
                  "listingid", "title", "author", "illustrator", "price", "quantity", 
                  "producttype", "description", "bindingtext", "bookcondition", 
                  "publishername", "placepublished", "yearpublished", "isbn", 
                  "sellercatalog1", "sellercatalog2", "sellercatalog3", "abecategory", 
                  "keywords", "jacketcondition", "editiontext", "printingtext", 
                  "signedtext", "volume", "size", "imgurl", "weight", "weightunit", 
                  "shippingtemplateid", "language"
                ];
                chunk += headers.join(separator) + '\r\n';
            }

            for (const book of books) {
                const sku = book.legacy_id || book.id;
                const description = (book.descripcion || '').replace(/\s+/g, ' ').trim(); 
                const editorialName = book.editoriales?.nombre || '';
                let finalImageUrl = "";
                if (book.imagen_url && 
                    book.imagen_url.trim() !== "" && 
                    !book.imagen_url.includes("default-book-cover") &&
                    (book.imagen_url.startsWith("http") || book.imagen_url.startsWith("https"))) {
                     finalImageUrl = book.imagen_url;
                }

                // Lógica principal de purga de AbeBooks (Obligatorio un 0 explícito para anular)
                // Si el libro no cumple el precio o no hay stock, pasamos 0.
                const exportQuantity = (book.stock > 0 && Number(book.precio) >= minPrice) ? book.stock : 0;

                // Formato Oficial 2024-10 de 30 columnas
                const row = new Array(30).fill("");
                row[0] = q(sku);                                     // listingid
                row[1] = q(book.titulo || 'Untitled');               // title
                row[2] = q(book.autor || 'Unknown');                 // author
                row[4] = u(Number(book.precio).toFixed(2));          // price (NOT QUOTED, Decimals with dot)
                row[5] = u(exportQuantity);                          // quantity (NOT QUOTED)
                row[7] = q(description);                             // description
                row[8] = q(book.encuadernacion || "Tapa Blanda");    // bindingtext
                row[9] = q(book.estado || "Bueno");                  // bookcondition
                row[10] = q(editorialName);                          // publishername
                row[11] = q("España");                               // placepublished
                row[12] = q(book.anio || '');                        // yearpublished
                row[13] = q(book.isbn || "");                        // isbn
                row[26] = q(finalImageUrl);                          // imgurl (Columna 27)

                chunk += row.join(separator) + '\r\n';
            }

            // Enqueue this batch of rows
            controller.enqueue(new TextEncoder().encode(chunk));

            if (books.length < BATCH_SIZE) {
                hasMore = false;
            } else {
                from += BATCH_SIZE;
            }
          }
          controller.close();
        } catch (err) {
            console.error('Stream error:', err);
            controller.error(err);
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'attachment; filename="abebooks_inventory.txt"'
      },
      status: 200,
    })

  } catch (error: any) {
    console.error("CRITICAL ERROR:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
})
