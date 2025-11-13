import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight } from 'lucide-react';
import '../styles/pages/PaymentSuccess.css';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const { pedidoId, paymentIntentId, total } = location.state || {};

  useEffect(() => {
    if (!pedidoId) {
      navigate('/');
    }
  }, [pedidoId, navigate]);

  return (
    <div className="payment-success-container">
      <div className="success-card">
        <div className="success-icon">
          <CheckCircle size={64} />
        </div>

        <h1>¡Pago Completado!</h1>
        <p className="success-message">
          Tu pedido ha sido procesado correctamente y lo recibirás pronto.
        </p>

        <div className="order-details">
          <div className="detail-item">
            <span className="label">Número de Pedido:</span>
            <span className="value">#{pedidoId}</span>
          </div>
          <div className="detail-item">
            <span className="label">ID de Transacción:</span>
            <span className="value">{paymentIntentId?.substring(0, 20)}...</span>
          </div>
          <div className="detail-item">
            <span className="label">Total Pagado:</span>
            <span className="value total">€{total?.toFixed(2)}</span>
          </div>
        </div>

        <div className="success-info">
          <Package size={24} />
          <div>
            <h3>¿Qué sigue?</h3>
            <p>Recibirás un email de confirmación con los detalles de tu pedido.</p>
            <p>Puedes seguir el estado de tu pedido desde tu panel de usuario.</p>
          </div>
        </div>

        <div className="success-actions">
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-primary"
          >
            Ver Mis Pedidos
            <ArrowRight size={18} />
          </button>
          <button
            onClick={() => navigate('/catalogo')}
            className="btn-secondary"
          >
            Seguir Comprando
          </button>
        </div>
      </div>
    </div>
  );
}
