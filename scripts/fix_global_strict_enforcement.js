
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.development') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function fixGlobalStrict() {
  console.log("Starting GLOBAL STRICT ENFORCEMENT...");
  console.log("Rules:");
  console.log("1. \\d+H -> Force to HORTALEZA");
  console.log("2. \\d+R -> Force to REINA");
  console.log("3. \\d+G -> Force to GALEON");
  console.log("4. NON-MATCHING items in H/R/G/Almacen -> Force to GENERAL");
  console.log("   (Exception: \\d+ is allowed in Almacen)");

  let lastId = 0;
  const pageSize = 1000;
  let hasMore = true;
  let totalProcessed = 0;
  let stats = {
      moveToHortaleza: 0,
      moveToReina: 0,
      moveToGaleon: 0,
      kickToGeneral: 0
  };

  const regexNumeric = /^\d+$/;
  const regexHortaleza = /^\d+H$/i;
  const regexReina = /^\d+R$/i;
  const regexGaleon = /^\d+G$/i;

  while (hasMore) {
      const { data: books, error } = await supabase
        .from('libros')
        .select('id, titulo, legacy_id, ubicacion')
        .gt('id', lastId)
        .order('id', { ascending: true })
        .limit(pageSize);
      
      if (error) { console.error(error); break; }
      if (!books || books.length === 0) { hasMore = false; break; }

      const batchHortaleza = [];
      const batchReina = [];
      const batchGaleon = [];
      const batchGeneral = [];

      for (const b of books) {
          const lid = b.legacy_id ? b.legacy_id.trim() : '';
          const loc = b.ubicacion ? b.ubicacion.trim() : '';
          const locLower = loc.toLowerCase();

          // Determine Correct State
          let target = null;

          if (regexHortaleza.test(lid)) {
              if (!locLower.includes('hortaleza')) target = 'Hortaleza';
          } 
          else if (regexReina.test(lid)) {
              if (!locLower.includes('reina')) target = 'Reina';
          }
          else if (regexGaleon.test(lid)) {
              if (!locLower.includes('galeon') && !locLower.includes('galeón')) target = 'Galeon';
          }
          else {
              // It is NOT a strict H/R/G match.
              // Logic: If it is currently in a Strict Zone, it must be kicked to General.
              // Strict Zones: Hortaleza, Reina, Galeon, Almacen.
              
              const inStrictZone = 
                  locLower.includes('hortaleza') || 
                  locLower.includes('reina') || 
                  locLower.includes('galeon') || 
                  locLower.includes('galeón') ||
                  locLower.includes('almacen') || 
                  locLower.includes('almacén');

              if (inStrictZone) {
                  // Check Exception: Numeric in Almacen is ALLOWED.
                  const isNumericInAlmacen = regexNumeric.test(lid) && (locLower.includes('almacen') || locLower.includes('almacén'));
                  
                  if (!isNumericInAlmacen) {
                      // It's invalid in this zone. Kick to General.
                      // Example: HE123 in Hortaleza -> Kick.
                      // Example: 123 in Reina -> Kick.
                      target = 'General';
                  }
              }
          }

          if (target) {
              if (target === 'Hortaleza') batchHortaleza.push(b.id);
              else if (target === 'Reina') batchReina.push(b.id);
              else if (target === 'Galeon') batchGaleon.push(b.id);
              else if (target === 'General') batchGeneral.push(b.id);
          }
      }

      // Execute Batch Updates
      if (batchHortaleza.length > 0) {
          await supabase.from('libros').update({ ubicacion: 'Hortaleza' }).in('id', batchHortaleza);
          stats.moveToHortaleza += batchHortaleza.length;
      }
      if (batchReina.length > 0) {
          await supabase.from('libros').update({ ubicacion: 'Reina' }).in('id', batchReina);
          stats.moveToReina += batchReina.length;
      }
      if (batchGaleon.length > 0) {
          await supabase.from('libros').update({ ubicacion: 'Galeon' }).in('id', batchGaleon);
          stats.moveToGaleon += batchGaleon.length;
      }
      if (batchGeneral.length > 0) {
          await supabase.from('libros').update({ ubicacion: 'General' }).in('id', batchGeneral);
          stats.kickToGeneral += batchGeneral.length;
      }

      lastId = books[books.length - 1].id;
      totalProcessed += books.length;
      process.stdout.write(`\rScanned ${totalProcessed}. Fixed: H=${stats.moveToHortaleza} R=${stats.moveToReina} G=${stats.moveToGaleon} Gen=${stats.kickToGeneral}`);
  }

  console.log("\n\n--- Enforcement Complete ---");
  console.log(`Moved to Hortaleza: ${stats.moveToHortaleza}`);
  console.log(`Moved to Reina: ${stats.moveToReina}`);
  console.log(`Moved to Galeon: ${stats.moveToGaleon}`);
  console.log(`Kicked to General (Invalid Resident): ${stats.kickToGeneral}`);
}

fixGlobalStrict();
