/*
  DEBUG SCRIPT for Category Data
  This file is temporary and helps debug why only 'History' category is showing.
*/
import { supabase } from '../lib/supabase';

async function debugCategories() {
  console.log('--- STARTING DEBUG ---');
  
  // 1. Check total books
  const { count: totalBooks } = await supabase.from('libros').select('*', { count: 'exact', head: true });
  console.log('Total Books:', totalBooks);

  // 2. Check books with non-null categoria_id
  const { count: booksWithCatId } = await supabase
    .from('libros')
    .select('*', { count: 'exact', head: true })
    .not('categoria_id', 'is', null);
  console.log('Books with categoria_id:', booksWithCatId);

  // 3. Sample books to see structure
  const { data: sampleBooks } = await supabase
    .from('libros')
    .select('id, titulo, categoria_id, categorias(nombre)')
    .limit(10);
  
  console.log('Sample books:', sampleBooks);

  // 4. Check all distinct categories linked
  const { data: categories } = await supabase
    .from('libros')
    .select('categorias(nombre)')
    .not('categoria_id', 'is', null);
    
  // @ts-ignore
  const distinctNames = [...new Set(categories?.map(c => c.categorias?.nombre))];
  console.log('Distinct category names found:', distinctNames);
}

export default debugCategories;
