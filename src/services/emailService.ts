import { supabase } from '../lib/supabase';

export interface EmailResult {
  success: boolean;
  error?: string;
}

export const sendInvoiceEmail = async (invoiceId: number): Promise<EmailResult> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.warn('Usuario no autenticado al intentar enviar email');
      // We might allow anonymous sending depending on backend policy, but usually auth is required
    }

    // Call the Edge Function 'send-invoice-email'
    const { error } = await supabase.functions.invoke('send-invoice-email', {
      body: { invoice_id: invoiceId },
    });

    if (error) {
      console.error('Error invocando send-invoice-email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Excepción en sendInvoiceEmail:', error);
    return { success: false, error: 'Error inesperado al enviar el email' };
  }
};

export const sendReservationEmail = async (
  reservationId: number,
  type: 'confirmed' | 'rejected'
): Promise<EmailResult> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.warn('Usuario no autenticado al intentar enviar email de reserva');
    }

    // Call the Edge Function 'send-reservation-email'
    const { error } = await supabase.functions.invoke('send-reservation-email', {
      body: { reservation_id: reservationId, type },
    });

    if (error) {
      console.error('Error invocando send-reservation-email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Excepción en sendReservationEmail:', error);
    return { success: false, error: 'Error inesperado al enviar el email' };
  }
};

export interface OrderEmailData {
  emailType: 'order_confirmation' | 'payment_ready' | 'payment_confirmed' | 'shipped' | 'completed' | 'store_order_registered' | 'store_order_processing' | 'store_order_shipped';
  orderId: string;
  customerEmail: string;
  customerName: string;
  items?: Array<{
    title: string;
    quantity: number;
    price: number;
    author?: string;
    ref?: string;
  }>;
  subtotal?: number;
  tax?: number;
  taxRate?: number;
  shipping?: number;
  total: number;
  shippingAddress?: string;
  paymentUrl?: string;
  carrier?: string;
  trackingNumber?: string;
  storeName?: string;
}

/**
 * Send order confirmation email to customer
 * @param orderData Order details for email
 * @returns Promise with success status
 */
export const sendOrderConfirmationEmail = async (orderData: Omit<OrderEmailData, 'emailType'>): Promise<EmailResult> => {
  try {
    const emailData: OrderEmailData = { ...orderData, emailType: 'order_confirmation' };
    const { error } = await supabase.functions.invoke('send-order-email', {
      body: { orderData: emailData }
    });

    if (error) {
      console.error('❌ Error invoking send-order-email function:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('❌ Exception sending order confirmation email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send payment ready email to customer
 * @param orderId Order ID
 * @param customerEmail Customer email address
 * @param customerName Customer name
 * @param total Total amount to pay
 * @param paymentUrl URL to payment page
 * @returns Promise with success status
 */
export const sendPaymentReadyEmail = async (
  orderId: string,
  customerEmail: string,
  customerName: string,
  total: number,
  paymentUrl: string
): Promise<EmailResult> => {
  try {
    const emailData: OrderEmailData = {
      emailType: 'payment_ready',
      orderId,
      customerEmail,
      customerName,
      total,
      paymentUrl
    };

    const { error } = await supabase.functions.invoke('send-order-email', {
      body: { orderData: emailData }
    });

    if (error) {
      console.error('❌ Error invoking send-payment-ready-email function:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('❌ Exception sending payment ready email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send payment confirmed email (Procesando)
 */
export const sendPaymentConfirmedEmail = async (
  orderId: string,
  customerEmail: string,
  customerName: string,
  total: number
): Promise<EmailResult> => {
  try {
    const emailData: OrderEmailData = {
      emailType: 'payment_confirmed',
      orderId,
      customerEmail,
      customerName,
      total
    };

    const { error } = await supabase.functions.invoke('send-order-email', {
      body: { orderData: emailData }
    });

    if (error) {
      console.error('❌ Error sending payment confirmed email:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Send shipped email (Enviado)
 */
export const sendShippedEmail = async (
  orderId: string,
  customerEmail: string,
  customerName: string,
  total: number,
  carrier: string,
  trackingNumber: string
): Promise<EmailResult> => {
  try {
    const emailData: OrderEmailData = {
      emailType: 'shipped',
      orderId,
      customerEmail,
      customerName,
      total,
      carrier,
      trackingNumber
    };

    const { error } = await supabase.functions.invoke('send-order-email', {
      body: { orderData: emailData }
    });

    if (error) {
      console.error('❌ Error sending shipped email:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Send completed email (Completado)
 */
export const sendCompletedEmail = async (
  orderId: string,
  customerEmail: string,
  customerName: string,
  total: number
): Promise<EmailResult> => {
  try {
    const emailData: OrderEmailData = {
      emailType: 'completed',
      orderId,
      customerEmail,
      customerName,
      total
    };

    const { error } = await supabase.functions.invoke('send-order-email', {
      body: { orderData: emailData }
    });

    if (error) {
      console.error('❌ Error sending completed email:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Send store order registered email (Pedido Registrado)
 */
export const sendStoreOrderRegisteredEmail = async (
  orderId: string,
  customerEmail: string,
  customerName: string,
  total: number,
  items: Array<{ title: string; quantity: number; price: number; author?: string; ref?: string }>,
  storeName: string
): Promise<EmailResult> => {
  try {
    const emailData: OrderEmailData = {
      emailType: 'store_order_registered',
      orderId,
      customerEmail,
      customerName,
      total,
      items,
      storeName
    };

    const { error } = await supabase.functions.invoke('send-order-email', {
      body: { orderData: emailData }
    });

    if (error) {
      console.error('❌ Error sending store order registered email:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Send store order processing email (Procesando)
 */
export const sendStoreOrderProcessingEmail = async (
  orderId: string,
  customerEmail: string,
  customerName: string,
  total: number,
  items: Array<{ title: string; quantity: number; price: number; author?: string; ref?: string }>,
  storeName: string
): Promise<EmailResult> => {
  try {
    const emailData: OrderEmailData = {
      emailType: 'store_order_processing',
      orderId,
      customerEmail,
      customerName,
      total,
      items,
      storeName
    };

    const { error } = await supabase.functions.invoke('send-order-email', {
      body: { orderData: emailData }
    });

    if (error) {
      console.error('❌ Error sending store order processing email:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Send store order shipped email (En camino a librería)
 */
export const sendStoreOrderShippedEmail = async (
  orderId: string,
  customerEmail: string,
  customerName: string,
  total: number,
  storeName: string,
  carrier?: string,
  trackingNumber?: string
): Promise<EmailResult> => {
  try {
    const emailData: OrderEmailData = {
      emailType: 'store_order_shipped',
      orderId,
      customerEmail,
      customerName,
      total,
      storeName,
      carrier,
      trackingNumber
    };

    const { error } = await supabase.functions.invoke('send-order-email', {
      body: { orderData: emailData }
    });

    if (error) {
      console.error('❌ Error sending store order shipped email:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

