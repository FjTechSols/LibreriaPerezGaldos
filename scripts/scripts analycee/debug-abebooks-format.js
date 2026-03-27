import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import fs from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugFormat() {
    console.log('Fetching sample books...');
    // Fetch books with ISBN and Image if possible
    const { data: books, error } = await supabase
        .from('libros')
        .select('id, legacy_id, titulo, autor, isbn, precio, stock, editoriales(nombre), descripcion, anio, ubicacion, imagen_url')
        .gt('stock', 0)
        .not('isbn', 'is', null) // Must have ISBN
        .not('imagen_url', 'is', null) // Must have Image
        .neq('isbn', '')
        .limit(5);

    if (error) {
        console.error('Error fetching books:', error);
        return;
    }

    console.log(`Fetched ${books.length} books.`);

    // --- LOGIC FROM EDGE FUNCTION ---
    const headers = [
        "Codigo", "Titulo", "Descripcion", "Imagen", "Editorial", "Ano", 
        "Autor", "Lugar", "Pais", "Precio", "Cantidad", "Extra"
    ];
    
    const q = (val) => `"${String(val || '').replace(/"/g, '""')}"`; 
    const u = (val) => String(val || '');

    const separator = '\t';
    const headerRow = headers.map(h => q(h)).join(separator);
    
    console.log('\n--- GENERATED HEADER ---');
    console.log(headerRow);

    console.log('\n--- GENERATED ROWS ---');
    for (const book of books) {
        const sku = book.legacy_id || book.id;
        const description = (book.descripcion || '').replace(/\s+/g, ' ').trim(); 
        const editorialName = book.editoriales?.nombre || '';
        
        let imageUrl = "NO";
        if (book.imagen_url && 
            book.imagen_url.trim() !== "" && 
            !book.imagen_url.includes("default-book-cover") &&
            (book.imagen_url.startsWith("http") || book.imagen_url.startsWith("https"))) {
             imageUrl = book.imagen_url;
        }

        const row = [
            q(sku),
            q(book.titulo || 'Untitled'),
            q(description.substring(0, 50) + '...'), // Truncate desc for log
            u(imageUrl), 
            q(editorialName),
            q(book.anio || ''),
            q(book.autor || 'Unknown'),
            q(""), 
            q("España"), 
            u(Number(book.precio).toFixed(2)), 
            q(book.stock), 
            q("") 
        ];
        console.log(`\n--- Book: ${book.legacy_id} ---`);
        console.log(`DB ISBN: ${book.isbn}, DB IMG: ${book.imagen_url}`);
        console.log(`Row Image Col (Unquoted): ${row[3]}`);
        console.log(`Full Row: ${row.join(separator)}`);
    }
}

debugFormat();
