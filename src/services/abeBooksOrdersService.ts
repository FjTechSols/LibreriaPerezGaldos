import { supabase } from '../lib/supabase';

// Tipos para pedidos de AbeBooks
export interface AbeBooksOrder {
  abeBooksOrderId: string;
  orderDate: string;
  status: AbeBooksOrderStatus;
  customer: {
    name: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
    phone?: string;
    email?: string;
  };
  items: Array<{
    sku: string;
    title: string;
    author: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  shippingCost: number;
  total: number;
  estimatedDelivery?: string;
  trackingNumber?: string;
}

export type AbeBooksOrderStatus = 'New' | 'Acknowledged' | 'Shipped' | 'Cancelled';

export interface AbeBooksOrderFilters {
  status?: AbeBooksOrderStatus | '';
  startDate?: string;
  endDate?: string;
}

// Mapeo de estados AbeBooks a español
export const ABEBOOKS_STATUS_LABELS: Record<AbeBooksOrderStatus, string> = {
  'New': 'Nuevo',
  'Acknowledged': 'Confirmado',
  'Shipped': 'Enviado',
  'Cancelled': 'Cancelado'
};

/**
 * Fetch orders from Local Cache (Supabase Table)
 * This is instant and avoids timeouts
 */
export async function fetchAbeBooksOrders(filters?: AbeBooksOrderFilters): Promise<AbeBooksOrder[]> {
  try {
    let query = supabase
      .from('abebooks_orders_cache')
      .select('*')
      .order('order_date', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.startDate) {
      query = query.gte('order_date', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('order_date', filters.endDate);
    }
    
    if (!filters?.startDate && !filters?.endDate) {
        query = query.limit(50);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching AbeBooks orders from CACHE:', error);
      throw error;
    }

    // Map snake_case DB columns to camelCase Interface
    return (data || []).map((row: any) => ({
        abeBooksOrderId: row.abebooks_order_id,
        orderDate: row.order_date,
        status: row.status,
        customer: row.customer,
        items: row.items,
        total: row.total,
        subtotal: row.subtotal,
        shippingCost: row.shipping_cost,
        estimatedDelivery: row.estimated_delivery,
        trackingNumber: row.tracking_number,
        // orderId not stored in cache separately? It's same as abeBooksOrderId usually or internal. 
        // Interface has both orderId and abeBooksOrderId.
        // We'll map orderId = abeBooksOrderId for now.
        orderId: row.abebooks_order_id 
    }));
  } catch (err: any) {
    console.error('💥 Exception in fetchAbeBooksOrders:', err);
    throw err;
  }
}

/**
 * Trigger Background Sync
 * Calls Edge Function to fetch from AbeBooks API and update Cache Table
 */
export async function syncAbeBooksOrders(filters?: AbeBooksOrderFilters): Promise<{ success: boolean; message?: string }> {
    try {
        console.log('🔄 Triggering AbeBooks Order Sync with filters:', filters);
        
        // Prepare body with filters if they exist
        const body: any = {};
        if (filters) {
            body.filters = {};
            if (filters.status) body.filters.status = filters.status;
            if (filters.startDate) body.filters.startDate = filters.startDate;
            if (filters.endDate) body.filters.endDate = filters.endDate;
        }

        console.log('📡 Calling Edge Function...');
        const { data, error } = await supabase.functions.invoke('fetch-abebooks-orders', {
            body: body
        });

        console.log('📥 Edge Function Response:', { data, error });

        if (error) {
            console.error('❌ Edge Function Error:', error);
            throw error;
        }
        
        if (data?.error) {
            console.error('❌ API Error:', data.error);
            throw new Error(data.error);
        }

        console.log('✅ Sync completed:', data);
        return { success: true, message: data?.message || `Synced ${data?.synced || 0} orders` };
    } catch (error: any) {
        console.error('❌ Sync failed:', error);
        throw error;
    }
}

/**
 * Format date for display
 */
export function formatAbeBooksDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

/**
 * Get status badge class
 */
export function getStatusBadgeClass(status: AbeBooksOrderStatus): string {
  const classMap: Record<AbeBooksOrderStatus, string> = {
    'New': 'warning',
    'Acknowledged': 'info',
    'Shipped': 'success',
    'Cancelled': 'danger'
  };
  return classMap[status] || 'default';
}
