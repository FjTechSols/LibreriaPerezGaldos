import { useState } from 'react';
import { CreditCard, Truck, MapPin, FileText, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import '../styles/components/CheckoutForm.css';

export interface CheckoutData {
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  codigo_postal: string;
  provincia: string;
  pais: string;
  metodo_pago: 'tarjeta' | 'paypal' | 'transferencia';
  observaciones: string;
}

interface CheckoutFormProps {
  subtotal: number;
  iva: number;
  total: number;
  onSubmit: (data: CheckoutData) => void;
  onCancel: () => void;
  isProcessing: boolean;
}

export default function CheckoutForm({
  subtotal,
  iva,
  total,
  onSubmit,
  onCancel,
  isProcessing
}: CheckoutFormProps) {
  const { user } = useAuth();
  const { formatPrice } = useSettings();

  const [formData, setFormData] = useState<CheckoutData>({
    nombre: '',
    apellidos: '',
    email: user?.email || '',
    telefono: '',
    direccion: '',
    ciudad: '',
    codigo_postal: '',
    provincia: '',
    pais: 'España',
    metodo_pago: 'tarjeta',
    observaciones: ''
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="checkout-form-container">
      <form onSubmit={handleSubmit} className="checkout-form">
        <div className="checkout-section">
          <div className="section-header">
            <User size={20} />
            <h3>Información Personal</h3>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="nombre">Nombre *</label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="Tu nombre"
              />
            </div>

            <div className="form-group">
              <label htmlFor="apellidos">Apellidos *</label>
              <input
                type="text"
                id="apellidos"
                name="apellidos"
                value={formData.apellidos}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="Tus apellidos"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="tu@email.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="telefono">Teléfono *</label>
              <input
                type="tel"
                id="telefono"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="600123456"
              />
            </div>
          </div>
        </div>

        <div className="checkout-section">
          <div className="section-header">
            <MapPin size={20} />
            <h3>Dirección de Envío</h3>
          </div>

          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="direccion">Dirección *</label>
              <input
                type="text"
                id="direccion"
                name="direccion"
                value={formData.direccion}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="Calle, número, piso, puerta..."
              />
            </div>

            <div className="form-group">
              <label htmlFor="ciudad">Ciudad *</label>
              <input
                type="text"
                id="ciudad"
                name="ciudad"
                value={formData.ciudad}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="Madrid"
              />
            </div>

            <div className="form-group">
              <label htmlFor="codigo_postal">Código Postal *</label>
              <input
                type="text"
                id="codigo_postal"
                name="codigo_postal"
                value={formData.codigo_postal}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="28001"
              />
            </div>

            <div className="form-group">
              <label htmlFor="provincia">Provincia *</label>
              <input
                type="text"
                id="provincia"
                name="provincia"
                value={formData.provincia}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="Madrid"
              />
            </div>

            <div className="form-group">
              <label htmlFor="pais">País *</label>
              <input
                type="text"
                id="pais"
                name="pais"
                value={formData.pais}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="España"
              />
            </div>
          </div>
        </div>

        <div className="checkout-section">
          <div className="section-header">
            <CreditCard size={20} />
            <h3>Método de Pago</h3>
          </div>

          <div className="payment-methods">
            <label className={`payment-method ${formData.metodo_pago === 'tarjeta' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="metodo_pago"
                value="tarjeta"
                checked={formData.metodo_pago === 'tarjeta'}
                onChange={handleChange}
              />
              <div className="payment-content">
                <CreditCard size={24} />
                <div>
                  <div className="payment-title">Tarjeta de Crédito/Débito</div>
                  <div className="payment-subtitle">Visa, Mastercard, American Express</div>
                </div>
              </div>
            </label>

            <label className={`payment-method ${formData.metodo_pago === 'paypal' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="metodo_pago"
                value="paypal"
                checked={formData.metodo_pago === 'paypal'}
                onChange={handleChange}
              />
              <div className="payment-content">
                <div className="paypal-icon">P</div>
                <div>
                  <div className="payment-title">PayPal</div>
                  <div className="payment-subtitle">Pago seguro con PayPal</div>
                </div>
              </div>
            </label>

            <label className={`payment-method ${formData.metodo_pago === 'transferencia' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="metodo_pago"
                value="transferencia"
                checked={formData.metodo_pago === 'transferencia'}
                onChange={handleChange}
              />
              <div className="payment-content">
                <Truck size={24} />
                <div>
                  <div className="payment-title">Transferencia Bancaria</div>
                  <div className="payment-subtitle">Pago mediante transferencia</div>
                </div>
              </div>
            </label>
          </div>
        </div>

        <div className="checkout-section">
          <div className="section-header">
            <FileText size={20} />
            <h3>Observaciones (Opcional)</h3>
          </div>

          <div className="form-group full-width">
            <textarea
              id="observaciones"
              name="observaciones"
              value={formData.observaciones}
              onChange={handleChange}
              className="form-textarea"
              rows={3}
              placeholder="Notas adicionales sobre tu pedido (horarios de entrega, instrucciones especiales, etc.)"
            />
          </div>
        </div>

        <div className="checkout-summary">
          <h3>Resumen del Pedido</h3>
          <div className="summary-line">
            <span>Subtotal:</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="summary-line">
            <span>IVA (21%):</span>
            <span>{formatPrice(iva)}</span>
          </div>
          <div className="summary-line total">
            <span>Total:</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>

        <div className="checkout-actions">
          <button
            type="button"
            onClick={onCancel}
            className="btn-cancel"
            disabled={isProcessing}
          >
            Volver al Carrito
          </button>
          <button
            type="submit"
            className="btn-confirm"
            disabled={isProcessing}
          >
            {isProcessing ? 'Procesando...' : 'Confirmar Pedido'}
          </button>
        </div>
      </form>
    </div>
  );
}
