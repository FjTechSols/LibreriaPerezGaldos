import { useState, useEffect, useMemo } from 'react';
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
import { crearPedido, confirmOrderAndDeductStock, obtenerPedidoPorId, actualizarEstadoPedido } from '../services/pedidoService';
import { findOrCreateCliente } from '../services/clienteService';
import { ArrowLeft } from 'lucide-react';
import { MessageModal } from '../components/MessageModal'; // Import MessageModal
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
  cartItems?: any[];
  orderId?: string; // New: Support for existing order payment
}

export default function StripeCheckout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { clearCart } = useCart();
  const { user, isSuperAdmin } = useAuth();
  const { actualTheme } = useTheme();
  const { t } = useLanguage();
  const { settings } = useSettings();

  // Extract state passed from Cart
  const locationState = location.state as StripeCheckoutState | undefined;
  
  // Local state to handle potentially fetched order data
  const [checkoutState, setCheckoutState] = useState<StripeCheckoutState | undefined>(locationState);

  const [clientSecret, setClientSecret] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // State for MessageModal
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalConfig, setMessageModalConfig] = useState<{
    title: string;
    message: string;
    type: 'info' | 'error';
    onClose?: () => void;
  }>({ title: '', message: '', type: 'info' });

  const showModal = (
    title: string, 
    message: string, 
    type: 'info' | 'error' = 'info', 
    onClose?: () => void
  ) => {
    setMessageModalConfig({ title, message, type, onClose });
    setShowMessageModal(true);
  };

  // Stabilize options to prevent unnecessary re-renders of Elements
  // Must be declared at top level to satisfy Rules of Hooks
  const stripeOptions = useMemo(() => ({
      clientSecret,
      appearance: {
          theme: (actualTheme === 'dark' ? 'night' : 'stripe') as 'night' | 'stripe',
          variables: {
              colorPrimary: '#2563eb',
          },
      },
  }), [clientSecret, actualTheme]);

  useEffect(() => {
    // If we already have full data from Cart navigation (locationState), use it.
    if (locationState?.cartItems && locationState.cartItems.length > 0) {
       setCheckoutState(locationState); // Explicitly set it
       initializePayment(locationState);
       return;
    }

    // If we have an orderID but no items (e.g. from Dashboard), fetch it.
    if (locationState?.orderId) {
       initializeExistingOrderPayment(locationState.orderId);
       return;
    }

    // Check for query param (e.g. ?orderId=123)
    const searchParams = new URLSearchParams(location.search);
    const queryOrderId = searchParams.get('orderId');

    if (queryOrderId) {
        initializeExistingOrderPayment(queryOrderId);
        return;
    }

    // Fallback
    if (!locationState) {
        navigate('/carrito');
    }
  }, []);

  const initializeExistingOrderPayment = async (orderId: string) => {
      try {
          setIsLoading(true);
          const pedido = await obtenerPedidoPorId(parseInt(orderId));
          
          if (!pedido) throw new Error("Pedido no encontrado");

          // Security check: Ensure user owns the order or is a Super Admin
          if (pedido.usuario_id !== user!.id && !isSuperAdmin) {
             console.error('Unauthorized access attempt to order:', orderId); // Log security event
             setError('No tienes permisos para acceder a este pedido.');
             setIsLoading(false); // Stop loading and prevent further processing
             return;
          }

          // If Super Admin is accessing another user's order, log a warning but allow continuation
          if (isSuperAdmin && pedido.usuario_id !== user!.id) {
             console.log('Super Admin accessing user order:', orderId);
          }

          // Construct state from existing order
          const loadedState: StripeCheckoutState = {
              orderId: orderId,
              checkoutData: {
                  nombre: pedido.cliente?.nombre || pedido.usuario?.nombre_completo || '',
                  apellidos: pedido.cliente?.apellidos || '',
                  email: pedido.cliente?.email || pedido.usuario?.email || '',
                  telefono: pedido.cliente?.telefono || '',
                  direccion: pedido.direccion_envio || '',
                  ciudad: '', 
                  codigo_postal: '',
                  provincia: '',
                  pais: 'España',
                  observaciones: pedido.observaciones || ''
              } as CheckoutData,
              orderTotal: pedido.total || 0,
              subtotal: pedido.subtotal || 0,
              taxAmount: pedido.iva || 0,
              shippingCost: pedido.coste_envio || 0,
              shippingMethod: 'standard', // Default or infer from cost/name
              direccionCompleta: pedido.direccion_envio || '',
              cartItems: pedido.detalles?.map(d => ({
                  book: {
                      id: d.libro?.id.toString() || '0',
                      title: d.libro?.titulo || d.nombre_externo || 'Libro',
                      price: d.precio_unitario
                  },
                  quantity: d.cantidad
              })) || []
          };
          
          setCheckoutState(loadedState);
          initializePayment(loadedState);
      } catch (err) {
          console.error("Error loading order:", err);
          setError("Error al cargar el pedido");
          setIsLoading(false);
      }
  };

  const initializePayment = async (currentState: StripeCheckoutState) => {
    try {
      setIsLoading(true);

      // Create payment intent WITHOUT creating the order
      // FIX: Stripe service/backend handles conversion or expects units? 
      // User issue: 39 -> 3900 means backend is multiplying by 100 on TOP of this.
      // So we send units (39) and let backend do the conversion to cents.
      const amountToSend = currentState.orderTotal;
      
      const { clientSecret: secret } = await stripeService.createPaymentIntent(
        amountToSend,
        {
          cliente_email: currentState.checkoutData.email,
          cliente_nombre: `${currentState.checkoutData.nombre} ${currentState.checkoutData.apellidos}`,
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
      // PATH A: Pay for EXISTING Order
      if (checkoutState?.orderId) {
          // Verify payment on backend if needed, or just update status
          // Update status to 'procesando' (Paid)
          const result = await actualizarEstadoPedido(parseInt(checkoutState.orderId), 'procesando');
          
          if (!result.success) {
               throw new Error(result.error || "Error al actualizar estado del pedido");
          }

          navigate('/pago-completado', {
            state: {
                pedidoId: parseInt(checkoutState.orderId),
                paymentIntentId,
                total: checkoutState.orderTotal,
            },
        });
        return;
      }

      // PATH B: Create NEW Order (Legacy / Direct Flow)
      if (!checkoutState) throw new Error("Checkout data not found");

      // ... (Rest of existing logic for creating client and order) ...
      const cliente = await findOrCreateCliente({
        nombre: checkoutState.checkoutData.nombre,
        apellidos: checkoutState.checkoutData.apellidos,
        email: checkoutState.checkoutData.email,
        telefono: checkoutState.checkoutData.telefono,
        direccion: checkoutState.checkoutData.direccion,
        ciudad: checkoutState.checkoutData.ciudad,
        codigo_postal: checkoutState.checkoutData.codigo_postal,
        provincia: checkoutState.checkoutData.provincia,
        pais: checkoutState.checkoutData.pais,
        tipo: 'particular'
      });

      const detalles = checkoutState.cartItems!.map(item => ({
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
        direccion_envio: checkoutState.direccionCompleta,
        transportista: checkoutState.shippingMethod === 'standard' ? 'Correos (Estándar)' : 'Mensajería (Express)',
        coste_envio: checkoutState.shippingCost,
        observaciones: checkoutState.checkoutData.observaciones || undefined,
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
        showModal(
          'Atención Requida', 
          "Pago recibido correctamente, POSIBLE ERROR DE STOCK.\n\n" + 
          "Hubo un problema actualizando el inventario automáticamente.\n" +
          "Por favor, guarde este ID de pedido: " + pedido.id + "\n" + 
          "y contacte con nosotros si no recibe confirmación en 24h.",
          'error',
          () => {
              clearCart();
              navigate('/pago-completado', {
                state: {
                  pedidoId: pedido.id,
                  paymentIntentId,
                  total: checkoutState.orderTotal,
                },
              });
          }
        );
        return;
      }

      clearCart();
      
      navigate('/pago-completado', {
        state: {
          pedidoId: pedido.id,
          paymentIntentId,
          total: checkoutState.orderTotal,
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
              {checkoutState?.cartItems?.map(item => (
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
                <span className="summary-value">€{checkoutState?.subtotal.toFixed(2)}</span>
              </div>
              <div className="summary-detail-row">
                <span className="summary-label">{t('shipping')}:</span>
                <span className="summary-value">{checkoutState?.shippingCost ? `€${checkoutState.shippingCost.toFixed(2)}` : t('freeLabel')}</span>
              </div>
              <div className="summary-detail-row">
                <span className="summary-label">{t('iva')}:</span>
                <span className="summary-value">€{checkoutState?.taxAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="order-total" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid #eee' }}>
              <strong>{t('checkoutTotal')}:</strong>
              <strong>€{checkoutState?.orderTotal.toFixed(2)}</strong>
            </div>
          </div>
        </div>

        <div className="checkout-main">
          <Elements
            stripe={stripePromise}
            options={stripeOptions}
            key={actualTheme}
          >
            <StripePaymentForm
              amount={checkoutState?.orderTotal || 0}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          </Elements>
        </div>
      </div>

      <MessageModal
        isOpen={showMessageModal}
        onClose={() => {
            setShowMessageModal(false);
            if (messageModalConfig.onClose) messageModalConfig.onClose();
        }}
        title={messageModalConfig.title}
        message={messageModalConfig.message}
        type={messageModalConfig.type}
      />
    </div>
  );
}
