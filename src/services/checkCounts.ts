
import { supabase } from '../lib/supabase';

async function checkCounts() {
  console.log('--- CHECKING COUNTS ---');
  
  // 1. Total Libros
  const { count: totalLibros, error: err1 } = await supabase
    .from('libros')
    .select('*', { count: 'exact', head: true });
    
  if (err1) console.error('Error counting libros:', err1);
  console.log('Total Libros in DB:', totalLibros);

  // 2. Count distinct categories (approx)
  const { count: totalCats, error: err2 } = await supabase
    .from('categorias')
    .select('*', { count: 'exact', head: true });
    
  if (err2) console.error('Error counting categorias:', err2);
  console.log('Total Categories defined:', totalCats);

  // 3. Test default limit
  const { data: limitTest } = await supabase
    .from('libros')
    .select('id');
  console.log('Rows returned by simple select:', limitTest?.length);
}

checkCounts();
