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
    <div className="modal-overlay">
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
            <div className="bg-[var(--danger)]/10 text-[var(--danger)] p-3 rounded-md mb-4 text-sm border border-[var(--danger)]/20">
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            {/* Personal Info */}
            <div className="form-group">
              <label>Nombre</label>
              <div className="input-group relative">
                <User size={16} className="absolute left-[12px] top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                <input
                  type="text"
                  name="nombre"
                  className="form-input pl-10 w-full"
                  value={formData.nombre}
                  onChange={handleChange}
                  required
                  placeholder="Nombre"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Apellidos</label>
              <div className="input-group relative">
                <User size={16} className="absolute left-[12px] top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                <input
                  type="text"
                  name="apellidos"
                  className="form-input pl-10 w-full"
                  value={formData.apellidos}
                  onChange={handleChange}
                  required
                  placeholder="Apellidos"
                />
              </div>
            </div>

            {/* Contact Info */}
            <div className="form-group">
              <label>Email</label>
              <div className="input-group relative">
                <Mail size={16} className="absolute left-[12px] top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                <input
                  type="email"
                  name="email"
                  className="form-input pl-10 w-full"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="correo@ejemplo.com"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Teléfono</label>
              <div className="input-group relative">
                <Phone size={16} className="absolute left-[12px] top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                <input
                  type="tel"
                  name="telefono"
                  className="form-input pl-10 w-full"
                  value={formData.telefono}
                  onChange={handleChange}
                  placeholder="+34 600 000 000"
                />
              </div>
            </div>

            <div className="form-group">
               <label>NIF / DNI</label>
               <div className="input-group relative">
                 <CreditCard size={16} className="absolute left-[12px] top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                 <input
                   type="text"
                   name="nif"
                   className="form-input pl-10 w-full"
                   value={formData.nif}
                   onChange={handleChange}
                   placeholder="12345678X"
                 />
               </div>
             </div>
          </div>

          <div className="divider my-6 border-b border-[var(--border-subtle)]"></div>
          <h4 className="mb-4 text-[var(--text-muted)] text-sm">Dirección</h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
             <div className="form-group col-span-2">
              <label>Dirección</label>
              <div className="input-group relative">
                <MapPin size={16} className="absolute left-[12px] top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                <input
                  type="text"
                  name="direccion"
                  className="form-input pl-10 w-full"
                  value={formData.direccion}
                  onChange={handleChange}
                  placeholder="Calle, número, piso..."
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

          <div className="modal-footer mt-8">
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
