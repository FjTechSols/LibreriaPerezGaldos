
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; 
// Note: Anon key might not have permission to read everything depending on RLS. 
// Ideally we need SERVICE_ROLE_KEY for admin tasks, but trying with what's likely available or hardcoded if needed.
// Usually in a vite project, VITE_ vars are in .env. 
// If specific admin access is needed, we might need the service key which might not be in .env for frontend.
// However, I can try with the locally available env or ask user.
// Attempting to read .env first.

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBooks() {
  console.log("Checking books in 'Almacen'...");
  
  // Fetch books in Almacen (trying both with and without accent just in case)
  // We want to fetch ALL to filter in JS if "is numeric" logic is complex in postgres filter without generic regex
  // Or we can use regex filter if supabase supports it: .match({ legacy_id: '[^0-9]' })?
  // Let's fetch strict 'Almacen' first.
  
  let { data: books, error } = await supabase
    .from('libros')
    .select('id, title, legacy_id, ubicacion')
    .ilike('ubicacion', '%Almacen%'); // ilike for case insensitive "Almacen", "Almacén"

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
    // Check if legacy_id is NOT numeric
    // allow empty? "solo sean legacy_id numerico" implies they must exist and be numeric.
    if (!b.legacy_id) return true; // Empty is not numeric? Or is valid? Assuming invalid if strict.
    return !/^\d+$/.test(b.legacy_id);
  });

  if (nonNumeric.length === 0) {
    console.log("✅ All books in Almacen have numeric legacy_id.");
  } else {
    console.log(`❌ Found ${nonNumeric.length} books with INVALID legacy_id in Almacen:`);
    nonNumeric.forEach(b => {
      console.log(`- ID: ${b.id}, Title: "${b.title}", LegacyID: "${b.legacy_id}", Loc: "${b.ubicacion}"`);
    });
  }
}

checkBooks();
