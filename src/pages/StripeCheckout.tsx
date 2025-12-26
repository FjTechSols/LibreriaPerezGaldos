import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { StripePaymentForm } from '../components/StripePaymentForm';
import { getStripe } from '../lib/stripe';
import { supabase } from '../lib/supabase';
import { stripeService } from '../services/stripeService';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';
import { crearPedido, confirmOrderAndDeductStock } from '../services/pedidoService';
import { findOrCreateCliente } from '../services/clienteService';
import { ArrowLeft } from 'lucide-react';
import '../styles/components/StripePaymentForm.css';
import '../styles/pages/StripeCheckout.css';

import { useTheme } from '../context/ThemeContext';
import { CheckoutData } from '../components/CheckoutForm';

interface StripeCheckoutState {
  checkoutData: CheckoutData;
  shippingMethod: 'standard' | 'express';
  shippingCost: number;
  subtotal: number;
  taxAmount: number;
  orderTotal: number;
  direccionCompleta: string;
  cartItems: any[];
}

export default function StripeCheckout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { clearCart } = useCart();
  const { user } = useAuth();
  const { actualTheme } = useTheme();
  const { t } = useLanguage();
  const { settings } = useSettings();

  // Extract state passed from Cart
  const state = location.state as StripeCheckoutState | undefined;

  const [clientSecret, setClientSecret] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!user || !state || !state.cartItems || state.cartItems.length === 0) {
      navigate('/carrito');
      return;
    }

    initializePayment();
  }, []);

  const initializePayment = async () => {
    try {
      setIsLoading(true);

      if (!state) {
        throw new Error('No checkout data found');
      }

      // Create payment intent WITHOUT creating the order
      const { clientSecret: secret } = await stripeService.createPaymentIntent(
        state.orderTotal,
        {
          cliente_email: state.checkoutData.email,
          cliente_nombre: `${state.checkoutData.nombre} ${state.checkoutData.apellidos}`,
        }
      );

      setClientSecret(secret);
    } catch (err) {
      console.error('Error initializing payment:', err);
      setError(err instanceof Error ? err.message : 'Error al inicializar el pago');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    try {
      if (!state) throw new Error("Checkout data not found");

      // NOW create the order after successful payment
      const cliente = await findOrCreateCliente({
        nombre: state.checkoutData.nombre,
        apellidos: state.checkoutData.apellidos,
        email: state.checkoutData.email,
        telefono: state.checkoutData.telefono,
        direccion: state.checkoutData.direccion,
        ciudad: state.checkoutData.ciudad,
        codigo_postal: state.checkoutData.codigo_postal,
        provincia: state.checkoutData.provincia,
        pais: state.checkoutData.pais,
        tipo: 'particular'
      });

      const detalles = state.cartItems.map(item => ({
        libro_id: parseInt(item.book.id),
        cantidad: item.quantity,
        precio_unitario: item.book.price
      }));

      // Fetch PaymentIntent to get the actual payment method used
      let actualPaymentMethod = 'tarjeta'; // Default to card
      try {
        const { data: paymentIntent, error: piError } = await supabase.functions.invoke('get-payment-intent', {
          body: { paymentIntentId }
        });

        if (!piError && paymentIntent) {
          const paymentMethodType = paymentIntent.payment_method_types?.[0];
          
          if (paymentMethodType === 'sepa_debit' || 
              paymentMethodType === 'customer_balance' || 
              paymentMethodType === 'bank_transfer') {
            actualPaymentMethod = 'transferencia';
          }
        }
      } catch (pmError) {
        console.warn('Could not fetch payment method type, defaulting to tarjeta:', pmError);
      }

      const pedido = await crearPedido({
        usuario_id: user!.id,
        cliente_id: cliente.id,
        tipo: 'interno',
        metodo_pago: actualPaymentMethod,
        direccion_envio: state.direccionCompleta,
        transportista: state.shippingMethod === 'standard' ? 'Correos (Estándar)' : 'Mensajería (Express)',
        coste_envio: state.shippingCost,
        observaciones: state.checkoutData.observaciones || undefined,
        taxRate: settings.billing.taxRate / 100,
        detalles
      });

      if (!pedido) {
        throw new Error('Error al crear el pedido después del pago.');
      }

      // Use the ATOMIC function that deducts stock and confirms order
      const result = await confirmOrderAndDeductStock(pedido.id);

      if (!result.success) {
        console.error("Stock deduction failed:", result.error);
        alert("Pago recibido, pero hubo un error actualizando el stock. Por favor guarda este ID de pedido: " + pedido.id);
      }

      clearCart();
      
      navigate('/pago-completado', {
        state: {
          pedidoId: pedido.id,
          paymentIntentId,
          total: state.orderTotal,
        },
      });
    } catch (err) {
      console.error('Error creating order after payment:', err);
      setError("Error al confirmar el pedido. Por favor contacte soporte con el ID de pago: " + paymentIntentId);
    }
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
  };

  if (isLoading) {
    return (
      <div className="stripe-checkout-container">
        <div className="loading-state">
          <div className="spinner-large"></div>
          <p>{t('preparingPayment')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stripe-checkout-container">
        <div className="error-state">
          <h2>{t('errorProcessingPayment')}</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/carrito')} className="btn-back">
            <ArrowLeft size={18} />
            {t('backToCart')}
          </button>
        </div>
      </div>
    );
  }

  const stripePromise = getStripe();

  if (!stripePromise || !clientSecret) {
    return (
      <div className="stripe-checkout-container">
        <div className="error-state">
          <h2>{t('configurationError')}</h2>
          <p>{t('couldNotLoadPaymentSystem')}</p>
          <button onClick={() => navigate('/carrito')} className="btn-back">
            <ArrowLeft size={18} />
            {t('backToCart')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="stripe-checkout-container">
      <div className="checkout-content-grid">
        <div className="checkout-sidebar">
          <div className="checkout-header">
            <button onClick={() => navigate('/carrito')} className="btn-back-small">
              <ArrowLeft size={18} />
              {t('backButton')}
            </button>
            <h1>{t('finalizePayment')}</h1>
          </div>

          <div className="checkout-info">
            <h3>{t('orderSummary')}</h3>
            <div className="order-items">
              {state?.cartItems.map(item => (
                <div key={item.book.id} className="order-item">
                  <span>{item.book.title}</span>
                  <span>
                    {item.quantity} x €{(item.book.price || 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="order-summary-details">
              <div className="summary-detail-row">
                <span className="summary-label">{t('subtotalLabel')}:</span>
                <span className="summary-value">€{state?.subtotal.toFixed(2)}</span>
              </div>
              <div className="summary-detail-row">
                <span className="summary-label">{t('shipping')}:</span>
                <span className="summary-value">{state?.shippingCost ? `€${state.shippingCost.toFixed(2)}` : t('freeLabel')}</span>
              </div>
              <div className="summary-detail-row">
                <span className="summary-label">{t('iva')}:</span>
                <span className="summary-value">€{state?.taxAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="order-total" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid #eee' }}>
              <strong>{t('checkoutTotal')}:</strong>
              <strong>€{state?.orderTotal.toFixed(2)}</strong>
            </div>
          </div>
        </div>

        <div className="checkout-main">
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: actualTheme === 'dark' ? 'night' : 'stripe',
                variables: {
                  colorPrimary: '#2563eb',
                },
              },
            }}
            key={actualTheme}
          >
            <StripePaymentForm
              amount={state?.orderTotal || 0}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          </Elements>
        </div>
      </div>
    </div>
  );
}
