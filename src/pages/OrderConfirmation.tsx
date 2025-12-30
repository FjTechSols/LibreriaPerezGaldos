import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Pedido } from '../types';
import { sendOrderConfirmationEmail } from '../services/emailService';
import '../styles/pages/OrderConfirmation.css';

export default function OrderConfirmation() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const location = useLocation();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    const orderId = (location.state as any)?.orderId;
    
    if (orderId) {
      loadOrderAndSendEmail(orderId);
    }
  }, [location.state]);

  const loadOrderAndSendEmail = async (orderId: number) => {
    try {
      // Cargar detalles del pedido
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          *,
          detalles:pedido_detalles(
            *,
            libro:libros(*)
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      
      setPedido(data);

      // Enviar email de confirmación
      if (data && user && !emailSent) {
        const emailData = {
          orderId: data.id.toString(),
          customerEmail: user.email,
          customerName: user.username || user.name || 'Cliente',
          items: data.detalles?.map((detalle: any) => ({
            title: detalle.libro?.titulo || detalle.nombre_externo || 'Producto',
            quantity: detalle.cantidad,
            price: detalle.precio_unitario
          })) || [],
          subtotal: data.subtotal || 0,
          tax: data.iva || 0,
          taxRate: data.subtotal && data.iva ? (data.iva / data.subtotal) * 100 : 0,
          shipping: data.coste_envio || 0,
          total: data.total || 0,
          shippingAddress: data.direccion_envio || ''
        };

        const result = await sendOrderConfirmationEmail(emailData);
        
        if (result.success) {
          console.log('✅ Email de confirmación enviado correctamente');
          setEmailSent(true);
        } else {
          console.error('❌ Error al enviar email:', result.error);
        }
      }
    } catch (error) {
      console.error('Error loading order:', error);
    }
  };

  return (
    <div className="order-confirmation-container">
      <div className="confirmation-card">
        <div className="icon-wrapper">
          <Clock size={48} className="clock-icon" />
          <CheckCircle size={24} className="check-icon" />
        </div>
        
        <h1>{t('orderReceived') || '¡Pedido Recibido!'}</h1>
        
        <p className="subtitle">
          {t('orderReceivedSubtitle') || 'Hemos recibido tu solicitud correctamente.'}
        </p>

        {pedido && (
          <div className="order-info-box" style={{
            marginBottom: '1.5rem',
            padding: '1rem',
            backgroundColor: 'var(--surface)',
            borderRadius: '8px',
            border: '1px solid var(--border)'
          }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Número de pedido: <strong style={{ color: 'var(--text)' }}>#{pedido.id}</strong>
            </p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {emailSent && '✅ Te hemos enviado un email con los detalles del pedido.'}
            </p>
          </div>
        )}

        <div className="info-box">
          <h3>{t('nextSteps') || '¿Qué sucede ahora?'}</h3>
          <ul>
            <li>
              <strong>1. {t('verificationStep') || 'Verificación de Stock'}:</strong>
              <br />
              {t('verificationDesc') || 'En las próximas 24-48 horas, verificaremos que los libros estén en perfecto estado en nuestro almacén.'}
            </li>
            <li>
              <strong>2. {t('paymentStep') || 'Confirmación y Pago'}:</strong>
              <br />
              {t('paymentDesc') || 'Te enviaremos un email cuando estemos listos. Podrás acceder a tu cuenta y completar el pago.'}
            </li>
            <li>
              <strong>3. {t('shippingStep') || 'Envío'}:</strong>
              <br />
              {t('shippingDesc') || 'Una vez pagado, prepararemos y enviaremos tu paquete inmediatamente.'}
            </li>
          </ul>
        </div>

        <div className="actions">
          <Link to="/mi-cuenta" state={{ section: 'orders' }} className="primary-btn">
            {t('goToMyOrders') || 'Ir a Mis Pedidos'} <ArrowRight size={18} />
          </Link>
          <Link to="/" className="secondary-btn">
            {t('continueShopping')}
          </Link>
        </div>
      </div>
    </div>
  );
}
