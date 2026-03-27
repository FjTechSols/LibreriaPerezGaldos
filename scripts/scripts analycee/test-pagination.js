// Test script to verify the pagination logic
// This simulates what the Edge Function will do

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY 
);

async function testPagination() {
  console.log("=== TESTING PAGINATION LOGIC ===\n");
  
  const minPrice = 12;
  const BATCH_SIZE = 1000;
  let allBooks = [];
  let from = 0;
  let hasMore = true;
  let batchCount = 0;

  console.log('Starting paginated fetch...');

  while (hasMore) {
    batchCount++;
    const { data: books, error } = await supabase
      .from('libros')
      .select('id, precio, stock')
      .gt('stock', 0)
      .gte('precio', minPrice)
      .order('id', { ascending: true })
      .range(from, from + BATCH_SIZE - 1);

    if (error) {
      console.error("Error:", error);
      return;
    }

    if (!books || books.length === 0) {
      hasMore = false;
      break;
    }

    allBooks.push(...books);
    console.log(`Batch ${batchCount}: Fetched ${books.length} books (total: ${allBooks.length})`);

    hasMore = books.length === BATCH_SIZE;
    from += BATCH_SIZE;
  }

  console.log(`\n=== RESULTS ===`);
  console.log(`Total batches: ${batchCount}`);
  console.log(`Total books fetched: ${allBooks.length}`);
  
  if (allBooks.length > 0) {
    console.log(`First book ID: ${allBooks[0].id}`);
    console.log(`Last book ID: ${allBooks[allBooks.length - 1].id}`);
  }
  
  console.log(`\n✅ Pagination test complete!`);
}

testPagination();
