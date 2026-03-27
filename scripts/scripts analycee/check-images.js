import { createClient } from '@supabase/supabase-js';
// import 'dotenv/config'; // Using --env-file

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase vars. Found:", { 
      url: !!supabaseUrl, 
      key: !!supabaseKey,
      keys: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
  });
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkImages() {
  console.log("🔍 Checking 'imagen_url' in 'libros' table...");

  const { data: books, error } = await supabase
    .from('libros')
    .select('id, titulo, imagen_url')
    .not('imagen_url', 'is', null)
    .limit(20);

  if (error) {
    console.error("Error fetching books:", error);
    return;
  }

  if (books.length === 0) {
    console.log("⚠️ No books found with 'imagen_url' populated (all are null).");
  } else {
    console.log("URLs:");
    books.forEach(b => {
      console.log(`- URL: "${b.imagen_url}"`);
    });
  }

  // Count total books with images
  const { count, error: countError } = await supabase
    .from('libros')
    .select('*', { count: 'exact', head: true })
    .not('imagen_url', 'is', null);
  
  if (countError) console.error("Error counting:", countError);
  else console.log(`\n📊 Total books with images: ${count}`);
}

checkImages();
