import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { StripePaymentForm } from '../components/StripePaymentForm';
import { getStripe } from '../lib/stripe';
import { stripeService } from '../services/stripeService';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { confirmOrderAndDeductStock } from '../services/pedidoService';
import { ArrowLeft } from 'lucide-react';
import '../styles/components/StripePaymentForm.css';

export default function StripeCheckout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  
  // Extract state passed from Cart
  const state = location.state as { orderId: number; clientEmail: string; clientName: string } | undefined;
  const orderId = state?.orderId;

  const [clientSecret, setClientSecret] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!user || items.length === 0) {
      navigate('/carrito');
      return;
    }

    if (!orderId) {
       console.error("No Order ID found in state. Redirecting to cart.");
       navigate('/carrito');
       return;
    }

    initializePayment();
  }, [orderId]);

  const initializePayment = async () => {
    try {
      setIsLoading(true);

      // We skip creating order here. It is already created in Cart.tsx
      // We just create the payment intent using the existing orderId.
      
      const { clientSecret: secret } = await stripeService.createPaymentIntent(
        total,
        {
          pedido_id: orderId!.toString(),
          cliente_email: state?.clientEmail || '',
          cliente_nombre: state?.clientName || '',
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
        if (!orderId) throw new Error("Order ID not found during success handling");

        // Use the new ATOMIC function that deducts stock and confirms order
        const result = await confirmOrderAndDeductStock(orderId);

        if (!result.success) {
            console.error("Stock deduction failed:", result.error);
            // Alert user about the discrepancy but allow completion flow
            alert("Pago recibido, pero hubo un error actualizando el stock. Por favor guarda este ID de pedido: " + orderId);
        }

      clearCart();
      
      navigate('/pago-completado', {
        state: {
          pedidoId: orderId,
          paymentIntentId,
          total,
        },
      });
    } catch (err) {
      console.error('Error updating order:', err);
      setError("Error al confirmar el pedido. Por favor contacte soporte.");
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
          <p>Preparando el pago...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stripe-checkout-container">
        <div className="error-state">
          <h2>Error al Procesar el Pago</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/carrito')} className="btn-back">
            <ArrowLeft size={18} />
            Volver al Carrito
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
          <h2>Error de Configuración</h2>
          <p>No se pudo cargar el sistema de pagos. Por favor, contacta con soporte.</p>
          <button onClick={() => navigate('/carrito')} className="btn-back">
            <ArrowLeft size={18} />
            Volver al Carrito
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="stripe-checkout-container">
      <div className="checkout-header">
        <button onClick={() => navigate('/carrito')} className="btn-back-small">
          <ArrowLeft size={18} />
          Volver
        </button>
        <h1>Finalizar Pago</h1>
      </div>

      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: {
            theme: 'stripe',
            variables: {
              colorPrimary: '#2563eb',
            },
          },
        }}
      >
        <StripePaymentForm
          amount={total}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
        />
      </Elements>

      <div className="checkout-info">
        <h3>Resumen del Pedido</h3>
        <div className="order-items">
          {items.map(item => (
            <div key={item.book.id} className="order-item">
              <span>{item.book.title}</span>
              <span>
                {item.quantity} x €{item.book.price.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
        <div className="order-total">
          <strong>Total:</strong>
          <strong>€{total.toFixed(2)}</strong>
        </div>
      </div>
    </div>
  );
}
