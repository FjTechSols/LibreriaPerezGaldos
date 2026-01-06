import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, Search, X, Mail, Phone, MapPin, CreditCard, Building2, School, User } from 'lucide-react';
import { Cliente } from '../../../types';
import { getClientes, crearCliente, actualizarCliente, eliminarCliente, buscarClientes, ClienteFormData } from '../../../services/clienteService';
import '../../../styles/components/GestionClientes.css';
import { MessageModal } from '../../MessageModal';
import { Pagination } from '../../Pagination';

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
  activo: true,
  tipo: 'particular',
  persona_contacto: '',
  cargo: '',
  web: ''
};

export function GestionClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [formData, setFormData] = useState<ClienteFormData>(initialFormState);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [error, setError] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [totalCount, setTotalCount] = useState(0);

  // MessageModal State
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalConfig, setMessageModalConfig] = useState<{
    title: string;
    message: string;
    type: 'info' | 'error' | 'success' | 'warning';
    onConfirm?: () => void;
    showCancel?: boolean;
    buttonText?: string;
  }>({ title: '', message: '', type: 'info' });

  const showMessageModalHelper = (
      title: string, 
      message: string, 
      type: 'info' | 'error' | 'success' | 'warning' = 'info',
      onConfirm?: () => void
  ) => {
    setMessageModalConfig({ 
        title, 
        message, 
        type, 
        onConfirm,
        showCancel: !!onConfirm,
        buttonText: onConfirm ? 'Aceptar' : 'Cerrar'
    });
    setShowMessageModal(true);
  };

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType]);

  useEffect(() => {
    if (searchTerm.trim().length >= 2) {
        const timer = setTimeout(() => {
             handleSearch(searchTerm, currentPage);
        }, 300);
        return () => clearTimeout(timer);
    } else {
        loadClientes(currentPage);
    }
  }, [filterType, currentPage, pageSize]);

  // Initial count load if needed, but the effect above handles it


  const loadClientes = async (page: number = 1) => {
    try {
      setLoading(true);
      const { data, count } = await getClientes(page, pageSize, filterType);
      setClientes(data);
      setTotalCount(count);
      setError(null);
    } catch (err) {
      console.error('Error loading clients:', err);
      setError('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (value: string, page: number = 1) => {
    setSearchTerm(value);
    if (value.trim().length >= 2) {
      try {
        const { data: results, count } = await buscarClientes(value, page, pageSize, filterType);
        setClientes(results);
        setTotalCount(count);
      } catch (err) {
        console.error('Error searching clients:', err);
      }
    } else if (value.trim().length === 0) {
      loadClientes(page);
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
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
        activo: cliente.activo !== false,
        tipo: cliente.tipo || 'particular', 
        persona_contacto: cliente.persona_contacto || '',
        cargo: cliente.cargo || '',
        web: cliente.web || ''
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

    // Validation
    if (!formData.nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }

    if (formData.tipo === 'particular' && !formData.apellidos.trim()) {
       setError('Los apellidos son obligatorios para particulares');
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

  const handleDelete = (id: string) => {
    showMessageModalHelper(
        'Confirmar Eliminación',
        '¿Está seguro de eliminar este cliente?',
        'warning',
        async () => {
            try {
                await eliminarCliente(id);
                loadClientes();
                showMessageModalHelper('Éxito', 'Cliente eliminado correctamente', 'success');
            } catch (err) {
                console.error('Error deleting client:', err);
                setError('Error al eliminar cliente');
            }
        }
    );
  };

  // Helper to get type label
  const getTypeLabel = (type?: string) => {
    switch(type) {
      case 'empresa': return 'Empresa';
      case 'institucion': return 'Institución';
      default: return 'Particular';
    }
  };

  const getTypeIcon = (type?: string, size = 16) => {
      switch(type) {
          case 'empresa': return <Building2 size={size} />;
          case 'institucion': return <School size={size} />;
          default: return <User size={size} />;
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
          <button onClick={() => handleOpenModal()} className="cliente-btn-primary">
            <Plus size={20} />
            Nuevo Cliente
          </button>
        </div>

        {/* Filters and Search Container */}
        <div className="filters-search-container">
            
            {/* Filter Tabs */}
            <div className="filter-tabs">
                <button 
                    onClick={() => setFilterType('all')} 
                    className={`filter-pill ${filterType === 'all' ? 'active' : ''}`}
                >
                    Todos
                </button>
                <button 
                    onClick={() => setFilterType('particular')} 
                    className={`filter-pill ${filterType === 'particular' ? 'active' : ''}`}
                >
                    Particulares
                </button>
                <button 
                    onClick={() => setFilterType('empresa')} 
                    className={`filter-pill ${filterType === 'empresa' ? 'active' : ''}`}
                >
                    Empresas
                </button>
                <button 
                    onClick={() => setFilterType('institucion')} 
                    className={`filter-pill ${filterType === 'institucion' ? 'active' : ''}`}
                >
                    Instituciones
                </button>
            </div>

            <div className="cliente-search-bar" style={{ marginTop: 0 }}>
            <Search size={20} />
            <input
                type="text"
                placeholder={`Buscar ${filterType === 'all' ? 'clientes' : getTypeLabel(filterType).toLowerCase()} por nombre, NIF, contacto, teléfono...`}
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
            />
            {searchTerm && (
                <button onClick={() => { setSearchTerm(''); setCurrentPage(1); }} className="cliente-clear-search">
                <X size={16} />
                </button>
            )}
            </div>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                     {getTypeIcon(cliente.tipo, 20)}
                     <h3>
                       {cliente.nombre} 
                       {cliente.tipo === 'particular' && ` ${cliente.apellidos}`}
                     </h3>
                  </div>
                  
                  <div className="cliente-actions">
                    <button onClick={() => handleOpenModal(cliente)} className="cliente-btn-icon" title="Editar">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(cliente.id)} className="cliente-btn-icon danger" title="Eliminar">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="cliente-info">
                  {/* Badge de Tipo */}
                  <div className="info-row type-badge" style={{ 
                      display: 'inline-flex', 
                      padding: '2px 8px', 
                      borderRadius: '12px', 
                      fontSize: '0.75rem', 
                      fontWeight: 600,
                      background: 'var(--bg-tertiary)',
                      marginBottom: '8px'
                  }}>
                      {getTypeLabel(cliente.tipo)}
                  </div>

                  {cliente.persona_contacto && (
                    <div className="info-row">
                      <User size={16} />
                      <span className="text-secondary">Contacto: {cliente.persona_contacto}</span>
                    </div>
                  )}

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
                      <span>{cliente.direccion}, {cliente.ciudad}</span>
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
              </div>
            ))}
          </div>
        )}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(totalCount / pageSize)}
        itemsPerPage={pageSize}
        totalItems={totalCount}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handlePageSizeChange}
        showItemsPerPageSelector={true}
        itemsPerPageOptions={[12, 24, 48, 96]}
      />

      {showModal && (
        <div className="cliente-modal-overlay" onClick={handleCloseModal}>
          <div className="cliente-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
              <button onClick={handleCloseModal} className="close-btn">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="cliente-form">
               {/* Type Selector Tabs */}
               <div className="client-type-tabs">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, tipo: 'particular'})}
                    className={`client-type-tab ${formData.tipo === 'particular' ? 'active' : ''}`}
                  >
                    Particular
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, tipo: 'empresa'})}
                    className={`client-type-tab ${formData.tipo === 'empresa' ? 'active' : ''}`}
                  >
                    Empresa
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, tipo: 'institucion'})}
                    className={`client-type-tab ${formData.tipo === 'institucion' ? 'active' : ''}`}
                  >
                    Institución
                  </button>
               </div>

              <div className="form-row">
                <div className="form-group full-width">
                  <label>
                    {formData.tipo === 'particular' ? 'Nombre *' : (formData.tipo === 'empresa' ? 'Razón Social *' : 'Nombre Institución *')}
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                  />
                </div>
                {formData.tipo === 'particular' && (
                  <div className="form-group full-width">
                    <label>Apellidos *</label>
                    <input
                      type="text"
                      value={formData.apellidos}
                      onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                      required
                    />
                  </div>
                )}
              </div>

               {/* Campos específicos Empresa/Institucion */}
               {(formData.tipo === 'empresa' || formData.tipo === 'institucion') && (
                 <div className="form-row">
                    <div className="form-group">
                      <label>Persona Contacto</label>
                      <input
                        type="text"
                        value={formData.persona_contacto || ''}
                        onChange={(e) => setFormData({ ...formData, persona_contacto: e.target.value })}
                      />
                    </div>
                    {formData.tipo === 'institucion' && (
                      <div className="form-group">
                        <label>Cargo</label>
                        <input
                          type="text"
                          value={formData.cargo || ''}
                          onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                        />
                      </div>
                    )}
                    {formData.tipo === 'empresa' && (
                       <div className="form-group">
                        <label>Sitio Web</label>
                        <input
                          type="url"
                          value={formData.web || ''}
                          onChange={(e) => setFormData({ ...formData, web: e.target.value })}
                          placeholder="https://..."
                        />
                      </div>
                    )}
                 </div>
               )}

              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    type="tel"
                    value={formData.telefono || ''}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Dirección</label>
                <input
                  type="text"
                  value={formData.direccion || ''}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Ciudad</label>
                  <input
                    type="text"
                    value={formData.ciudad || ''}
                    onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Código Postal</label>
                  <input
                    type="text"
                    value={formData.codigo_postal || ''}
                    onChange={(e) => setFormData({ ...formData, codigo_postal: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Provincia</label>
                  <input
                    type="text"
                    value={formData.provincia || ''}
                    onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>País</label>
                  <input
                    type="text"
                    value={formData.pais || 'España'}
                    onChange={(e) => setFormData({ ...formData, pais: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>{formData.tipo === 'particular' ? 'DNI / NIE' : 'CIF'}</label>
                <input
                  type="text"
                  value={formData.nif || ''}
                  onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Notas Internas</label>
                <textarea
                  value={formData.notas || ''}
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
                <button type="button" onClick={handleCloseModal} className="cliente-btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="cliente-btn-primary">
                  {editingCliente ? 'Actualizar' : 'Crear'} Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <MessageModal
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        title={messageModalConfig.title}
        message={messageModalConfig.message}
        type={messageModalConfig.type as any}
        onConfirm={messageModalConfig.onConfirm}
        showCancel={messageModalConfig.showCancel}
        buttonText={messageModalConfig.buttonText}
      />
    </div>
  );
}
