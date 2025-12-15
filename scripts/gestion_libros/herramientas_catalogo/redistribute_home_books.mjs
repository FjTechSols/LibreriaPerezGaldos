
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load env vars
const envPath = path.resolve(process.cwd(), '.env.development');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY; 

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function redistribute() {
  console.log('Starting redistribution (v2: Newest first)...');

  // 1. Reset all flags
  console.log('Resetting flags...');
  const { error: resetError } = await supabase
    .from('libros')
    .update({ destacado: false, novedad: false, oferta: false })
    .neq('id', 0);

  if (resetError) {
    console.error('Error resetting flags:', resetError);
  }

  // 2. Fetch all active books
  console.log('Fetching active books...');
  const { data: books, error: fetchError } = await supabase
    .from('libros')
    .select('id, titulo, precio, stock')
    .eq('activo', true)
    .gt('stock', 0);

  if (fetchError || !books) {
    console.error('Error fetching books:', fetchError);
    return;
  }

  // 3. Group by Title to ensure Uniqueness (Deduplication)
  console.log(`Total books fetched: ${books.length}`);
  const uniqueBooksMap = new Map();
  books.forEach(book => {
    const titleKey = book.titulo.trim().toLowerCase();
    if (!uniqueBooksMap.has(titleKey)) {
      uniqueBooksMap.set(titleKey, book);
    }
  });

  const uniqueBooks = Array.from(uniqueBooksMap.values());
  console.log(`Unique titles found: ${uniqueBooks.length}`);

  // 4. Shuffle for Featured
  const shuffled = uniqueBooks.sort(() => 0.5 - Math.random());

  // 5. Select Featured (15)
  const featured = shuffled.slice(0, 15);
  const remainingAfterFeatured = shuffled.slice(15);

  // 6. Select New (15) - From the newest IDs (latest uploaded)
  // Sort remaining candidates by ID desc
  const sortedByNewest = [...remainingAfterFeatured].sort((a, b) => b.id - a.id);
  const newReleases = sortedByNewest.slice(0, 15);
  const remainingAfterNew = sortedByNewest.slice(15);

  // 7. Select Sale (15) - Price < 20
  // Mix remaining up again so sale isn't just "the next newest"
  const shuffledForSale = remainingAfterNew.sort(() => 0.5 - Math.random());
  const saleCandidates = shuffledForSale.filter(b => b.precio < 20.00);
  const sale = saleCandidates.slice(0, 15);

  console.log(`Selection: Featured=${featured.length}, New=${newReleases.length}, Sale=${sale.length}`);

  // 8. Update DB in batches
  async function updateBatch(ids, updates) {
    if (ids.length === 0) return;
    const { error } = await supabase
      .from('libros')
      .update(updates)
      .in('id', ids);
    if (error) console.error(`Error updating batch ${JSON.stringify(updates)}:`, error);
  }

  await updateBatch(featured.map(b => b.id), { destacado: true });
  await updateBatch(newReleases.map(b => b.id), { novedad: true });
  await updateBatch(sale.map(b => b.id), { oferta: true });

  console.log('Redistribution complete!');
}

redistribute();
