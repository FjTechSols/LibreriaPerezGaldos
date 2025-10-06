import React, { useState, useEffect } from 'react';
import { Users, Plus, CreditCard as Edit2, Trash2, Search, X, Mail, Phone, MapPin, CreditCard } from 'lucide-react';
import { Cliente } from '../types';
import { getClientes, crearCliente, actualizarCliente, eliminarCliente, buscarClientes } from '../services/clienteService';
import '../styles/components/GestionClientes.css';

interface ClienteFormData {
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  codigo_postal: string;
  provincia: string;
  pais: string;
  nif: string;
  notas: string;
  activo: boolean;
}

const initialFormState: ClienteFormData = {
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
  notas: '',
  activo: true
};

export function GestionClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [formData, setFormData] = useState<ClienteFormData>(initialFormState);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadClientes();
  }, []);

  const loadClientes = async () => {
    try {
      setLoading(true);
      const data = await getClientes();
      setClientes(data);
      setError(null);
    } catch (err) {
      console.error('Error loading clients:', err);
      setError('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (value: string) => {
    setSearchTerm(value);
    if (value.trim().length >= 2) {
      try {
        const results = await buscarClientes(value);
        setClientes(results);
      } catch (err) {
        console.error('Error searching clients:', err);
      }
    } else if (value.trim().length === 0) {
      loadClientes();
    }
  };

  const handleOpenModal = (cliente?: Cliente) => {
    if (cliente) {
      setEditingCliente(cliente);
      setFormData({
        nombre: cliente.nombre,
        apellidos: cliente.apellidos,
        email: cliente.email || '',
        telefono: cliente.telefono || '',
        direccion: cliente.direccion || '',
        ciudad: cliente.ciudad || '',
        codigo_postal: cliente.codigo_postal || '',
        provincia: cliente.provincia || '',
        pais: cliente.pais || 'España',
        nif: cliente.nif || '',
        notas: cliente.notas || '',
        activo: cliente.activo !== false
      });
    } else {
      setEditingCliente(null);
      setFormData(initialFormState);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCliente(null);
    setFormData(initialFormState);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.nombre.trim() || !formData.apellidos.trim()) {
      setError('Nombre y apellidos son obligatorios');
      return;
    }

    try {
      if (editingCliente) {
        await actualizarCliente(editingCliente.id, formData);
      } else {
        await crearCliente(formData);
      }
      handleCloseModal();
      loadClientes();
    } catch (err) {
      console.error('Error saving client:', err);
      setError('Error al guardar cliente');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este cliente?')) {
      return;
    }

    try {
      await eliminarCliente(id);
      loadClientes();
    } catch (err) {
      console.error('Error deleting client:', err);
      setError('Error al eliminar cliente');
    }
  };

  if (loading) {
    return (
      <div className="gestion-clientes">
        <div className="loading">Cargando clientes...</div>
      </div>
    );
  }

  return (
    <div className="gestion-clientes">
      <div className="clientes-header">
        <div className="header-top">
          <h2>
            <Users size={24} />
            Gestión de Clientes
          </h2>
          <button onClick={() => handleOpenModal()} className="btn-primary">
            <Plus size={20} />
            Nuevo Cliente
          </button>
        </div>

        <div className="search-bar">
          <Search size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre, apellidos, email o NIF..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => handleSearch('')} className="clear-search">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}><X size={16} /></button>
        </div>
      )}

      <div className="clientes-list">
        {clientes.length === 0 ? (
          <div className="empty-state">
            <Users size={48} />
            <p>No hay clientes registrados</p>
          </div>
        ) : (
          <div className="clientes-grid">
            {clientes.map((cliente) => (
              <div key={cliente.id} className={`cliente-card ${!cliente.activo ? 'inactive' : ''}`}>
                <div className="cliente-header">
                  <h3>{cliente.nombre} {cliente.apellidos}</h3>
                  <div className="cliente-actions">
                    <button onClick={() => handleOpenModal(cliente)} className="btn-icon" title="Editar">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(cliente.id)} className="btn-icon danger" title="Eliminar">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="cliente-info">
                  {cliente.email && (
                    <div className="info-row">
                      <Mail size={16} />
                      <span>{cliente.email}</span>
                    </div>
                  )}
                  {cliente.telefono && (
                    <div className="info-row">
                      <Phone size={16} />
                      <span>{cliente.telefono}</span>
                    </div>
                  )}
                  {cliente.direccion && (
                    <div className="info-row">
                      <MapPin size={16} />
                      <span>{cliente.direccion}, {cliente.ciudad} {cliente.codigo_postal}</span>
                    </div>
                  )}
                  {cliente.nif && (
                    <div className="info-row">
                      <CreditCard size={16} />
                      <span>{cliente.nif}</span>
                    </div>
                  )}
                </div>

                {cliente.notas && (
                  <div className="cliente-notas">
                    <strong>Notas:</strong> {cliente.notas}
                  </div>
                )}

                {!cliente.activo && (
                  <div className="cliente-status">Inactivo</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
              <button onClick={handleCloseModal} className="close-btn">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="cliente-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Apellidos *</label>
                  <input
                    type="text"
                    value={formData.apellidos}
                    onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Dirección</label>
                <input
                  type="text"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Ciudad</label>
                  <input
                    type="text"
                    value={formData.ciudad}
                    onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Código Postal</label>
                  <input
                    type="text"
                    value={formData.codigo_postal}
                    onChange={(e) => setFormData({ ...formData, codigo_postal: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Provincia</label>
                  <input
                    type="text"
                    value={formData.provincia}
                    onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>País</label>
                  <input
                    type="text"
                    value={formData.pais}
                    onChange={(e) => setFormData({ ...formData, pais: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>NIF / CIF / DNI</label>
                <input
                  type="text"
                  value={formData.nif}
                  onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Notas Internas</label>
                <textarea
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.activo}
                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  />
                  Cliente activo
                </label>
              </div>

              {error && <div className="form-error">{error}</div>}

              <div className="form-actions">
                <button type="button" onClick={handleCloseModal} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editingCliente ? 'Actualizar' : 'Crear'} Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
