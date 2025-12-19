
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

async function validateGlobalRules() {
  console.log("Fetching ALL books to validate rules...");
  
  // Fetch all books (id, title, legacy_id, ubicacion)
  // We paginate or fetch all. Assuming database isn't massive (<100k) we can fetch reasonably.
  // Supabase limit is usually 1000. We need to loop.
  
  let allBooks = [];
  let lastId = 0;
  const pageSize = 1000;
  let hasMore = true;
  let totalProcessed = 0;

  while (hasMore) {
      const { data, error } = await supabase
        .from('libros')
        .select('id, titulo, legacy_id, ubicacion')
        .gt('id', lastId)
        .order('id', { ascending: true })
        .limit(pageSize);
      
      if (error) {
          console.error("Error fetching books:", error);
          return;
      }
      
      if (data.length < pageSize) hasMore = false;
      if (data.length > 0) {
          lastId = data[data.length - 1].id;
          allBooks = [...allBooks, ...data];
          totalProcessed += data.length;
          process.stdout.write(`\rFetched ${totalProcessed} books...`);
      } else {
          hasMore = false;
      }
  }
  console.log("\nAnalyzing data...");

  const errors = [];
  const mismatches = {
      shouldBeHortaleza: [], // Has H, but not in Hortaleza
      shouldBeReina: [],     // Has R, but not in Reina
      shouldBeGaleon: [],    // Has G, but not in Galeon
      invalidAlmacen: []     // In Almacen, but not Numeric
  };

  const regexNumeric = /^\d+$/;
  const regexHortaleza = /^\d+H$/i;
  const regexReina = /^\d+R$/i;
  const regexGaleon = /^\d+G$/i;

  allBooks.forEach(b => {
      const lid = b.legacy_id ? b.legacy_id.trim() : '';
      const loc = b.ubicacion ? b.ubicacion.trim() : '';
      const locLower = loc.toLowerCase();

      // Rule 1: ID ends in H -> Should be Hortaleza
      if (regexHortaleza.test(lid)) {
          if (!locLower.includes('hortaleza')) {
              mismatches.shouldBeHortaleza.push(b);
          }
      }
      // Rule 2: ID ends in R -> Should be Reina
      else if (regexReina.test(lid)) {
           if (!locLower.includes('reina')) {
              mismatches.shouldBeReina.push(b);
          }
      }
      // Rule 3: ID ends in G -> Should be Galeon
      else if (regexGaleon.test(lid)) {
           if (!locLower.includes('galeon') && !locLower.includes('galeón')) {
              mismatches.shouldBeGaleon.push(b);
          }
      }
      // Rule 4: Located in Almacen -> Should be Numeric
      else if (locLower.includes('almacen') || locLower.includes('almacén')) {
          if (!regexNumeric.test(lid)) {
              mismatches.invalidAlmacen.push(b);
          }
      }
  });

  // Report
  console.log("\n--- Validation Report ---\n");

  if (mismatches.invalidAlmacen.length > 0) {
      console.log(`❌ ALMACEN WARNING: Found ${mismatches.invalidAlmacen.length} books in 'Almacen' that are NOT strictly numeric (likely dirty data).`);
      // Print first 5
      mismatches.invalidAlmacen.slice(0, 5).forEach(b => console.log(`   [${b.id}] Loc: ${b.ubicacion} | Ref: ${b.legacy_id} | ${b.titulo?.substring(0,30)}...`));
  } else {
      console.log("✅ ALMACEN OK: All books in Almacen are numeric.");
  }

  if (mismatches.shouldBeHortaleza.length > 0) {
      console.log(`\n⚠️  HORTALEZA MISMATCH: Found ${mismatches.shouldBeHortaleza.length} books with '...H' ID that are NOT in Hortaleza.`);
      mismatches.shouldBeHortaleza.slice(0, 5).forEach(b => console.log(`   [${b.id}] Loc: ${b.ubicacion} | Ref: ${b.legacy_id}`));
  }

  if (mismatches.shouldBeReina.length > 0) {
      console.log(`\n⚠️  REINA MISMATCH: Found ${mismatches.shouldBeReina.length} books with '...R' ID that are NOT in Reina.`);
      mismatches.shouldBeReina.slice(0, 5).forEach(b => console.log(`   [${b.id}] Loc: ${b.ubicacion} | Ref: ${b.legacy_id}`));
  }

  if (mismatches.shouldBeGaleon.length > 0) {
      console.log(`\n⚠️  GALEON MISMATCH: Found ${mismatches.shouldBeGaleon.length} books with '...G' ID that are NOT in Galeon.`);
      mismatches.shouldBeGaleon.slice(0, 5).forEach(b => console.log(`   [${b.id}] Loc: ${b.ubicacion} | Ref: ${b.legacy_id}`));
  }

  if (
      mismatches.invalidAlmacen.length === 0 &&
      mismatches.shouldBeHortaleza.length === 0 &&
      mismatches.shouldBeReina.length === 0 &&
      mismatches.shouldBeGaleon.length === 0
  ) {
      console.log("\n✨ GREAT! No inconsistencies found across the database.");
  }
}

validateGlobalRules();
