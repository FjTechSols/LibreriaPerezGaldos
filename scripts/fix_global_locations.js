
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

async function fixGlobalLocations() {
  console.log("Starting GLOBAL location fix (scanning all books)...");
  
  let lastId = 0;
  const pageSize = 1000;
  let hasMore = true;
  let totalProcessed = 0;
  let stats = {
      movedToHortaleza: 0,
      movedToReina: 0,
      movedToGaleon: 0,
      movedToGeneral: 0,
      skippedAlmacen: 0 // Numeric in Almacen (Correct)
  };

  const regexNumeric = /^\d+$/;
  const regexHortaleza = /^\d+H$/i;
  const regexReina = /^\d+R$/i;
  const regexGaleon = /^\d+G$/i;

  while (hasMore) {
      // 1. Fetch batch
      const { data: books, error } = await supabase
        .from('libros')
        .select('id, titulo, legacy_id, ubicacion')
        .gt('id', lastId)
        .order('id', { ascending: true })
        .limit(pageSize);
      
      if (error) {
          console.error("Error fetching books:", error);
          return;
      }
      
      if (!books || books.length === 0) {
          hasMore = false;
          break;
      }

      // 2. Process batch
      const updates = [];

      for (const b of books) {
          const lid = b.legacy_id ? b.legacy_id.trim() : '';
          const loc = b.ubicacion ? b.ubicacion.trim() : '';
          const locLower = loc.toLowerCase();
          
          let newLoc = null;

          // Determine Correct Location based on ID
          if (regexHortaleza.test(lid)) {
              if (!locLower.includes('hortaleza')) newLoc = 'Hortaleza';
          } else if (regexReina.test(lid)) {
              if (!locLower.includes('reina')) newLoc = 'Reina';
          } else if (regexGaleon.test(lid)) {
              if (!locLower.includes('galeon') && !locLower.includes('galeón')) newLoc = 'Galeon'; // Start Case
          } else if (regexNumeric.test(lid)) {
              // Numeric -> Should be in Almacen? 
              // User said: "solo numeros y R son de Reina... solo numeros sin letras son almacen"
              // BUT we don't necessarily want to move "Escaparate" (numeric) to "Almacen".
              // We only want to clean up "Almacen" or Invalid locations.
              // IF book is currently in a place that looks like Almacen (e.g. Almacen2) and is numeric -> It is valid.
              // IF book is in General?
              // Let's stick to the core request: INVALID books in Almacen were the issue.
              // "Entonces otro punto a tener en cuenta solo numeros almacen" -> Almacen implies ONLY numbers.
              // Does it mean Numbers implies Only Almacen? Maybe not.
              // Logic Check: 
              // If we find `Numeric` in `Hortaleza` -> Is that wrong? 
              // Probably users wants strict mapping:
              // H -> Hortaleza
              // R -> Reina
              // G -> Galeon
              // Numeric -> Almacen (implied default?)
              
              // Let's implement the Moves for the Lettered IDs globally first.
              // For Numeric: If it's in a "General" or weird place, do we move to Almacen?
              // Safer to ONLY move the Lettered ones and fallback non-matching lettered provided they are currently in Almacen-ish.
          } else {
              // Non-numeric, Non-H, Non-R, Non-G (e.g. "V...H" or empty or junk)
              // If it is currently in Almacen-ish -> Move to General.
              if (locLower.includes('almacen')) {
                  newLoc = 'General';
              }
          }

          if (newLoc) {
              updates.push({ id: b.id, ubicacion: newLoc });
              
              if (newLoc === 'Hortaleza') stats.movedToHortaleza++;
              else if (newLoc === 'Reina') stats.movedToReina++;
              else if (newLoc === 'Galeon') stats.movedToGaleon++;
              else if (newLoc === 'General') stats.movedToGeneral++;
          }
      }

      // 3. Execute Updates via Grouping (More efficient & RLS friendly than upsert)
      const batchHortaleza = [];
      const batchReina = [];
      const batchGaleon = [];
      const batchGeneral = [];

      updates.forEach(u => {
          if (u.ubicacion === 'Hortaleza') batchHortaleza.push(u.id);
          else if (u.ubicacion === 'Reina') batchReina.push(u.id);
          else if (u.ubicacion === 'Galeon') batchGaleon.push(u.id);
          else if (u.ubicacion === 'General') batchGeneral.push(u.id);
      });

      // Update Hortaleza Batch
      if (batchHortaleza.length > 0) {
          const { error } = await supabase.from('libros').update({ ubicacion: 'Hortaleza' }).in('id', batchHortaleza);
          if (error) console.error("Error updating Hortaleza batch:", error);
      }
      
      // Update Reina Batch
      if (batchReina.length > 0) {
          const { error } = await supabase.from('libros').update({ ubicacion: 'Reina' }).in('id', batchReina);
          if (error) console.error("Error updating Reina batch:", error);
      }

      // Update Galeon Batch
      if (batchGaleon.length > 0) {
          const { error } = await supabase.from('libros').update({ ubicacion: 'Galeon' }).in('id', batchGaleon);
          if (error) console.error("Error updating Galeon batch:", error);
      }

      // Update General Batch
      if (batchGeneral.length > 0) {
          const { error } = await supabase.from('libros').update({ ubicacion: 'General' }).in('id', batchGeneral);
          if (error) console.error("Error updating General batch:", error);
      }

      lastId = books[books.length - 1].id;
      totalProcessed += books.length;
      process.stdout.write(`\rProcessed ${totalProcessed} books. Found & Fixed ${updates.length} items in this batch...`);
  }

  console.log("\n\n--- Global Fix Complete ---");
  console.log(`Moved to Hortaleza: ${stats.movedToHortaleza}`);
  console.log(`Moved to Reina: ${stats.movedToReina}`);
  console.log(`Moved to Galeon: ${stats.movedToGaleon}`);
  console.log(`Moved to General (from Almacen): ${stats.movedToGeneral}`);
}

fixGlobalLocations();
