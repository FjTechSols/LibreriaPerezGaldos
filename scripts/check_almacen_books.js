
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.development') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; 

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBooks() {
  console.log("Checking books in 'Almacen'...");
  
  // Fetch books in Almacen - searching both case variations just in case
  const { data: books, error } = await supabase
    .from('libros')
    .select('id, titulo, legacy_id, ubicacion')
    .ilike('ubicacion', '%Almacen%');

  if (error) {
    console.error("Error fetching books:", error);
    return;
  }

  if (!books || books.length === 0) {
    console.log("No books found in 'Almacen'.");
    return;
  }

  console.log(`Found ${books.length} books in 'Almacen'. Checking legacy_id...`);

  const nonNumeric = books.filter(b => {
    if (!b.legacy_id) return true; // Empty is considered invalid? or valid? Assuming checking for strictly existing numeric keys.
    return !/^\d+$/.test(b.legacy_id);
  });

  if (nonNumeric.length === 0) {
    console.log("✅ All books in Almacen have numeric legacy_id.");
  } else {
    console.log(`❌ Found ${nonNumeric.length} books with INVALID legacy_id in Almacen:`);
    nonNumeric.forEach(b => {
      console.log(`- ID: ${b.id}, Title: "${b.titulo}", LegacyID: "${b.legacy_id}", Loc: "${b.ubicacion}"`);
    });
  }
}

checkBooks();
