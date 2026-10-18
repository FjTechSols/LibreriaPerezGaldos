import { supabase } from '../lib/supabase';

export interface InvoiceCodeBook { id: string; code: string; title: string; price: number }

/** Exact internal codes, queried in batches without truncating large lists. */
export async function buscarLibrosPorCodigos(codes: string[]): Promise<InvoiceCodeBook[]> {
  const uniqueCodes = [...new Set(codes)];
  const books: InvoiceCodeBook[] = [];
  for (let start = 0; start < uniqueCodes.length; start += 100) {
    const batch = uniqueCodes.slice(start, start + 100);
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from('libros')
        .select('id, legacy_id, titulo, precio').eq('activo', true)
        .in('legacy_id', batch).order('id').range(offset, offset + 499);
      if (error) throw error;
      books.push(...(data || []).map(book => ({ id: String(book.id), code: book.legacy_id, title: book.titulo, price: Number(book.precio) })));
      if (!data || data.length < 500) break;
    }
  }
  return books;
}
