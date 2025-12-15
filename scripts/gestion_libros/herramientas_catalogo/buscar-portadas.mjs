import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const DEFAULT_BOOK_COVER = 'https://images.pexels.com/photos/256450/pexels-photo-256450.jpeg?auto=compress&cs=tinysrgb&w=400';

async function buscarPortadaPorISBN(isbn, titulo, autor) {
  if (!isbn) {
    console.log(`  ⚠️  Sin ISBN - usando portada por defecto`);
    return DEFAULT_BOOK_COVER;
  }

  try {
    const cleanISBN = isbn.replace(/[-\s]/g, '');

    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanISBN}`
    );

    if (!response.ok) {
      console.log(`  ⚠️  Error en API de Google Books - usando portada por defecto`);
      return DEFAULT_BOOK_COVER;
    }

    const data = await response.json();

    if (data.items && data.items.length > 0) {
      const book = data.items[0];
      const imageUrl = book.volumeInfo?.imageLinks?.thumbnail ||
                      book.volumeInfo?.imageLinks?.smallThumbnail;

      if (imageUrl) {
        const httpsUrl = imageUrl.replace('http://', 'https://');
        const largerUrl = httpsUrl.replace('&zoom=1', '&zoom=2');
        console.log(`  ✅ Portada encontrada en Google Books`);
        return largerUrl;
      }
    }

    console.log(`  ℹ️  No se encontró portada en Google Books - usando por defecto`);
    return DEFAULT_BOOK_COVER;
  } catch (error) {
    console.error(`  ❌ Error al buscar portada:`, error.message);
    return DEFAULT_BOOK_COVER;
  }
}

async function buscarPortadaPorTituloAutor(titulo, autor) {
  try {
    const query = `${titulo} ${autor}`.replace(/\s+/g, '+');

    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`
    );

    if (!response.ok) {
      return DEFAULT_BOOK_COVER;
    }

    const data = await response.json();

    if (data.items && data.items.length > 0) {
      const book = data.items[0];
      const imageUrl = book.volumeInfo?.imageLinks?.thumbnail ||
                      book.volumeInfo?.imageLinks?.smallThumbnail;

      if (imageUrl) {
        const httpsUrl = imageUrl.replace('http://', 'https://');
        const largerUrl = httpsUrl.replace('&zoom=1', '&zoom=2');
        console.log(`  ✅ Portada encontrada por título/autor`);
        return largerUrl;
      }
    }

    return DEFAULT_BOOK_COVER;
  } catch (error) {
    console.error(`  ❌ Error al buscar por título/autor:`, error.message);
    return DEFAULT_BOOK_COVER;
  }
}

async function actualizarPortadasLibros() {
  console.log('🔍 Buscando libros sin portada...\n');

  const { data: libros, error } = await supabase
    .from('libros')
    .select('id, titulo, autor, isbn, imagen_url')
    .eq('activo', true)
    .or('imagen_url.is.null,imagen_url.eq.""');

  if (error) {
    console.error('❌ Error al obtener libros:', error);
    return;
  }

  if (!libros || libros.length === 0) {
    console.log('✅ No hay libros sin portada');
    return;
  }

  console.log(`📚 Encontrados ${libros.length} libros sin portada\n`);

  let actualizados = 0;
  let sinCambios = 0;

  for (const libro of libros) {
    console.log(`\n📖 Procesando: "${libro.titulo}" por ${libro.autor}`);
    console.log(`   ID: ${libro.id} | ISBN: ${libro.isbn || 'N/A'}`);

    let portadaUrl = DEFAULT_BOOK_COVER;

    if (libro.isbn) {
      portadaUrl = await buscarPortadaPorISBN(libro.isbn, libro.titulo, libro.autor);

      if (portadaUrl === DEFAULT_BOOK_COVER) {
        console.log(`  🔄 Intentando búsqueda por título/autor...`);
        portadaUrl = await buscarPortadaPorTituloAutor(libro.titulo, libro.autor);
      }
    } else {
      portadaUrl = await buscarPortadaPorTituloAutor(libro.titulo, libro.autor);
    }

    const { error: updateError } = await supabase
      .from('libros')
      .update({ imagen_url: portadaUrl })
      .eq('id', libro.id);

    if (updateError) {
      console.error(`  ❌ Error al actualizar libro ${libro.id}:`, updateError);
      sinCambios++;
    } else {
      console.log(`  💾 Portada actualizada exitosamente`);
      actualizados++;
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN');
  console.log('='.repeat(60));
  console.log(`✅ Libros actualizados: ${actualizados}`);
  console.log(`⚠️  Libros sin cambios: ${sinCambios}`);
  console.log(`📚 Total procesados: ${libros.length}`);
  console.log('='.repeat(60) + '\n');
}

actualizarPortadasLibros()
  .then(() => {
    console.log('✨ Proceso completado');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
