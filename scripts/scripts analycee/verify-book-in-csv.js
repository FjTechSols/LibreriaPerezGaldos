import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY 
);

async function verifyBook(legacyId) {
  console.log(`\n=== Verificando libro con legacy_id: ${legacyId} ===\n`);
  
  // Query the book
  const { data: book, error } = await supabase
    .from('libros')
    .select('id, legacy_id, titulo, autor, isbn, precio, stock, created_at')
    .eq('legacy_id', legacyId)
    .single();

  if (error) {
    console.error("❌ Error:", error.message);
    return;
  }

  if (!book) {
    console.log("❌ Libro no encontrado en la base de datos");
    return;
  }

  console.log("📚 Datos del libro:");
  console.log(`   Título: ${book.titulo}`);
  console.log(`   Autor: ${book.autor}`);
  console.log(`   ISBN: ${book.isbn || 'N/A'}`);
  console.log(`   Precio: €${book.precio}`);
  console.log(`   Stock: ${book.stock}`);
  console.log(`   Creado: ${book.created_at}`);
  console.log(`   ID: ${book.id}`);
  console.log(`   Legacy ID: ${book.legacy_id}`);

  // Check eligibility
  const minPrice = 12;
  const eligible = book.stock > 0 && book.precio >= minPrice;

  console.log(`\n=== Criterios de Elegibilidad ===`);
  console.log(`   Stock > 0: ${book.stock > 0 ? '✅' : '❌'} (${book.stock})`);
  console.log(`   Precio >= 12€: ${book.precio >= minPrice ? '✅' : '❌'} (€${book.precio})`);
  console.log(`   Elegible para AbeBooks: ${eligible ? '✅ SÍ' : '❌ NO'}`);

  if (eligible) {
    console.log(`\n✅ Este libro DEBERÍA estar en el CSV subido a AbeBooks`);
    console.log(`   SKU en AbeBooks: ${book.legacy_id || book.id}`);
  } else {
    console.log(`\n❌ Este libro NO cumple los criterios para AbeBooks`);
    if (book.stock <= 0) console.log(`   Razón: Sin stock disponible`);
    if (book.precio < minPrice) console.log(`   Razón: Precio inferior a 12€`);
  }
}

const legacyId = process.argv[2] || '02293275';
verifyBook(legacyId);
