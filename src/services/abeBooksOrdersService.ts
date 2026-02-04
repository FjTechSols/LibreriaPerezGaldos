import { supabase } from '../lib/supabase';

// Tipos para pedidos de AbeBooks
export interface AbeBooksOrder {
  orderId: string;
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
 * Fetch orders from AbeBooks API
 */
export async function fetchAbeBooksOrders(filters?: AbeBooksOrderFilters): Promise<AbeBooksOrder[]> {
  // TEMPORARY: Use mock data due to AbeBooks API timeout issues
  const USE_MOCK_DATA = true; // Set to false when AbeBooks API is working
  
  if (USE_MOCK_DATA) {
    console.log('⚠️ Using MOCK data for IberLibro orders');
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(getMockOrders());
      }, 1000);
    });
  }

  try {
    // Call Supabase Edge Function que actúa como proxy a AbeBooks API
    console.log('🔵 Calling fetch-abebooks-orders Edge Function with filters:', filters);
    
    const { data, error } = await supabase.functions.invoke('fetch-abebooks-orders', {
      body: { filters }
    });

    console.log('🔵 Edge Function response:', { data, error });

    if (error) {
      console.error('❌ Error fetching AbeBooks orders:', error);
      throw new Error(error.message || 'Error al obtener pedidos de AbeBooks');
    }

    if (data?.error) {
      console.error('❌ AbeBooks API error:', data.error);
      // Return empty array instead of throwing to show empty state
      return [];
    }

    const orders = data?.orders || [];
    console.log(`✅ Received ${orders.length} orders from AbeBooks`);
    
    return orders;
  } catch (err: any) {
    console.error('💥 Exception in fetchAbeBooksOrders:', err);
    throw err;
  }
}

// Mock data for testing
function getMockOrders(): AbeBooksOrder[] {
  return [
    {
      orderId: '1001',
      abeBooksOrderId: 'ABE-2024-001',
      orderDate: '2024-02-01T10:30:00Z',
      status: 'New',
      customer: {
        name: 'Juan García Martínez',
        address: 'Calle Mayor 123, 3°A',
        city: 'Madrid',
        postalCode: '28013',
        country: 'Spain',
        phone: '+34 600123456',
        email: 'juan.garcia@example.com'
      },
      items: [
        {
          sku: '02008403',
          title: 'Cien Años de Soledad',
          author: 'Gabriel García Márquez',
          quantity: 1,
          price: 25.50
        }
      ],
      subtotal: 25.50,
      shippingCost: 5.00,
      total: 30.50,
      estimatedDelivery: '2024-02-10',
    },
    {
      orderId: '1002',
      abeBooksOrderId: 'ABE-2024-002',
      orderDate: '2024-02-02T14:15:00Z',
      status: 'Acknowledged',
      customer: {
        name: 'María López Fernández',
        address: 'Avenida de la Constitución 45',
        city: 'Barcelona',
        postalCode: '08001',
        country: 'Spain',
        phone: '+34 611234567'
      },
      items: [
        {
          sku: '02273892',
          title: 'Don Quijote de la Mancha',
          author: 'Miguel de Cervantes',
          quantity: 2,
          price: 18.00
        },
        {
          sku: '02008404',
          title: 'La Regenta',
          author: 'Leopoldo Alas Clarín',
          quantity: 1,
          price: 22.00
        }
      ],
      subtotal: 58.00,
      shippingCost: 7.50,
      total: 65.50,
      trackingNumber: 'ES123456789',
    },
    {
      orderId: '1003',
      abeBooksOrderId: 'ABE-2024-003',
      orderDate: '2024-02-03T09:00:00Z',
      status: 'Shipped',
      customer: {
        name: 'Carlos Rodríguez Sánchez',
        address: 'Plaza España 10',
        city: 'Valencia',
        postalCode: '46001',
        country: 'Spain',
        phone: '+34 622345678',
        email: 'carlos.rodriguez@example.com'
      },
      items: [
        {
          sku: '02008405',
          title: 'Fortunata y Jacinta',
          author: 'Benito Pérez Galdós',
          quantity: 1,
          price: 32.00
        }
      ],
      subtotal: 32.00,
      shippingCost: 6.00,
      total: 38.00,
      estimatedDelivery: '2024-02-08',
      trackingNumber: 'ES987654321',
    },
    {
      orderId: '1004',
      abeBooksOrderId: 'ABE-2024-004',
      orderDate: '2024-01-28T16:45:00Z',
      status: 'Cancelled',
      customer: {
        name: 'Ana Martínez González',
        address: 'Calle Real 67',
        city: 'Sevilla',
        postalCode: '41001',
        country: 'Spain',
        phone: '+34 633456789'
      },
      items: [
        {
          sku: '02008406',
          title: 'La Casa de Bernarda Alba',
          author: 'Federico García Lorca',
          quantity: 1,
          price: 15.00
        }
      ],
      subtotal: 15.00,
      shippingCost: 4.50,
      total: 19.50,
    }
  ];
}


/**
 * Get detailed information for a specific order
 */
export async function getAbeBooksOrderDetails(abeBooksOrderId: string): Promise<AbeBooksOrder | null> {
  try {
    const { data, error } = await supabase.functions.invoke('fetch-abebooks-orders', {
      body: { orderId: abeBooksOrderId }
    });

    if (error) {
      console.error('Error fetching order details:', error);
      throw new Error(error.message || 'Error al obtener detalles del pedido');
    }

    return data?.order || null;
  } catch (err: any) {
    console.error('Exception in getAbeBooksOrderDetails:', err);
    throw err;
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
