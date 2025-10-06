import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Search, ShoppingCart, User, MapPin, Truck, CreditCard } from 'lucide-react';
import { Usuario, Libro, Cliente } from '../types';
import { obtenerUsuarios, obtenerLibros, crearPedido, calcularTotalesPedido } from '../services/pedidoService';
import { getClientes } from '../services/clienteService';
import '../styles/components/CrearPedido.css';

interface CrearPedidoProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface LineaPedido {
  id: string;
  libro_id: number;
  libro?: Libro;
  cantidad: number;
  precio_unitario: number;
}

export default function CrearPedido({ isOpen, onClose, onSuccess }: CrearPedidoProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [libros, setLibros] = useState<Libro[]>([]);
  const [loading, setLoading] = useState(false);

  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [showClienteSuggestions, setShowClienteSuggestions] = useState(false);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
  const clienteAutocompleteRef = useRef<HTMLDivElement>(null);

  const [libroSearch, setLibroSearch] = useState('');
  const [libroSeleccionado, setLibroSeleccionado] = useState<Libro | null>(null);
  const [showLibroSuggestions, setShowLibroSuggestions] = useState(false);
  const [filteredLibros, setFilteredLibros] = useState<Libro[]>([]);
  const libroAutocompleteRef = useRef<HTMLDivElement>(null);

  const [tipo, setTipo] = useState('interno');
  const [metodoPago, setMetodoPago] = useState('tarjeta');
  const [direccionEnvio, setDireccionEnvio] = useState('');
  const [transportista, setTransportista] = useState('');
  const [tracking, setTracking] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const [lineas, setLineas] = useState<LineaPedido[]>([]);
  const [cantidadTemporal, setCantidadTemporal] = useState(1);

  useEffect(() => {
    if (isOpen) {
      cargarUsuarios();
      cargarClientes();
      cargarLibros();
    }
  }, [isOpen]);

  useEffect(() => {
    if (clienteSearch.trim()) {
      const filtered = clientes.filter(cliente => {
        const fullName = `${cliente.nombre} ${cliente.apellidos}`.toLowerCase();
        const search = clienteSearch.toLowerCase();
        return (
          fullName.includes(search) ||
          cliente.email?.toLowerCase().includes(search) ||
          cliente.nif?.toLowerCase().includes(search)
        );
      }).filter(c => c.activo);
      setFilteredClientes(filtered);
    } else {
      setFilteredClientes(clientes.filter(c => c.activo));
    }
  }, [clienteSearch, clientes]);

  useEffect(() => {
    if (libroSearch.trim()) {
      const filtered = libros.filter(libro =>
        libro.titulo.toLowerCase().includes(libroSearch.toLowerCase()) ||
        libro.isbn.toLowerCase().includes(libroSearch.toLowerCase()) ||
        libro.autor?.toLowerCase().includes(libroSearch.toLowerCase())
      );
      setFilteredLibros(filtered);
    } else {
      setFilteredLibros(libros);
    }
  }, [libroSearch, libros]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clienteAutocompleteRef.current && !clienteAutocompleteRef.current.contains(event.target as Node)) {
        setShowClienteSuggestions(false);
      }
      if (libroAutocompleteRef.current && !libroAutocompleteRef.current.contains(event.target as Node)) {
        setShowLibroSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cargarUsuarios = async () => {
    const data = await obtenerUsuarios();
    setUsuarios(data);
  };

  const cargarClientes = async () => {
    try {
      const data = await getClientes();
      setClientes(data);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const cargarLibros = async () => {
    const data = await obtenerLibros();
    setLibros(data);
  };

  const handleSelectCliente = (cliente: Cliente) => {
    setClienteSeleccionado(cliente);
    setClienteSearch(`${cliente.nombre} ${cliente.apellidos}`);
    setDireccionEnvio(cliente.direccion || '');
    setShowClienteSuggestions(false);
  };

  const handleSelectLibro = (libro: Libro) => {
    setLibroSeleccionado(libro);
    setLibroSearch(libro.titulo);
    setShowLibroSuggestions(false);
  };

  const agregarLinea = () => {
    if (!libroSeleccionado) {
      alert('Seleccione un libro de las sugerencias');
      return;
    }

    if (cantidadTemporal <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }

    const nuevaLinea: LineaPedido = {
      id: Date.now().toString(),
      libro_id: libroSeleccionado.id,
      libro: libroSeleccionado,
      cantidad: cantidadTemporal,
      precio_unitario: libroSeleccionado.precio
    };

    setLineas([...lineas, nuevaLinea]);
    setLibroSeleccionado(null);
    setLibroSearch('');
    setCantidadTemporal(1);
  };

  const eliminarLinea = (lineaId: string) => {
    setLineas(lineas.filter(l => l.id !== lineaId));
  };

  const actualizarCantidad = (lineaId: string, cantidad: number) => {
    if (cantidad <= 0) return;
    setLineas(lineas.map(l =>
      l.id === lineaId ? { ...l, cantidad } : l
    ));
  };

  const actualizarPrecio = (lineaId: string, precio: number) => {
    if (precio < 0) return;
    setLineas(lineas.map(l =>
      l.id === lineaId ? { ...l, precio_unitario: precio } : l
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clienteSeleccionado) {
      alert('Debe seleccionar un cliente');
      return;
    }

    if (lineas.length === 0) {
      alert('Agregue al menos un producto al pedido');
      return;
    }

    setLoading(true);

    try {
      const detalles = lineas.map(linea => ({
        libro_id: linea.libro_id,
        cantidad: linea.cantidad,
        precio_unitario: linea.precio_unitario
      }));

      const usuarioId = usuarios.find(u => u.email === clienteSeleccionado.email)?.id || usuarios[0]?.id;

      const pedido = await crearPedido({
        usuario_id: usuarioId,
        cliente_id: clienteSeleccionado.id,
        tipo,
        metodo_pago: metodoPago,
        direccion_envio: direccionEnvio || undefined,
        transportista: transportista || undefined,
        tracking: tracking || undefined,
        observaciones: observaciones || undefined,
        detalles
      });

      if (pedido) {
        alert(`Pedido #${pedido.id} creado correctamente`);
        resetForm();
        onSuccess();
        onClose();
      } else {
        alert('Error al crear el pedido');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear el pedido');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setClienteSearch('');
    setClienteSeleccionado(null);
    setTipo('interno');
    setMetodoPago('tarjeta');
    setDireccionEnvio('');
    setTransportista('');
    setTracking('');
    setObservaciones('');
    setLineas([]);
    setLibroSearch('');
    setLibroSeleccionado(null);
    setCantidadTemporal(1);
  };

  const { subtotal, iva, total } = calcularTotalesPedido(
    lineas.map(l => ({ cantidad: l.cantidad, precio_unitario: l.precio_unitario }))
  );

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-crear-pedido" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-title">
            <ShoppingCart size={24} />
            <h2>Crear Nuevo Pedido</h2>
          </div>
          <button onClick={onClose} className="btn-close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-section">
            <div className="section-header">
              <User size={20} />
              <h3>Información del Cliente</h3>
            </div>

            <div className="form-grid">
              <div className="form-group full-width" ref={clienteAutocompleteRef} style={{ position: 'relative' }}>
                <label>Buscar Cliente *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={clienteSearch}
                    onChange={(e) => {
                      setClienteSearch(e.target.value);
                      setShowClienteSuggestions(true);
                      if (!e.target.value.trim()) {
                        setClienteSeleccionado(null);
                        setDireccionEnvio('');
                      }
                    }}
                    onFocus={() => setShowClienteSuggestions(true)}
                    placeholder="Buscar por nombre, email o NIF..."
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                    required
                  />
                  <Search
                    size={18}
                    style={{
                      position: 'absolute',
                      left: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9ca3af',
                      pointerEvents: 'none'
                    }}
                  />
                </div>

                {showClienteSuggestions && clienteSearch.trim() && (
                  <div className="autocomplete-suggestions">
                    {filteredClientes.length > 0 ? (
                      filteredClientes.slice(0, 8).map(cliente => (
                        <div
                          key={cliente.id}
                          className="suggestion-item"
                          onClick={() => handleSelectCliente(cliente)}
                        >
                          <div style={{ fontWeight: 500, color: '#1e293b' }}>
                            {cliente.nombre} {cliente.apellidos}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.125rem' }}>
                            {cliente.email || 'Sin email'} {cliente.nif && `• NIF: ${cliente.nif}`}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '0.75rem', color: '#64748b', fontSize: '0.875rem' }}>
                        No se encontraron clientes
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Tipo de Pedido</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="form-select"
                >
                  <option value="interno">Interno</option>
                  <option value="iberlibro">Iberlibro</option>
                  <option value="conecta">Conecta</option>
                  <option value="uniliber">Uniliber</option>
                  <option value="libreros_de_viejo">Libreros de Viejo</option>
                </select>
              </div>

              <div className="form-group">
                <label>Método de Pago *</label>
                <select
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                  className="form-select"
                  required
                >
                  <option value="tarjeta">Tarjeta</option>
                  <option value="paypal">PayPal</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="reembolso">Reembolso</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="section-header">
              <MapPin size={20} />
              <h3>Información de Envío</h3>
            </div>

            <div className="form-grid">
              <div className="form-group full-width">
                <label>Dirección de Envío</label>
                <textarea
                  value={direccionEnvio}
                  onChange={(e) => setDireccionEnvio(e.target.value)}
                  className="form-textarea"
                  rows={2}
                  placeholder="Calle, número, piso, código postal, ciudad..."
                />
              </div>

              <div className="form-group">
                <label>Transportista</label>
                <select
                  value={transportista}
                  onChange={(e) => setTransportista(e.target.value)}
                  className="form-select"
                >
                  <option value="">Seleccione...</option>
                  <option value="MRW">MRW</option>
                  <option value="GLS">GLS</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div className="form-group">
                <label>Número de Tracking</label>
                <input
                  type="text"
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                  className="form-input"
                  placeholder="Ej: 1234567890"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="section-header">
              <ShoppingCart size={20} />
              <h3>Productos del Pedido</h3>
            </div>

            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Escriba el título o ISBN del libro, seleccione de las sugerencias y haga clic en "Agregar".
            </p>

            <div className="agregar-producto-mejorado">
              <div className="form-group" ref={libroAutocompleteRef} style={{ position: 'relative', flex: 1 }}>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={libroSearch}
                    onChange={(e) => {
                      setLibroSearch(e.target.value);
                      setShowLibroSuggestions(true);
                      if (!e.target.value.trim()) {
                        setLibroSeleccionado(null);
                      }
                    }}
                    onFocus={() => setShowLibroSuggestions(true)}
                    placeholder="Buscar libro por título, autor o ISBN..."
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                  />
                  <Search
                    size={18}
                    style={{
                      position: 'absolute',
                      left: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9ca3af',
                      pointerEvents: 'none'
                    }}
                  />
                </div>

                {showLibroSuggestions && libroSearch.trim() && (
                  <div className="autocomplete-suggestions">
                    {filteredLibros.length > 0 ? (
                      filteredLibros.slice(0, 10).map(libro => (
                        <div
                          key={libro.id}
                          className="suggestion-item"
                          onClick={() => handleSelectLibro(libro)}
                        >
                          <div style={{ fontWeight: 500, color: '#1e293b' }}>{libro.titulo}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.125rem' }}>
                            {libro.autor} • ISBN: {libro.isbn} • {libro.precio.toFixed(2)} € • Stock: {libro.stock || 0}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '0.75rem', color: '#64748b', fontSize: '0.875rem' }}>
                        No se encontraron libros
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="form-group" style={{ width: '120px' }}>
                <input
                  type="number"
                  min="1"
                  value={cantidadTemporal}
                  onChange={(e) => setCantidadTemporal(Number(e.target.value))}
                  className="form-input"
                  placeholder="Cant."
                />
              </div>

              <button
                type="button"
                onClick={agregarLinea}
                className="btn-agregar-linea"
                disabled={!libroSeleccionado}
              >
                <Plus size={18} />
                Agregar
              </button>
            </div>

            {lineas.length > 0 && (
              <>
                <div style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontWeight: 600, color: '#1e293b' }}>
                  Productos agregados ({lineas.length})
                </div>
                <div className="lineas-table">
                  <div className="table-header">
                    <span>Libro</span>
                    <span>Cantidad</span>
                    <span>Precio Unit.</span>
                    <span>Subtotal</span>
                    <span></span>
                  </div>

                  {lineas.map(linea => (
                    <div key={linea.id} className="table-row">
                      <span className="libro-nombre">{linea.libro?.titulo}</span>
                      <input
                        type="number"
                        min="1"
                        value={linea.cantidad}
                        onChange={(e) => actualizarCantidad(linea.id, Number(e.target.value))}
                        className="input-cantidad"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={linea.precio_unitario}
                        onChange={(e) => actualizarPrecio(linea.id, Number(e.target.value))}
                        className="input-precio"
                      />
                      <span className="subtotal-linea">
                        {(linea.cantidad * linea.precio_unitario).toFixed(2)} €
                      </span>
                      <button
                        type="button"
                        onClick={() => eliminarLinea(linea.id)}
                        className="btn-eliminar-linea"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {lineas.length > 0 && (
              <div className="totales-preview">
                <div className="total-row">
                  <span>Subtotal:</span>
                  <span>{subtotal.toFixed(2)} €</span>
                </div>
                <div className="total-row">
                  <span>IVA (21%):</span>
                  <span>{iva.toFixed(2)} €</span>
                </div>
                <div className="total-row final">
                  <span>TOTAL:</span>
                  <span>{total.toFixed(2)} €</span>
                </div>
              </div>
            )}
          </div>

          <div className="form-section">
            <div className="section-header">
              <CreditCard size={20} />
              <h3>Observaciones</h3>
            </div>

            <div className="form-group">
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="form-textarea"
                rows={3}
                placeholder="Notas adicionales sobre el pedido..."
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="btn-cancelar"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-guardar"
              disabled={loading || !clienteSeleccionado || lineas.length === 0}
            >
              {loading ? 'Guardando...' : 'Guardar Pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
