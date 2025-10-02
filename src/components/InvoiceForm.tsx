import React, { useState, useEffect } from 'react';
import { InvoiceFormData, InvoiceItem } from '../types';
import { mockBooks } from '../data/mockBooks';
import { Plus, Trash2, FileText } from 'lucide-react';
import '../styles/components/InvoiceForm.css';

interface InvoiceFormProps {
  onSubmit: (data: InvoiceFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

const TAX_RATES = [
  { value: 0, label: '0% (Exento)' },
  { value: 4, label: '4% (Super reducido - Libros)' },
  { value: 10, label: '10% (Reducido)' },
  { value: 21, label: '21% (General)' }
];

const InvoiceForm: React.FC<InvoiceFormProps> = ({ onSubmit, onCancel, loading = false }) => {
  const [formData, setFormData] = useState<InvoiceFormData>({
    customer_name: '',
    customer_address: '',
    customer_nif: '',
    tax_rate: 4,
    payment_method: '',
    order_id: '',
    items: []
  });

  const [selectedBookId, setSelectedBookId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (selectedBookId) {
      const book = mockBooks.find(b => b.id === selectedBookId);
      if (book) {
        setUnitPrice(book.price);
      }
    }
  }, [selectedBookId]);


  const handleAddItem = () => {
    if (!selectedBookId) {
      setErrors({ ...errors, item: 'Selecciona un libro' });
      return;
    }

    const book = mockBooks.find(b => b.id === selectedBookId);
    if (!book) return;

    const lineTotal = quantity * unitPrice;
    const newItem: InvoiceItem = {
      book_id: selectedBookId,
      book_title: book.title,
      quantity,
      unit_price: unitPrice,
      line_total: lineTotal
    };

    setFormData({
      ...formData,
      items: [...formData.items, newItem]
    });

    setSelectedBookId('');
    setQuantity(1);
    setUnitPrice(0);
    setErrors({ ...errors, item: '' });
  };

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + item.line_total, 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * (formData.tax_rate / 100);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.customer_name.trim()) {
      newErrors.customer_name = 'El nombre del cliente es obligatorio';
    }

    if (!formData.customer_address.trim()) {
      newErrors.customer_address = 'La dirección es obligatoria';
    }

    if (!formData.customer_nif.trim()) {
      newErrors.customer_nif = 'El NIF es obligatorio';
    } else if (!/^[A-Z0-9]{9}$/.test(formData.customer_nif.toUpperCase())) {
      newErrors.customer_nif = 'El NIF debe tener 9 caracteres alfanuméricos';
    }

    if (formData.items.length === 0) {
      newErrors.items = 'Debe agregar al menos un libro';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <form className="invoice-form" onSubmit={handleSubmit}>
      <div className="form-section">
        <h3>Datos del cliente</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Nombre del cliente *</label>
            <input
              type="text"
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              className={errors.customer_name ? 'error' : ''}
            />
            {errors.customer_name && <span className="error-message">{errors.customer_name}</span>}
          </div>

          <div className="form-group">
            <label>NIF *</label>
            <input
              type="text"
              value={formData.customer_nif}
              onChange={(e) => setFormData({ ...formData, customer_nif: e.target.value.toUpperCase() })}
              placeholder="B12345678"
              maxLength={9}
              className={errors.customer_nif ? 'error' : ''}
            />
            {errors.customer_nif && <span className="error-message">{errors.customer_nif}</span>}
          </div>

          <div className="form-group full-width">
            <label>Dirección *</label>
            <input
              type="text"
              value={formData.customer_address}
              onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
              className={errors.customer_address ? 'error' : ''}
            />
            {errors.customer_address && <span className="error-message">{errors.customer_address}</span>}
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Agregar libros</h3>
        <div className="add-item-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Libro</label>
              <select
                value={selectedBookId}
                onChange={(e) => setSelectedBookId(e.target.value)}
                className="form-select"
              >
                <option value="">Seleccionar libro...</option>
                {mockBooks.map(book => (
                  <option key={book.id} value={book.id}>
                    {book.title} - {formatCurrency(book.price)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Cantidad</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="form-group">
              <label>Precio unitario</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={unitPrice}
                onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label>&nbsp;</label>
              <button
                type="button"
                onClick={handleAddItem}
                className="btn-add-item"
              >
                <Plus size={18} />
                Agregar
              </button>
            </div>
          </div>
          {errors.item && <span className="error-message">{errors.item}</span>}
        </div>

        {formData.items.length > 0 && (
          <div className="items-list">
            <table className="items-table">
              <thead>
                <tr>
                  <th>Libro</th>
                  <th>Cantidad</th>
                  <th>Precio unitario</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {formData.items.map((item, index) => (
                  <tr key={index}>
                    <td>{item.book_title}</td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.unit_price)}</td>
                    <td>{formatCurrency(item.line_total)}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="btn-remove"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {errors.items && <span className="error-message">{errors.items}</span>}
      </div>

      <div className="form-section">
        <h3>Configuración adicional</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>IVA</label>
            <select
              value={formData.tax_rate}
              onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) })}
              className="form-select"
            >
              {TAX_RATES.map(rate => (
                <option key={rate.value} value={rate.value}>
                  {rate.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Método de pago (opcional)</label>
            <input
              type="text"
              value={formData.payment_method || ''}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              placeholder="Transferencia, Tarjeta, etc."
            />
          </div>
        </div>
      </div>

      <div className="invoice-summary">
        <div className="summary-row">
          <span>Subtotal:</span>
          <span className="summary-amount">{formatCurrency(calculateSubtotal())}</span>
        </div>
        <div className="summary-row">
          <span>IVA ({formData.tax_rate}%):</span>
          <span className="summary-amount">{formatCurrency(calculateTax())}</span>
        </div>
        <div className="summary-row total">
          <span>Total:</span>
          <span className="summary-amount">{formatCurrency(calculateTotal())}</span>
        </div>
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn-cancel" disabled={loading}>
          Cancelar
        </button>
        <button type="submit" className="btn-submit" disabled={loading}>
          <FileText size={18} />
          {loading ? 'Creando...' : 'Crear factura'}
        </button>
      </div>
    </form>
  );
};

export default InvoiceForm;
