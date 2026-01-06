import { supabase } from '../lib/supabase';

export class StripeService {
  private readonly functionUrl: string;

  constructor() {
    this.functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
  }

  async createPaymentIntent(amount: number, metadata?: Record<string, string>) {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Usuario no autenticado');
      }

      const response = await fetch(`${this.functionUrl}/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          amount,
          currency: 'eur',
          metadata,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear payment intent');
      }

      const data = await response.json();
      return {
        clientSecret: data.clientSecret,
        paymentIntentId: data.paymentIntentId,
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  async checkPaymentStatus(paymentIntentId: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Usuario no autenticado');
      }

      const response = await fetch(`${this.functionUrl}/check-payment-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ paymentIntentId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al verificar estado del pago');
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking payment status:', error);
      throw error;
    }
  }
}

export const stripeService = new StripeService();
