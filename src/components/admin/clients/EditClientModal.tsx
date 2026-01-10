import React, { useState, useEffect } from 'react';
import { X, Save, User, Mail, Phone, MapPin, CreditCard } from 'lucide-react';
import { Cliente } from '../../../types';
import { actualizarCliente, ClienteFormData } from '../../../services/clienteService';

interface EditClientModalProps {
  cliente: Cliente;
  isOpen: boolean;
  onClose: () => void;
  onClientUpdated: (cliente: Cliente) => void;
}

export const EditClientModal: React.FC<EditClientModalProps> = ({
  cliente,
  isOpen,
  onClose,
  onClientUpdated
}) => {
  const [formData, setFormData] = useState<ClienteFormData>({
    nombre: '',
    apellidos: '',
    email: '',
    telefono: '',
    direccion: '',
    ciudad: '',
    codigo_postal: '',
    provincia: '',
    pais: 'España',
    nif: '',
    tipo: 'particular',
    persona_contacto: '',
    cargo: '',
    web: '',
    notas: '',
    activo: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cliente && isOpen) {
      setFormData({
        nombre: cliente.nombre || '',
        apellidos: cliente.apellidos || '',
        email: cliente.email || '',
        telefono: cliente.telefono || '',
        direccion: cliente.direccion || '',
        ciudad: cliente.ciudad || '',
        codigo_postal: cliente.codigo_postal || '',
        provincia: cliente.provincia || '',
        pais: cliente.pais || 'España',
        nif: cliente.nif || '',
        tipo: cliente.tipo || 'particular',
        persona_contacto: cliente.persona_contacto || '',
        cargo: cliente.cargo || '',
        web: cliente.web || '',
        notas: cliente.notas || '',
        activo: cliente.activo ?? true
      });
      setError(null);
    }
  }, [cliente, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!cliente.id) throw new Error('ID de cliente no válido');

      const updatedCliente = await actualizarCliente(cliente.id, formData);
      if (updatedCliente) {
        onClientUpdated(updatedCliente);
        onClose();
      } else {
        throw new Error('No se pudo actualizar el cliente');
      }
    } catch (err) {
      console.error('Error updating client:', err);
      setError('Error al guardar los cambios. Por favor, inténtelo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-content" style={{ maxWidth: '600px', width: '95%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-title">
            <User size={24} />
            <h2>Editar Cliente</h2>
          </div>
          <button onClick={onClose} className="btn-close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4 text-sm border border-red-200">
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            {/* Personal Info */}
            <div className="form-group">
              <label>Nombre</label>
              <div className="input-group" style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  name="nombre"
                  className="form-input"
                  value={formData.nombre}
                  onChange={handleChange}
                  required
                  placeholder="Nombre"
                  style={{ paddingLeft: '2.5rem', width: '100%' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Apellidos</label>
              <div className="input-group" style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  name="apellidos"
                  className="form-input"
                  value={formData.apellidos}
                  onChange={handleChange}
                  required
                  placeholder="Apellidos"
                  style={{ paddingLeft: '2.5rem', width: '100%' }}
                />
              </div>
            </div>

            {/* Contact Info */}
            <div className="form-group">
              <label>Email</label>
              <div className="input-group" style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="correo@ejemplo.com"
                  style={{ paddingLeft: '2.5rem', width: '100%' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Teléfono</label>
              <div className="input-group" style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="tel"
                  name="telefono"
                  className="form-input"
                  value={formData.telefono}
                  onChange={handleChange}
                  placeholder="+34 600 000 000"
                  style={{ paddingLeft: '2.5rem', width: '100%' }}
                />
              </div>
            </div>

            <div className="form-group">
               <label>NIF / DNI</label>
               <div className="input-group" style={{ position: 'relative' }}>
                 <CreditCard size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                 <input
                   type="text"
                   name="nif"
                   className="form-input"
                   value={formData.nif}
                   onChange={handleChange}
                   placeholder="12345678X"
                   style={{ paddingLeft: '2.5rem', width: '100%' }}
                 />
               </div>
             </div>
          </div>

          <div className="divider" style={{ margin: '1.5rem 0', borderBottom: '1px solid var(--border-color)' }}></div>
          <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Dirección</h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
             <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Dirección</label>
              <div className="input-group" style={{ position: 'relative' }}>
                <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  name="direccion"
                  className="form-input"
                  value={formData.direccion}
                  onChange={handleChange}
                  placeholder="Calle, número, piso..."
                  style={{ paddingLeft: '2.5rem', width: '100%' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Ciudad</label>
              <input
                type="text"
                name="ciudad"
                className="form-input"
                value={formData.ciudad}
                onChange={handleChange}
                placeholder="Ciudad"
              />
            </div>

            <div className="form-group">
              <label>Código Postal</label>
              <input
                type="text"
                name="codigo_postal"
                className="form-input"
                value={formData.codigo_postal}
                onChange={handleChange}
                placeholder="28000"
              />
            </div>

            <div className="form-group">
              <label>Provincia</label>
              <input
                type="text"
                name="provincia"
                className="form-input"
                value={formData.provincia}
                onChange={handleChange}
                placeholder="Provincia"
              />
            </div>
          </div>

          <div className="modal-footer" style={{ marginTop: '2rem' }}>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner-small"></span>
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
