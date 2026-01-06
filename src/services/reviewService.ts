import { supabase } from '../lib/supabase';

export interface Review {
  id: number;
  libro_id: number;
  usuario_id: string;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
  usuario?: {
    email: string;
    username?: string;
    nombre?: string;
  };
}

export interface ReviewFormData {
  libro_id: number;
  rating: number;
  comment: string;
}

export const getReviewsByLibroId = async (libroId: number): Promise<Review[]> => {
  try {
    // Fetch reviews without JOIN
    const { data: reviewsData, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('libro_id', libroId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al obtener reseñas:', error);
      return [];
    }

    if (!reviewsData || reviewsData.length === 0) {
      return [];
    }

    // Get unique user IDs
    const userIds = [...new Set(reviewsData.map(r => r.usuario_id))];

    // Fetch user data separately
    const { data: usersData } = await supabase
      .from('usuarios')
      .select('id, email, username, nombre')
      .in('id', userIds);

    // Create a map of users by ID
    const usersMap = new Map(usersData?.map(u => [u.id, u]) || []);

    // Merge reviews with user data
    const reviews = reviewsData.map(review => ({
      ...review,
      usuario: usersMap.get(review.usuario_id)
    }));

    return reviews;
  } catch (error) {
    console.error('Error inesperado al obtener reseñas:', error);
    return [];
  }
};

export const getUserReviewForLibro = async (libroId: number, userId: string): Promise<Review | null> => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('libro_id', libroId)
      .eq('usuario_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error al obtener reseña del usuario:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error inesperado al obtener reseña del usuario:', error);
    return null;
  }
};

export const createReview = async (reviewData: ReviewFormData): Promise<Review | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('Usuario no autenticado');
      return null;
    }

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        libro_id: reviewData.libro_id,
        usuario_id: user.id,
        rating: reviewData.rating,
        comment: reviewData.comment
      })
      .select()
      .single();

    if (error) {
      console.error('Error al crear reseña:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error inesperado al crear reseña:', error);
    return null;
  }
};

export const updateReview = async (reviewId: number, reviewData: Partial<ReviewFormData>): Promise<Review | null> => {
  try {
    const updateData: any = {};

    if (reviewData.rating !== undefined) updateData.rating = reviewData.rating;
    if (reviewData.comment !== undefined) updateData.comment = reviewData.comment;

    const { data, error } = await supabase
      .from('reviews')
      .update(updateData)
      .eq('id', reviewId)
      .select()
      .single();

    if (error) {
      console.error('Error al actualizar reseña:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error inesperado al actualizar reseña:', error);
    return null;
  }
};

export const deleteReview = async (reviewId: number): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId);

    if (error) {
      console.error('Error al eliminar reseña:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error inesperado al eliminar reseña:', error);
    return false;
  }
};

export const getBookAverageRating = async (libroId: number): Promise<number> => {
  try {
    const { data, error } = await supabase
      .rpc('get_book_average_rating', { book_id: libroId });

    if (error) {
      console.error('Error al obtener rating promedio:', error);
      return 0;
    }

    return Number(data) || 0;
  } catch (error) {
    console.error('Error inesperado al obtener rating promedio:', error);
    return 0;
  }
};

export const getBookReviewCount = async (libroId: number): Promise<number> => {
  try {
    const { data, error } = await supabase
      .rpc('get_book_review_count', { book_id: libroId });

    if (error) {
      console.error('Error al obtener conteo de reseñas:', error);
      return 0;
    }

    return Number(data) || 0;
  } catch (error) {
    console.error('Error inesperado al obtener conteo de reseñas:', error);
    return 0;
  }
};
