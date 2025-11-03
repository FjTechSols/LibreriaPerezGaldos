import { supabase } from '../lib/supabase';
import { Book } from '../types';

export interface LibroSupabase {
  id: number;
  codigo?: string;
  titulo: string;
  autor: string;
  editorial?: string;
  isbn: string;
  precio: number;
  precio_original?: number;
  stock: number;
  categoria: string;
  descripcion?: string;
  imagen_portada?: string;
  valoracion?: number;
  destacado?: boolean;
  novedad?: boolean;
  oferta?: boolean;
  paginas?: number;
  anio_publicacion?: number;
  idioma?: string;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export const mapLibroToBook = (libro: LibroSupabase): Book => ({
  id: libro.id.toString(),
  code: libro.codigo || '',
  title: libro.titulo,
  author: libro.autor,
  publisher: libro.editorial || '',
  pages: libro.paginas || 0,
  publicationYear: libro.anio_publicacion || new Date().getFullYear(),
  isbn: libro.isbn,
  price: Number(libro.precio),
  originalPrice: libro.precio_original ? Number(libro.precio_original) : undefined,
  stock: libro.stock,
  category: libro.categoria,
  description: libro.descripcion || '',
  coverImage: libro.imagen_portada || 'https://images.pexels.com/photos/159866/books-book-pages-read-literature-159866.jpeg?auto=compress&cs=tinysrgb&w=300',
  rating: libro.valoracion || 0,
  reviews: [],
  featured: libro.destacado || false,
  isNew: libro.novedad || false,
  isOnSale: libro.oferta || false
});

export const obtenerLibros = async (): Promise<Book[]> => {
  try {
    const { data, error } = await supabase
      .from('libros')
      .select('*')
      .eq('activo', true)
      .order('titulo', { ascending: true });

    if (error) {
      console.error('Error al obtener libros:', error);
      return [];
    }

    return data ? data.map(mapLibroToBook) : [];
  } catch (error) {
    console.error('Error inesperado al obtener libros:', error);
    return [];
  }
};

export const obtenerLibroPorId = async (id: string | number): Promise<Book | null> => {
  try {
    const { data, error } = await supabase
      .from('libros')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error al obtener libro:', error);
      return null;
    }

    return data ? mapLibroToBook(data) : null;
  } catch (error) {
    console.error('Error inesperado al obtener libro:', error);
    return null;
  }
};

export const crearLibro = async (libro: Partial<LibroSupabase>): Promise<Book | null> => {
  try {
    const { data, error } = await supabase
      .from('libros')
      .insert({
        codigo: libro.codigo || null,
        titulo: libro.titulo,
        autor: libro.autor,
        editorial: libro.editorial || null,
        isbn: libro.isbn,
        precio: libro.precio,
        precio_original: libro.precio_original || null,
        stock: libro.stock || 0,
        categoria: libro.categoria,
        descripcion: libro.descripcion || null,
        imagen_portada: libro.imagen_portada || null,
        valoracion: libro.valoracion || 0,
        destacado: libro.destacado || false,
        novedad: libro.novedad || false,
        oferta: libro.oferta || false,
        paginas: libro.paginas || null,
        anio_publicacion: libro.anio_publicacion || null,
        idioma: libro.idioma || 'es',
        activo: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error al crear libro:', error);
      return null;
    }

    return data ? mapLibroToBook(data) : null;
  } catch (error) {
    console.error('Error inesperado al crear libro:', error);
    return null;
  }
};

export const actualizarLibro = async (id: number, libro: Partial<LibroSupabase>): Promise<Book | null> => {
  try {
    const updateData: any = {};

    if (libro.codigo !== undefined) updateData.codigo = libro.codigo;
    if (libro.titulo !== undefined) updateData.titulo = libro.titulo;
    if (libro.autor !== undefined) updateData.autor = libro.autor;
    if (libro.editorial !== undefined) updateData.editorial = libro.editorial;
    if (libro.isbn !== undefined) updateData.isbn = libro.isbn;
    if (libro.precio !== undefined) updateData.precio = libro.precio;
    if (libro.precio_original !== undefined) updateData.precio_original = libro.precio_original;
    if (libro.stock !== undefined) updateData.stock = libro.stock;
    if (libro.categoria !== undefined) updateData.categoria = libro.categoria;
    if (libro.descripcion !== undefined) updateData.descripcion = libro.descripcion;
    if (libro.imagen_portada !== undefined) updateData.imagen_portada = libro.imagen_portada;
    if (libro.valoracion !== undefined) updateData.valoracion = libro.valoracion;
    if (libro.destacado !== undefined) updateData.destacado = libro.destacado;
    if (libro.novedad !== undefined) updateData.novedad = libro.novedad;
    if (libro.oferta !== undefined) updateData.oferta = libro.oferta;
    if (libro.paginas !== undefined) updateData.paginas = libro.paginas;
    if (libro.anio_publicacion !== undefined) updateData.anio_publicacion = libro.anio_publicacion;
    if (libro.idioma !== undefined) updateData.idioma = libro.idioma;
    if (libro.activo !== undefined) updateData.activo = libro.activo;

    const { data, error } = await supabase
      .from('libros')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error al actualizar libro:', error);
      return null;
    }

    return data ? mapLibroToBook(data) : null;
  } catch (error) {
    console.error('Error inesperado al actualizar libro:', error);
    return null;
  }
};

export const eliminarLibro = async (id: number): Promise<boolean> => {
  try {
    // Soft delete - marcar como inactivo
    const { error } = await supabase
      .from('libros')
      .update({ activo: false })
      .eq('id', id);

    if (error) {
      console.error('Error al eliminar libro:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error inesperado al eliminar libro:', error);
    return false;
  }
};

export const buscarLibros = async (query: string): Promise<Book[]> => {
  try {
    const { data, error } = await supabase
      .from('libros')
      .select('*')
      .eq('activo', true)
      .or(`titulo.ilike.%${query}%,autor.ilike.%${query}%,isbn.ilike.%${query}%`)
      .order('titulo', { ascending: true });

    if (error) {
      console.error('Error al buscar libros:', error);
      return [];
    }

    return data ? data.map(mapLibroToBook) : [];
  } catch (error) {
    console.error('Error inesperado al buscar libros:', error);
    return [];
  }
};

export const obtenerLibrosPorCategoria = async (categoria: string): Promise<Book[]> => {
  try {
    const { data, error } = await supabase
      .from('libros')
      .select('*')
      .eq('activo', true)
      .eq('categoria', categoria)
      .order('titulo', { ascending: true });

    if (error) {
      console.error('Error al obtener libros por categoría:', error);
      return [];
    }

    return data ? data.map(mapLibroToBook) : [];
  } catch (error) {
    console.error('Error inesperado al obtener libros por categoría:', error);
    return [];
  }
};
