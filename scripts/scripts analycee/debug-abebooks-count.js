import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY 
);

async function checkBookCounts() {
  console.log("=== CHECKING RAW DATABASE COUNTS ===\n");
  
  // 1. Total books (no filter)
  const { count: totalCount, error: totalError } = await supabase
    .from('libros')
    .select('*', { count: 'exact', head: true });

  if (totalError) {
    console.error("Error getting total count:", totalError);
    return;
  }
  console.log(`TOTAL BOOKS IN DATABASE (no filters): ${totalCount}`);

  // 2. Books with stock > 0
  const { count: stockCount, error: stockError } = await supabase
    .from('libros')
    .select('*', { count: 'exact', head: true })
    .gt('stock', 0);
  
  if (stockError) {
    console.error("Error getting stock count:", stockError);
    return;
  }
  console.log(`Books with stock > 0: ${stockCount}`);

  // 3. Books with price >= 12
  const { count: priceCount, error: priceError } = await supabase
    .from('libros')
    .select('*', { count: 'exact', head: true })
    .gte('precio', 12);
  
  if (priceError) {
    console.error("Error getting price count:", priceError);
    return;
  }
  console.log(`Books with price >= 12€: ${priceCount}`);

  // 4. Books matching BOTH criteria (AbeBooks eligible)
  const { count: eligibleCount, error: eligibleError } = await supabase
    .from('libros')
    .select('*', { count: 'exact', head: true })
    .gt('stock', 0)
    .gte('precio', 12);
  
  if (eligibleError) {
    console.error("Error getting eligible count:", eligibleError);
    return;
  }
  console.log(`Books eligible for AbeBooks (stock > 0 AND price >= 12€): ${eligibleCount}`);

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total books: ${totalCount}`);
  console.log(`AbeBooks eligible: ${eligibleCount}`);
  console.log(`Currently exported to CSV: 1000 (HARD LIMIT)`);
  console.log(`Missing from AbeBooks: ${eligibleCount - 1000}`);
}

checkBookCounts();
