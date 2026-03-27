import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// Load .env from root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../.env');

dotenv.config({ path: envPath });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase environment variables in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listBooks() {
  console.log('Fetching books with anio = 2026...');
  
  // Fetch columns: id, legacy_id, titulo
  const { data, error } = await supabase
    .from('libros')
    .select('id, legacy_id, titulo, stock')
    .eq('anio', 2026)
    .order('legacy_id', { ascending: true }); // Order by legacy_id for easier checking

  if (error) {
    console.error('Error fetching books:', error);
    return;
  }

  console.log(`Found ${data.length} books.`);

  const outputLines = [
    'Legacy ID | ID | Stock | Título',
    '---|---|---|---'
  ];

  data.forEach(book => {
    const legacy = book.legacy_id || '(No Legacy ID)';
    outputLines.push(`${legacy} | ${book.id} | ${book.stock} | ${book.titulo}`);
  });

  const outputText = outputLines.join('\n');
  const outputPath = resolve(__dirname, '../books_2026_list.txt');

  fs.writeFileSync(outputPath, outputText, 'utf8');
  console.log(`List saved to: ${outputPath}`);
  
  // Print first 5 for preview
  console.log('\nPreview of first 5 items:');
  console.log(outputLines.slice(0, 7).join('\n'));
}

listBooks();
