import { createClient } from '@supabase/supabase-js';
// import 'dotenv/config'; 

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listBuckets() {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error("Error listing buckets:", error);
  } else {
    console.log("📂 Buckets:", data.map(b => b.name));
    
    // Check files in 'portadas' or 'covers' if they exist
    for (const b of data) {
        if (b.name === 'portadas' || b.name === 'covers' || b.name === 'images') {
            console.log(`\nFiles in '${b.name}':`);
            const { data: files } = await supabase.storage.from(b.name).list(undefined, { limit: 5 });
            console.log(files ? files.map(f => f.name) : "Empty or Error");
        }
    }
  }
}

listBuckets();
