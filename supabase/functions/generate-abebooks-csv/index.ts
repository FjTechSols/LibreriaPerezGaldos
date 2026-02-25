
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
    const url = new URL(req.url);
    const isPurge = url.searchParams.get('purge') === 'true';

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get minimum price settings
    let minPrice = 12; // Fallback a 12 para purgar libros de bajo coste como desea el negocio
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
    console.log(`Min Price: ${minPrice} | Purge Mode: ${isPurge}`);

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
            for (const book of books) {
                // If Purge mode is intentionally requested, we skip everything to yield an empty file
                if (isPurge) {
                    continue;
                }

                // If the book does not meet our minimum price or has no stock, WE EXCLUDE IT COMPLETELY
                // from the export file (AbeBooks Purge & Replace model)
                if (book.stock <= 0 || Number(book.precio) < minPrice) {
                    continue;
                }

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

                // Format: Custom Generic Tab-Delimited Profile (Mapped by Abebooks Support specifically for this account)
                // Changing this order WILL scramble Abebooks listings!
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
                    u(""),                             // Col 11: Quantity MUST BE EMPTY as per old legacy system
                    q(book.isbn || "")                 // Col 12: ISBN
                ];
                
                // Note: The script 'abebooks-upload.js' expects NO header line currently, 
                // so we just output the data rows.
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
