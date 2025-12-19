
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.development') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function verifyStrictness() {
  console.log("FINAL EXHAUSTIVE VERIFICATION (Scanning ALL books)...");
  console.log("Checking validity of:");
  console.log("- Hortaleza (Must be \\d+H)");
  console.log("- Reina (Must be \\d+R)");
  console.log("- Galeon (Must be \\d+G)");
  console.log("- Almacen* (Must be \\d+)");

  const rules = {
      'hortaleza': { regex: /^\d+H$/i, name: 'Hortaleza', rule: 'Numeric + H' },
      'reina': { regex: /^\d+R$/i, name: 'Reina', rule: 'Numeric + R' },
      'galeon': { regex: /^\d+G$/i, name: 'Galeon', rule: 'Numeric + G' },
      'almacen': { regex: /^\d+$/, name: 'Almacen', rule: 'Numeric Only' }
  };
  
  let stats = {
      Hortaleza: { total: 0, valid: 0, invalid: [] },
      Reina: { total: 0, valid: 0, invalid: [] },
      Galeon: { total: 0, valid: 0, invalid: [] },
      Almacen: { total: 0, valid: 0, invalid: [] }
  };

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
          break;
      }
      
      if (!data || data.length === 0) {
          hasMore = false;
          break;
      }

      for (const b of data) {
          const loc = b.ubicacion ? b.ubicacion.toLowerCase() : '';
          const lid = b.legacy_id ? b.legacy_id.trim() : '';
          
          if (loc.includes('hortaleza')) {
              stats.Hortaleza.total++;
              if (rules.hortaleza.regex.test(lid)) stats.Hortaleza.valid++;
              else stats.Hortaleza.invalid.push(b);
          }
          else if (loc.includes('reina')) {
              stats.Reina.total++;
              if (rules.reina.regex.test(lid)) stats.Reina.valid++;
              else stats.Reina.invalid.push(b);
          }
          else if (loc.includes('galeon') || loc.includes('galeón')) {
              stats.Galeon.total++;
              if (rules.galeon.regex.test(lid)) stats.Galeon.valid++;
              else stats.Galeon.invalid.push(b);
          }
          else if (loc.includes('almacen') || loc.includes('almacén')) {
              stats.Almacen.total++;
              if (rules.almacen.regex.test(lid)) stats.Almacen.valid++;
              else stats.Almacen.invalid.push(b);
          }
      }

      lastId = data[data.length - 1].id;
      totalProcessed += data.length;
      process.stdout.write(`\rScanned ${totalProcessed} books...`);
  }

  console.log("\n\n--- FINAL VERIFICATION RESULTS ---");

  const printReport = (name, data) => {
      console.log(`\n[${name.toUpperCase()}]`);
      console.log(`Total: ${data.total}`);
      console.log(`✅ Valid: ${data.valid}`);
      console.log(`❌ Invalid: ${data.invalid.length}`);
      if (data.invalid.length > 0) {
          console.log(`⚠️  FOUND ${data.invalid.length} ERRORS! Sample:`);
          data.invalid.slice(0, 5).forEach(b => console.log(`   [${b.id}] Ref: ${b.legacy_id} | Loc: ${b.ubicacion}`));
      } else {
          console.log(`✨ CLEAN (0 Errors)`);
      }
  };

  printReport('Hortaleza', stats.Hortaleza);
  printReport('Reina', stats.Reina);
  printReport('Galeon', stats.Galeon);
  printReport('Almacen', stats.Almacen);
  
  const totalErrors = stats.Hortaleza.invalid.length + stats.Reina.invalid.length + stats.Galeon.invalid.length + stats.Almacen.invalid.length;
  if (totalErrors === 0) {
      console.log("\n🎉 SUCCESS: All restricted locations comply strictly with ID rules.");
  } else {
      console.log(`\n⚠️  WARNING: Found ${totalErrors} total violations mostly likely requiring manual review or another pass.`);
  }
}

verifyStrictness();
