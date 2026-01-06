import { supabase } from '../lib/supabase';
import { Reserva } from '../types';




export const createReservation = async (usuario_id: string, libro_id: number) => {
  const { data, error } = await supabase
    .from('reservas')
    .insert([
      { usuario_id, libro_id, estado: 'pendiente' }
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating reservation:', error);
    throw error;
  }

  return data;
};



export const getPendingReservationsCount = async (): Promise<number> => {
  const { count, error } = await supabase
    .from('reservas')
    .select('*', { count: 'exact', head: true })
    .eq('estado', 'pendiente');

  if (error) {
    console.error('Error fetching pending reservations count:', error);
    return 0;
  }
  return count || 0;
};

export const getReservations = async ({ page, limit }: { page?: number; limit?: number } = {}) => {
  let query = supabase
    .from('reservas')
    .select(`
      *,
      usuario:usuarios!usuario_id (
        id,
        email,
        nombre_completo
      ),
      libro:libros (
        id,
        titulo,
        legacy_id,
        stock,
        imagen_url
      )
    `, { count: 'exact' });

  if (page && limit) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);
  }

  const { data, error, count } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching reservations:', error);
    throw error;
  }
  return { data: data || [], count: count || 0 };
};

export const updateReservationStatus = async (id: number, estado: 'confirmada' | 'rechazada' | 'expirada') => {
  const { data, error } = await supabase
    .from('reservas')
    .update({ estado })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating reservation status:', error);
    throw error;
  }
  return data;
};

export const getUserReservations = async (
  userId: string,
  page: number = 1,
  limit: number = 10
): Promise<{ data: Reserva[]; count: number }> => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabase
    .from('reservas')
    .select(`
      *,
      libro:libros (
        id,
        titulo,
        autor,
        anio,
        imagen_url,
        editorial:editoriales(nombre)
      )
    `, { count: 'exact' })
    .eq('usuario_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Error fetching user reservations:', error);
    throw error;
  }
  
  return { data: data || [], count: count || 0 };
};

export const confirmReservation = async (
  reservationId: number, 
  expirationDate: string,
  adminId: string
): Promise<void> => {
  const { error } = await supabase
    .from('reservas')
    .update({
      estado: 'confirmada',
      fecha_expiracion: expirationDate,
      confirmado_por: adminId,
      fecha_confirmacion: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', reservationId);

  if (error) {
    console.error('Error confirming reservation:', error);
    throw error;
  }
};

export const rejectReservation = async (
  reservationId: number,
  adminId: string
): Promise<void> => {
  
  const { data, error } = await supabase
    .from('reservas')
    .update({
      estado: 'rechazada',
      rechazado_por: adminId,
      fecha_rechazo: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', reservationId)
    .select();

  if (error) {
    console.error('Error rejecting reservation:', error);
    throw error;
  }
};

export const markAsDelivered = async (
  reservationId: number,
  adminId: string
): Promise<void> => {
  
  const { data, error } = await supabase
    .from('reservas')
    .update({
      estado: 'entregada',
      confirmado_por: adminId,
      updated_at: new Date().toISOString()
    })
    .eq('id', reservationId)
    .select();

  if (error) {
    console.error('Error marking reservation as delivered:', error);
    throw error;
  }
};

export const markAsReturned = async (
  reservationId: number,
  adminId: string
): Promise<void> => {
  
  const { data, error } = await supabase
    .from('reservas')
    .update({
      estado: 'devuelta',
      rechazado_por: adminId,
      updated_at: new Date().toISOString()
    })
    .eq('id', reservationId)
    .select();

  if (error) {
    console.error('Error marking reservation as returned:', error);
    throw error;
  }
};

export const cancelReservation = async (
  reservationId: number,
  userId: string
): Promise<void> => {
  
  const { data, error } = await supabase
    .from('reservas')
    .update({
      estado: 'cancelada',
      updated_at: new Date().toISOString()
    })
    .eq('id', reservationId)
    .eq('usuario_id', userId) // Ensure user can only cancel their own reservations
    .eq('estado', 'pendiente') // Only allow canceling pending reservations
    .select();

  if (error) {
    console.error('Error canceling reservation:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error('No se puede cancelar esta reserva. Solo las reservas pendientes pueden ser canceladas.');
  }
};
