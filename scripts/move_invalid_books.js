
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

async function moveInvalidBooks() {
  console.log("Searching for books in 'Almacen' with non-numeric legacy_id to move to 'General'...");
  
  // 1. Fetch candidates
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

  // 2. Filter invalid ones
  const toMove = books.filter(b => {
    if (!b.legacy_id) return true; // Treat empty as invalid/moveable? Let's say yes for safety or strictness.
    return !/^\d+$/.test(b.legacy_id);
  });

  if (toMove.length === 0) {
    console.log("✅ No invalid books found to move.");
    return;
  }

  console.log(`Found ${toMove.length} books to move/fix.`);
  
  // Logic Rules from User:
  // 1. Digits + 'H' -> Hortaleza (e.g. 000123H)
  // 2. Digits + 'R' -> Reina (e.g. 000123R)
  // 3. Digits + 'G' -> Galeon (e.g. 000123G)
  // 4. Others (e.g. starting with V, empty, etc.) -> General
  
  const toHortaleza = [];
  const toReina = [];
  const toGaleon = [];
  const toGeneral = [];

  const regexHortaleza = /^\d+H$/i;
  const regexReina = /^\d+R$/i;
  const regexGaleon = /^\d+G$/i;

  toMove.forEach(b => {
      const lid = b.legacy_id ? b.legacy_id.trim() : '';
      if (regexHortaleza.test(lid)) {
          toHortaleza.push(b);
      } else if (regexReina.test(lid)) {
          toReina.push(b);
      } else if (regexGaleon.test(lid)) {
          toGaleon.push(b);
      } else {
          toGeneral.push(b);
      }
  });

  // 1. Update Hortaleza
  if (toHortaleza.length > 0) {
      const ids = toHortaleza.map(b => b.id);
      const { error } = await supabase
        .from('libros')
        .update({ ubicacion: 'Hortaleza' })
        .in('id', ids);
      
      if (error) console.error("❌ Error updating Hortaleza books:", error);
      else console.log(`✅ Moved ${ids.length} books to 'Hortaleza' (Numeric + H).`);
  }

  // 2. Update Reina
  if (toReina.length > 0) {
      const ids = toReina.map(b => b.id);
      const { error } = await supabase
        .from('libros')
        .update({ ubicacion: 'Reina' })
        .in('id', ids);
      
      if (error) console.error("❌ Error updating Reina books:", error);
      else console.log(`✅ Moved ${ids.length} books to 'Reina' (Numeric + R).`);
  }

  // 3. Update Galeon
  if (toGaleon.length > 0) {
      const ids = toGaleon.map(b => b.id);
      const { error } = await supabase
        .from('libros')
        .update({ ubicacion: 'Galeon' }) // Ensure 'Galeon' is the correct location string
        .in('id', ids);
      
      if (error) console.error("❌ Error updating Galeon books:", error);
      else console.log(`✅ Moved ${ids.length} books to 'Galeon' (Numeric + G).`);
  }

  // 4. Update General
  if (toGeneral.length > 0) {
      const ids = toGeneral.map(b => b.id);
      const { error } = await supabase
        .from('libros')
        .update({ ubicacion: 'General' })
        .in('id', ids);
      
      if (error) console.error("❌ Error updating General books:", error);
      else console.log(`✅ Moved ${ids.length} books to 'General' (Fallback).`);
  }
}

moveInvalidBooks();
