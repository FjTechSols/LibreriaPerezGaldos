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
  orderId: string;
  customerEmail: string;
  customerName: string;
  items: Array<{
    title: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  tax: number;
  taxRate: number;
  shipping: number;
  total: number;
  shippingAddress: string;
}

/**
 * Send order confirmation email to customer
 * @param orderData Order details for email
 * @returns Promise with success status
 */
export const sendOrderConfirmationEmail = async (orderData: OrderEmailData): Promise<EmailResult> => {
  try {
    console.log('📧 Sending order confirmation email to:', orderData.customerEmail);

    const { data, error } = await supabase.functions.invoke('send-order-email', {
      body: { orderData }
    });

    if (error) {
      console.error('❌ Error invoking send-order-email function:', error);
      return { success: false, error: error.message };
    }

    if (!data?.success) {
      console.error('❌ Email sending failed:', data?.error);
      return { success: false, error: data?.error || 'Unknown error' };
    }

    console.log('✅ Order confirmation email sent successfully. Email ID:', data.emailId);
    return { success: true };

  } catch (error: any) {
    console.error('❌ Exception sending order confirmation email:', error);
    return { success: false, error: error.message };
  }
};

