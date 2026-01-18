
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env from root
dotenv.config({ path: path.resolve(process.cwd(), '.env.development') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase credentials not found in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function getLanguageFromISBN(isbnInput: string): string {
  let isbn = isbnInput.replace(/[^0-9X]/gi, '');
  
  let core = isbn;
  if (isbn.length === 13) {
      if (isbn.startsWith('978')) {
          core = isbn.substring(3);
      } else if (isbn.startsWith('979')) {
          const after979 = isbn.substring(3);
          if (after979.startsWith('8')) return 'Inglés';
          if (after979.startsWith('10')) return 'Francés';
          if (after979.startsWith('11')) return 'Coreano';
          if (after979.startsWith('12')) return 'Italiano';
          return 'Otros (979)';
      }
  } else if (isbn.length === 10) {
      core = isbn;
  } else {
      return 'Desconocido'; // Don't update if invalid
  }

  const g1 = parseInt(core.substring(0, 1));
  const g2 = parseInt(core.substring(0, 2));
  const g3 = parseInt(core.substring(0, 3));

  // Single Digit Groups
  if (g1 === 0 || g1 === 1) return 'Inglés';
  if (g1 === 2) return 'Francés';
  if (g1 === 3) return 'Alemán';
  if (g1 === 4) return 'Japonés';
  if (g1 === 5) return 'Ruso';
  if (g1 === 7) return 'Chino';

  // Double Digit Groups
  if (g2 === 84) return 'Español';
  if (g2 === 85) return 'Portugués'; // Brasil usually
  if (g2 === 88) return 'Italiano';
  if (g2 === 89) return 'Coreano';
  if (g2 === 86) return 'Serbio/Croata';
  if (g2 === 80) return 'Checo';
  if (g2 === 81) return 'Indio';
  if (g2 === 82) return 'Noruego';
  if (g2 === 83) return 'Polaco';
  if (g2 === 87) return 'Danés';
  if (g2 === 90 || g2 === 94) return 'Holandés';
  if (g2 === 91) return 'Sueco';

  // Triple Digit Groups (LatAm)
  if (['950', '987', '956', '958', '959', '968', '970', '980'].includes(g3.toString())) return 'Español';
  if (g3 === 972) return 'Portugués';

  // Check some 4 digit for LatAm
  if (core.startsWith('9942') || core.startsWith('9972') || core.startsWith('9974') || core.startsWith('9968')) return 'Español';

  return 'Desconocido';
}

async function updateLanguages() {
  console.log('Iniciando ACTUALIZACIÓN de idiomas por ISBN...');
  
  const BATCH_SIZE = 1000;
  let lastId = 0;
  let hasMore = true;
  let processed = 0;
  let updatedCount = 0;
  let errors = 0;

  while (hasMore) {
    // Cursor-based pagination: much faster than OFFSET for large datasets
    const { data: books, error } = await supabase
      .from('libros')
      .select('id, isbn, idioma')
      .gt('id', lastId)
      .neq('isbn', null)
      .neq('isbn', '')
      .order('id', { ascending: true })
      .limit(BATCH_SIZE);

    if (error) {
      console.error('Error fetching batch:', error);
      errors++;
      // If error, maybe wait and retry or just break? 
      // Let's break to avoid infinite loops on error.
      break;
    }

    if (!books || books.length === 0) {
      hasMore = false;
      break;
    }

    const updates = [];

    for (const book of books) {
        // Update cursor
        lastId = book.id;
        
        const detectedLang = getLanguageFromISBN(book.isbn);
        
        // Skip if unknown or same as existing (case insensitive check)
        if (detectedLang === 'Desconocido') continue;

        const currentLang = book.idioma || '';
        
        // Normalize for comparison
        if (currentLang.toLowerCase() !== detectedLang.toLowerCase()) {
             // Push to update queue
             updates.push(
                 supabase.from('libros').update({ idioma: detectedLang }).eq('id', book.id)
             );
        }
    }

    if (updates.length > 0) {
        // Execute updates in parallel chunks of 50 to avoid request limit?
        // Supabase-js manages this well usually, but let's be safe if batch is large.
        // Actually Promise.all with 1000 requests might be too much for the client/network.
        // But updates array only contains *diffs*. Previously it was 126 updates per 1000.
        // That's acceptable.
        await Promise.all(updates);
        updatedCount += updates.length;
    }

    processed += books.length;
    process.stdout.write(`\rProcesados: ${processed} | Actualizados: ${updatedCount} | Último ID: ${lastId}`);
    
    // Check if we got less than requested (end of stream)
    if (books.length < BATCH_SIZE) hasMore = false;
  }

  console.log('\n\n--- ACTUALIZACIÓN COMPLETADA ---');
  console.log(`Total libros procesados: ${processed}`);
  console.log(`Total libros actualizados: ${updatedCount}`);
}

updateLanguages();
