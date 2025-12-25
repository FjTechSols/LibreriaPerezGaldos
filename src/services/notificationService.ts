import { supabase } from '../lib/supabase';
import { Notificacion } from '../types';

export const createNotification = async (
  userId: string,
  type: Notificacion['tipo'],
  title: string,
  message: string,
  reservationId?: number
): Promise<void> => {
  const { error } = await supabase
    .from('notificaciones')
    .insert([{
      usuario_id: userId,
      tipo: type,
      titulo: title,
      mensaje: message,
      reserva_id: reservationId
    }]);

  if (error) throw error;
};

export const getUserNotifications = async (userId: string): Promise<Notificacion[]> => {
  const { data, error } = await supabase
    .from('notificaciones')
    .select('*')
    .eq('usuario_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const getUnreadCount = async (userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('notificaciones')
    .select('*', { count: 'exact', head: true })
    .eq('usuario_id', userId)
    .eq('leida', false);

  if (error) throw error;
  return count || 0;
};

export const markAsRead = async (notificationId: number): Promise<void> => {
  const { error } = await supabase
    .from('notificaciones')
    .update({ leida: true })
    .eq('id', notificationId);

  if (error) throw error;
};

export const markAllAsRead = async (userId: string): Promise<void> => {
  const { error } = await supabase
    .from('notificaciones')
    .update({ leida: true })
    .eq('usuario_id', userId)
    .eq('leida', false);

  if (error) throw error;
};

export const getAdminNotifications = async (userId: string): Promise<Notificacion[]> => {
  const { data, error } = await supabase
    .from('notificaciones')
    .select('*')
    .eq('usuario_id', userId)
    .in('tipo', ['pedido', 'nuevo_pedido', 'reserva_creada', 'reserva_cancelada'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const getAdminUnreadCount = async (userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('notificaciones')
    .select('*', { count: 'exact', head: true })
    .eq('usuario_id', userId)
    .eq('leida', false)
    .in('tipo', ['pedido', 'nuevo_pedido', 'reserva_creada', 'reserva_cancelada']);

  if (error) throw error;
  return count || 0;
};

export const getAdminUnreadNotifications = async (userId: string): Promise<Notificacion[]> => {
  const { data, error } = await supabase
    .from('notificaciones')
    .select('*')
    .eq('usuario_id', userId)
    .eq('leida', false)
    .in('tipo', ['pedido', 'nuevo_pedido', 'reserva_creada', 'reserva_cancelada']);

  if (error) throw error;
  return data || [];
};

export const markAllAdminNotificationsAsRead = async (userId: string): Promise<void> => {
  const { error } = await supabase
    .from('notificaciones')
    .update({ leida: true })
    .eq('usuario_id', userId)
    .eq('leida', false)
    .in('tipo', ['pedido', 'nuevo_pedido', 'reserva_creada', 'reserva_cancelada']);

  if (error) throw error;
};

export const createAdminOrderNotification = async (orderId: number, clientName: string): Promise<void> => {
  try {
    // 1. Get all users with admin role (rol_id = 1 is standard admin, check if there are others)
    const { data: admins, error: adminError } = await supabase
      .from('usuarios')
      .select('id')
      .in('rol_id', [1, 2]); // Assuming 1=SuperAdmin, 2=Admin
    
    if (adminError) throw adminError;
    if (!admins?.length) return;

    const notifications = admins.map(admin => ({
      usuario_id: admin.id,
      tipo: 'pedido',
      titulo: 'Nuevo Pedido',
      mensaje: `Nuevo pedido #${orderId} recibido de ${clientName}`
    }));

    const { error } = await supabase
      .from('notificaciones')
      .insert(notifications);

    if (error) {
      console.error('Error creating admin notifications:', error);
    }
  } catch (error) {
    console.error('Error in createAdminOrderNotification:', error);
  }
};

export const createOrderNotification = async (userId: string, orderId: number, status: string = 'pendiente'): Promise<void> => {
  try {
    const { error } = await supabase
      .from('notificaciones')
      .insert([{
        usuario_id: userId,
        tipo: 'pedido',
        titulo: 'Pedido Realizado',
        mensaje: `Tu pedido #${orderId} se ha creado correctamente y está en estado: ${status}.`
      }]);

    if (error) throw error;
  } catch (error) {
    console.error('Error creating user order notification:', error);
  }
};

