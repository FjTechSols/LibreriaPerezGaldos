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

// Get unread orders count
export const getUnreadOrdersCount = async (userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('notificaciones')
    .select('*', { count: 'exact', head: true })
    .eq('usuario_id', userId)
    .eq('leida', false)
    .in('tipo', ['pedido', 'nuevo_pedido']);
  
  if (error) throw error;
  return count || 0;
};

// Get unread reservations count
export const getUnreadReservationsCount = async (userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('notificaciones')
    .select('*', { count: 'exact', head: true })
    .eq('usuario_id', userId)
    .eq('leida', false)
    .in('tipo', ['reserva_creada', 'reserva_cancelada']);
  
  if (error) throw error;
  return count || 0;
};

// Get unread invoices count
export const getUnreadInvoicesCount = async (userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('notificaciones')
    .select('*', { count: 'exact', head: true })
    .eq('usuario_id', userId)
    .eq('leida', false)
    .eq('tipo', 'factura');
  
  if (error) throw error;
  return count || 0;
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

export const createAdminOrderNotification = async (
  orderId: number, 
  clientName: string,
  username: string = 'Usuario',
  source: string = 'Desconocido',
  status: string = 'pendiente',
  userIdDisplay: string = '',
  itemsSummary: string = ''
): Promise<void> => {
  try {
    // 1. Get all users with admin role (rol_id = 1 is standard admin, check if there are others)
    const { data: admins, error: adminError } = await supabase
      .from('usuarios')
      .select('id')
      .in('rol_id', [1, 2]); // Assuming 1=SuperAdmin, 2=Admin
    
    if (adminError) throw adminError;
    if (!admins?.length) return;

    // Custom formatting based on Source
    let title = 'Nuevo Pedido';
    let message = '';
    const formattedSource = source === 'interno' ? 'Cliente Web' : source.replace('_', ' ').toUpperCase();

    if (source === 'interno') {
       title = 'Nueva Compra Solicitada';
       // "El usuario (id y username) ha realizado la solicitud de la compra..."
       // We append "del libro" only if itemsSummary doesn't already allow for it contextually, but user asked for it.
       // "solicitud de la compra (titulo y legacy_id) del libro."
       message = `El usuario (${userIdDisplay} - ${username}) ha realizado la solicitud de la compra ${itemsSummary} del libro.`;
    } else {
       // Standard/Manual format
       message = `El usuario ${username} ha creado un nuevo pedido #${orderId} (${formattedSource}). Estado: ${status}`;
    }

    const notifications = admins.map(admin => ({
      usuario_id: admin.id,
      tipo: 'pedido', // Keeping 'pedido' type for icon/filtering logic
      titulo: title,
      mensaje: message
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

export const createAdminReservationNotification = async (
  reservationId: number,
  userName: string,
  bookTitle: string
): Promise<void> => {
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
      tipo: 'reserva_creada',
      titulo: 'Nueva Reserva',
      mensaje: `Nueva solicitud de reserva: ${userName} ha reservado "${bookTitle}"`,
      reserva_id: reservationId
    }));

    const { error } = await supabase
      .from('notificaciones')
      .insert(notifications);

    if (error) {
      console.error('Error creating admin reservation notifications:', error);
    }
  } catch (error) {
    console.error('Error in createAdminReservationNotification:', error);
  }
};
