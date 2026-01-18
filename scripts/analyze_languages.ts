
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
  console.log('Available keys:', Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('VITE')));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function getLanguageFromISBN(isbnInput: string): string {
  // Remove hyphens and spaces
  let isbn = isbnInput.replace(/[^0-9X]/gi, '');

  // Convert ISBN-10 to ISBN-13 prefix equivalent for checking
  // (ISBN-10 groups are same as ISBN-13 after '978')
  // We don't need full conversion, just valid prefix logic.
  // ISBN-13 usually starts with 978 or 979.
  
  let core = isbn;
  if (isbn.length === 13) {
      if (isbn.startsWith('978')) {
          core = isbn.substring(3);
      } else if (isbn.startsWith('979')) {
          // 979 has different prefixes, harder to map generically, 
          // but 979-8 is USA, 979-10 is France, 979-11 Korea, 979-12 Italy.
          // Let's handle a few common ones if needed, or skip for now complexity.
          // Let's stick to simple header check.
          const after979 = isbn.substring(3);
          if (after979.startsWith('8')) return 'English'; // USA
          if (after979.startsWith('10')) return 'Francés';
          if (after979.startsWith('11')) return 'Coreano';
          if (after979.startsWith('12')) return 'Italiano';
          return 'Otros (979)';
      }
  } else if (isbn.length === 10) {
      core = isbn;
  } else {
      return 'ISBN Inválido/Desconocido';
  }

  // Check prefixes on the 'core' part (Group Identifier)
  // 0-5 and 7 are single digit groups.
  // 80-94 are double digit.
  // 950-993 are triple digit.
  
  const g1 = parseInt(core.substring(0, 1));
  const g2 = parseInt(core.substring(0, 2));
  const g3 = parseInt(core.substring(0, 3));
  const g4 = parseInt(core.substring(0, 4));
  const g5 = parseInt(core.substring(0, 5));

  // Single Digit Groups
  if (g1 === 0 || g1 === 1) return 'Inglés';
  if (g1 === 2) return 'Francés';
  if (g1 === 3) return 'Alemán';
  if (g1 === 4) return 'Japonés';
  if (g1 === 5) return 'Ruso'; // USSR/Russia
  if (g1 === 7) return 'Chino';

  // Double Digit Groups (partial list)
  if (g2 === 84) return 'Español'; // Spain
  if (g2 === 85) return 'Portugués (Brasil)';
  if (g2 === 88) return 'Italiano';
  if (g2 === 89) return 'Coreano';
  if (g2 === 86) return 'Serbio/Croata'; // Yugoslavia
  if (g2 === 80) return 'Checo'; // Czech
  if (g2 === 81) return 'Indio'; // India (also English/multilingual)
  if (g2 === 82) return 'Noruego';
  if (g2 === 83) return 'Polaco';
  if (g2 === 87) return 'Danés'; // Denmark
  // 90-94 -> Netherlands, Sweden, Int orgs...
  if (g2 === 90) return 'Holandés';
  if (g2 === 91) return 'Sueco';
  if (g2 === 92) return 'Organismos Intl / Otros'; // Intl publishers
  if (g2 === 93) return 'Indio'; // India specific
  if (g2 === 94) return 'Holandés'; 

  // Triple Digit Groups (LatAm mostly for Spanish)
  // We care about Spanish (LatAm).
  // 950 (Argentina), 951 (Finland), 952 (Finland), 953 (Croatia), 954 (Bulgaria), 956 (Chile), 958 (Colombia), 959 (Cuba)
  // 960 (Greece), 968 (Mexico), 970 (Mexico), 972 (Portugal), 980 (Venezuela), 987 (Argentina), 992 (...etc)
  
  if (g3 === 950 || g3 === 987 || g3 === 956 || g3 === 958 || g3 === 959 || g3 === 968 || g3 === 970 || g3 === 980) return 'Español (LatAm)';
  if (g3 === 972) return 'Portugués (Portugal)';
  
  // If we reached here, and it's a 9 number, it might be a smaller Spanish country or other.
  // 99 + digits are usually smaller countries. 
  // Let's check a few common other Spanish ones:
  // 9942 (Ecuador), 9972 (Peru), 9974 (Uruguay), 9968 (Costa Rica)...

  if (core.startsWith('9942') || core.startsWith('9972') || core.startsWith('9974') || core.startsWith('9968')) return 'Español (LatAm)';

  return 'Otros / Desconocido';
}

async function analyze() {
  console.log('Iniciando análisis de idiomas por ISBN...');
  
  let page = 0;
  const size = 1000;
  let hasMore = true;
  
  const stats: Record<string, number> = {};
  const sample: Record<string, string[]> = {}; // Store a few titles per lang
  let processed = 0;
  let withIsbn = 0;

  while (hasMore) {
    const { data: books, error } = await supabase
      .from('libros')
      .select('id, titulo, isbn')
      .neq('isbn', null)
      .neq('isbn', '')
      .range(page * size, (page + 1) * size - 1);

    if (error) {
      console.error('Error fetching books:', error);
      break;
    }

    if (!books || books.length === 0) {
      hasMore = false;
      break;
    }

    for (const book of books) {
       const lang = getLanguageFromISBN(book.isbn);
       stats[lang] = (stats[lang] || 0) + 1;
       
       // keep sample
       if (!sample[lang]) sample[lang] = [];
       if (sample[lang].length < 3) sample[lang].push(`${book.isbn} - ${book.titulo}`);
       withIsbn++;
    }
    
    processed += books.length;
    process.stdout.write(`\rProcesados: ${processed} libros...`);
    
    if (books.length < size) hasMore = false;
    page++;
  }


// ... (previous code)

  console.log('\n\n--- RESULTADOS DEL ANÁLISIS ---');
  console.log(`Total libros con ISBN analizados: ${withIsbn}`);
  console.table(stats);

  let output = `RESULTADOS DEL ANÁLISIS\n-----------------------\nTotal libros analizados: ${withIsbn}\n\nDISTRIBUCIÓN:\n`;
  Object.entries(stats).sort((a,b) => b[1] - a[1]).forEach(([lang, count]) => {
      output += `${lang}: ${count} (${((count/withIsbn)*100).toFixed(2)}%)\n`;
  });

  output += '\n\nEJEMPLOS:\n';
  Object.entries(sample).forEach(([lang, titles]) => {
      if (lang !== 'Español' && lang !== 'Español (LatAm)') {
          output += `\n[${lang}]:\n`;
          titles.forEach(t => output += `  - ${t}\n`);
      }
  });

  fs.writeFileSync('analysis_results.txt', output);
  console.log('Resultados guardados en analysis_results.txt');
}

analyze();
