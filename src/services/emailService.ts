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
  emailType: 'order_confirmation' | 'payment_ready';
  orderId: string;
  customerEmail: string;
  customerName: string;
  items?: Array<{
    title: string;
    quantity: number;
    price: number;
  }>;
  subtotal?: number;
  tax?: number;
  taxRate?: number;
  shipping?: number;
  total: number;
  shippingAddress?: string;
  paymentUrl?: string;
}

/**
 * Send order confirmation email to customer
 * @param orderData Order details for email
 * @returns Promise with success status
 */
export const sendOrderConfirmationEmail = async (orderData: Omit<OrderEmailData, 'emailType'>): Promise<EmailResult> => {
  try {
    const emailData: OrderEmailData = { ...orderData, emailType: 'order_confirmation' };
    const { data, error } = await supabase.functions.invoke('send-order-email', {
      body: { orderData: emailData }
    });

    if (error) {
      console.error('❌ Error invoking send-order-email function:', error);
      return { success: false, error: error.message };
    }

    if (!data?.success) {
      console.error('❌ Email sending failed:', data?.error);
      return { success: false, error: data?.error || 'Unknown error' };
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

    const { data, error } = await supabase.functions.invoke('send-order-email', {
      body: { orderData: emailData }
    });

    if (error) {
      console.error('❌ Error invoking send-payment-ready-email function:', error);
      return { success: false, error: error.message };
    }

    if (!data?.success) {
      console.error('❌ Email sending failed:', data?.error);
      return { success: false, error: data?.error || 'Unknown error' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('❌ Exception sending payment ready email:', error);
    return { success: false, error: error.message };
  }
};
