import { supabase } from '../lib/supabase';
import { Book } from '../types';

export interface LibroSupabase {
  id: number;
  legacy_id?: string;  // Código interno del libro
  isbn?: string;
  titulo: string;
  autor: string;
  editorial_id?: number;
  categoria_id?: number;
  anio?: number;  // año de publicación
  paginas?: number;
  descripcion?: string;
  notas?: string;
  precio: number;
  stock: number;
  ubicacion?: string;
  fecha_ingreso?: string;
  activo: boolean;
  imagen_url?: string;  // URL de la imagen de portada
  created_at?: string;
  updated_at?: string;
}

export const mapLibroToBook = (libro: LibroSupabase): Book => ({
  id: libro.id.toString(),
  code: libro.legacy_id || libro.id.toString(),  // Mostrar legacy_id si existe, sino el id
  title: libro.titulo,
  author: libro.autor,
  publisher: '',  // TODO: Obtener de editorial_id
  pages: libro.paginas || 0,
  publicationYear: libro.anio || new Date().getFullYear(),
  isbn: libro.isbn || '',
  price: Number(libro.precio),
  originalPrice: undefined,  // No existe en la BD actual
  stock: libro.stock,
  ubicacion: libro.ubicacion || '',
  category: '',  // TODO: Obtener de categoria_id
  description: libro.descripcion || '',
  coverImage: libro.imagen_url || 'https://images.pexels.com/photos/159866/books-book-pages-read-literature-159866.jpeg?auto=compress&cs=tinysrgb&w=300',
  rating: 0,  // No existe en la BD actual
  reviews: [],
  featured: false,  // No existe en la BD actual
  isNew: false,  // No existe en la BD actual
  isOnSale: false  // No existe en la BD actual
});

export const obtenerLibros = async (limit?: number, offset?: number): Promise<Book[]> => {
  try {
    let query = supabase
      .from('libros')
      .select('*')
      .eq('activo', true)
      .order('titulo', { ascending: true });

    // Si no se especifica límite, traer todos los libros
    if (limit !== undefined) {
      query = query.range(offset || 0, (offset || 0) + limit - 1);
    }

    const { data, error } = await query;

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
        legacy_id: libro.legacy_id || null,
        titulo: libro.titulo,
        autor: libro.autor,
        isbn: libro.isbn || null,
        precio: libro.precio,
        stock: libro.stock || 0,
        ubicacion: libro.ubicacion || null,
        descripcion: libro.descripcion || null,
        imagen_url: libro.imagen_url || null,
        paginas: libro.paginas || null,
        anio: libro.anio || null,
        categoria_id: libro.categoria_id || null,
        editorial_id: libro.editorial_id || null,
        notas: libro.notas || null,
        activo: true,
        fecha_ingreso: new Date().toISOString().split('T')[0]
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

    if (libro.legacy_id !== undefined) updateData.legacy_id = libro.legacy_id;
    if (libro.titulo !== undefined) updateData.titulo = libro.titulo;
    if (libro.autor !== undefined) updateData.autor = libro.autor;
    if (libro.isbn !== undefined) updateData.isbn = libro.isbn;
    if (libro.precio !== undefined) updateData.precio = libro.precio;
    if (libro.stock !== undefined) updateData.stock = libro.stock;
    if (libro.ubicacion !== undefined) updateData.ubicacion = libro.ubicacion;
    if (libro.descripcion !== undefined) updateData.descripcion = libro.descripcion;
    if (libro.imagen_url !== undefined) updateData.imagen_url = libro.imagen_url;
    if (libro.paginas !== undefined) updateData.paginas = libro.paginas;
    if (libro.anio !== undefined) updateData.anio = libro.anio;
    if (libro.categoria_id !== undefined) updateData.categoria_id = libro.categoria_id;
    if (libro.editorial_id !== undefined) updateData.editorial_id = libro.editorial_id;
    if (libro.notas !== undefined) updateData.notas = libro.notas;
    if (libro.activo !== undefined) updateData.activo = libro.activo;

    updateData.updated_at = new Date().toISOString();

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
      .or(`titulo.ilike.%${query}%,autor.ilike.%${query}%,isbn.ilike.%${query}%,legacy_id.ilike.%${query}%`)
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

export const obtenerLibrosPorCategoria = async (categoriaId: number): Promise<Book[]> => {
  try {
    const { data, error } = await supabase
      .from('libros')
      .select('*')
      .eq('activo', true)
      .eq('categoria_id', categoriaId)
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

// Función para obtener el conteo total de libros
export const obtenerTotalLibros = async (): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('libros')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true);

    if (error) {
      console.error('Error al obtener total de libros:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error inesperado al obtener total de libros:', error);
    return 0;
  }
};

// Función para obtener estadísticas de libros
export const obtenerEstadisticasLibros = async (): Promise<{
  total: number;
  enStock: number;
  sinStock: number;
}> => {
  try {
    // Obtener total de libros activos
    const { count: total, error: errorTotal } = await supabase
      .from('libros')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true);

    // Obtener libros con stock > 0
    const { count: enStock, error: errorStock } = await supabase
      .from('libros')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true)
      .gt('stock', 0);

    if (errorTotal || errorStock) {
      console.error('Error al obtener estadísticas:', errorTotal || errorStock);
      return { total: 0, enStock: 0, sinStock: 0 };
    }

    return {
      total: total || 0,
      enStock: enStock || 0,
      sinStock: (total || 0) - (enStock || 0)
    };
  } catch (error) {
    console.error('Error inesperado al obtener estadísticas:', error);
    return { total: 0, enStock: 0, sinStock: 0 };
  }
};
