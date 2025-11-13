import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { StripePaymentForm } from '../components/StripePaymentForm';
import { getStripe } from '../lib/stripe';
import { stripeService } from '../services/stripeService';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { crearPedido, actualizarPedido } from '../services/pedidoService';
import { ArrowLeft } from 'lucide-react';
import '../styles/components/StripePaymentForm.css';

export default function StripeCheckout() {
  const navigate = useNavigate();
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const [clientSecret, setClientSecret] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [pedidoId, setPedidoId] = useState<number | null>(null);

  const checkoutData = JSON.parse(localStorage.getItem('checkoutData') || '{}');

  useEffect(() => {
    if (!user || items.length === 0) {
      navigate('/carrito');
      return;
    }

    if (!checkoutData.nombre) {
      navigate('/carrito');
      return;
    }

    initializePayment();
  }, []);

  const initializePayment = async () => {
    try {
      setIsLoading(true);

      const nuevoPedido = await crearPedido({
        usuario_id: user!.id,
        cliente_id: undefined,
        tipo: 'interno',
        metodo_pago: 'tarjeta',
        direccion_envio: `${checkoutData.direccion}, ${checkoutData.ciudad}, ${checkoutData.codigo_postal}, ${checkoutData.provincia}, ${checkoutData.pais}`,
        observaciones: checkoutData.observaciones || '',
        detalles: items.map(item => ({
          libro_id: parseInt(item.book.id),
          cantidad: item.quantity,
          precio_unitario: item.book.price,
        })),
      });

      setPedidoId(nuevoPedido.id);

      const { clientSecret: secret } = await stripeService.createPaymentIntent(
        total,
        {
          pedido_id: nuevoPedido.id.toString(),
          cliente_email: checkoutData.email,
          cliente_nombre: `${checkoutData.nombre} ${checkoutData.apellidos}`,
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
      if (pedidoId) {
        await actualizarPedido(pedidoId, {
          estado: 'procesando',
        });
      }

      clearCart();
      localStorage.removeItem('checkoutData');
      navigate('/pago-completado', {
        state: {
          pedidoId,
          paymentIntentId,
          total,
        },
      });
    } catch (err) {
      console.error('Error updating order:', err);
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
