import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2.95.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const HEADERS = [
  'VendorBookID',
  'Title',
  'Author',
  'Publisher',
  'PublicationYear',
  'Price',
  'Quantity',
  'Description',
  'ISBN',
  'Pages',
  'Binding',
  'Condition',
  'Language'
]

function csvEscape(value: unknown) {
  if (value === null || value === undefined) return '""'
  return `"${String(value).replace(/"/g, '""')}"`
}

function buildCsvRow(book: any) {
  const description = (book.descripcion || '').replace(/\s+/g, ' ').trim()
  const publisher = book.editoriales?.nombre || ''

  return [
    csvEscape(book.legacy_id),
    csvEscape(book.titulo || 'Untitled'),
    csvEscape(book.autor || ''),
    csvEscape(publisher),
    csvEscape(book.anio || ''),
    csvEscape(Number(book.precio).toFixed(2)),
    csvEscape(book.stock || 0),
    csvEscape(description),
    csvEscape(book.isbn || ''),
    csvEscape(book.paginas || ''),
    csvEscape('Softcover'),
    csvEscape(book.estado || 'leido'),
    csvEscape(book.idioma || 'Español')
  ].join(';')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const isPurge = url.searchParams.get('purge') === 'true'

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let minPrice = 12
    try {
      const { data } = await supabaseClient
        .from('settings')
        .select('value')
        .eq('key', 'integrations')
        .single()
      if (data?.value?.abeBooks?.ftps?.minPrice) {
        minPrice = Number(data.value.abeBooks.ftps.minPrice)
      }
    } catch (e) {
      console.warn('Settings fetch error:', e)
    }
    console.log(`Min Price: ${minPrice} | Purge Mode: ${isPurge}`)

    const stream = new ReadableStream({
      async start(controller) {
        const BATCH_SIZE = 1000
        let from = 0
        let hasMore = true
        let headerSent = false

        try {
          while (hasMore) {
            const { data: books, error } = await supabaseClient
              .from('libros')
              .select('id, legacy_id, titulo, autor, isbn, precio, stock, editoriales(nombre), descripcion, anio, estado, idioma, paginas')
              .order('id', { ascending: true })
              .range(from, from + BATCH_SIZE - 1)

            if (error) {
              console.error('Fetch error:', error)
              controller.error(error)
              return
            }

            if (!books || books.length === 0) {
              hasMore = false
              break
            }

            let chunk = ''
            if (!headerSent) {
              chunk += HEADERS.join(';') + '\n'
              headerSent = true
            }

            if (!isPurge) {
              for (const book of books) {
                const vendorBookId = String(book.legacy_id || '').trim()
                if (!vendorBookId) continue
                if (book.stock <= 0 || Number(book.precio) < minPrice) continue
                chunk += buildCsvRow({ ...book, legacy_id: vendorBookId }) + '\n'
              }
            }

            controller.enqueue(new TextEncoder().encode(chunk))

            if (books.length < BATCH_SIZE) {
              hasMore = false
            } else {
              from += BATCH_SIZE
            }
          }
          controller.close()
        } catch (err) {
          console.error('Stream error:', err)
          controller.error(err)
        }
      }
    })

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="abebooks_inventory.csv"'
      },
      status: 200,
    })
  } catch (error: any) {
    console.error("CRITICAL ERROR:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
