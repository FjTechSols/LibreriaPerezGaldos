
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.development');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

const famousKeywords = [
  'galdós', 'galdos', 'cervantes', 'shakespeare', 'austen', 'orwell', 
  'marquez', 'borges', 'cortazar', 'neruda', 'hemingway',
  'tolstoi', 'dostoievski', 'kafka', 'camus', 'poe',
  'lorca', 'machado', 'unamuno', 'baroja', 'clarín', 'clarin',
  'dickens', 'tolkien', 'rowling', 'king', 'christie', 
  'quijote', 'lazarillo', 'celestina', 'regenta', 'novela', 'historia'
];

async function setFeatured() {
  console.log('Searching for famous titles (Aggressive Mode)...');
  
  // 1. Reset Featured
  await supabase.from('libros').update({ destacado: false }).neq('id', 0);

  // 2. Fetch ALL candidates (optimize by selecting needed fields)
  // Fetch more to ensure we find matches
  const { data: books, error } = await supabase
    .from('libros')
    .select('id, titulo, autor')
    .eq('activo', true)
    .gt('stock', 0);

  if (error || !books) {
    console.error('Error fetching books:', error);
    return;
  }

  console.log(`Total active books scanned: ${books.length}`);

  // 3. Score books based on keywords
  const candidates = [];
  const seenTitles = new Set();

  books.forEach(b => {
    const text = (b.titulo + ' ' + b.autor).toLowerCase();
    const isFamous = famousKeywords.some(k => text.includes(k.toLowerCase()));
    
    // Deduplicate logic
    const titleKey = b.titulo.trim().toLowerCase();
    if (!seenTitles.has(titleKey)) {
        if (isFamous) {
            candidates.push(b);
            seenTitles.add(titleKey);
        }
    }
  });

  console.log(`Famous matches found: ${candidates.length}`);

  let selected = candidates;

  // 4. FALLBACK: If not enough famous books, fill with random ones
  if (selected.length < 15) {
    console.log('Not enough famous matches. Filling with random books...');
    const needed = 15 - selected.length;
    const remaining = books.filter(b => !selected.find(s => s.id === b.id));
    
    // Shuffle remaining
    const shuffled = remaining.sort(() => 0.5 - Math.random());
    const filler = shuffled.slice(0, needed);
    
    selected = [...selected, ...filler];
  }

  // Trim to 15 just in case
  selected = selected.slice(0, 15);

  if (selected.length > 0) {
    const ids = selected.map(b => b.id);
    const { error: updateError } = await supabase
        .from('libros')
        .update({ destacado: true })
        .in('id', ids);
    
    if (updateError) {
        console.error('Error updating DB:', updateError);
    } else {
        console.log(`Successfully updated ${ids.length} featured books.`);
        selected.forEach(b => console.log(`+ [Featured] ${b.titulo}`));
    }
  } else {
    console.error('CRITICAL: No books selected even after fallback!');
  }
}

setFeatured();
