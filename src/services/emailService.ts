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
