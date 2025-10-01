import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Search, ShoppingCart, User, MapPin, Truck, CreditCard } from 'lucide-react';
import { Usuario, Libro } from '../types';
import { obtenerUsuarios, obtenerLibros, crearPedido, calcularTotalesPedido } from '../services/pedidoService';
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
  const [libros, setLibros] = useState<Libro[]>([]);
  const [searchLibro, setSearchLibro] = useState('');
  const [loading, setLoading] = useState(false);

  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState('');
  const [tipo, setTipo] = useState('interno');
  const [metodoPago, setMetodoPago] = useState('tarjeta');
  const [direccionEnvio, setDireccionEnvio] = useState('');
  const [transportista, setTransportista] = useState('');
  const [tracking, setTracking] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const [lineas, setLineas] = useState<LineaPedido[]>([]);
  const [libroTemporal, setLibroTemporal] = useState<number | ''>('');
  const [cantidadTemporal, setCantidadTemporal] = useState(1);

  useEffect(() => {
    if (isOpen) {
      cargarUsuarios();
      cargarLibros();
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchLibro.length >= 2) {
      cargarLibros(searchLibro);
    }
  }, [searchLibro]);

  const cargarUsuarios = async () => {
    const data = await obtenerUsuarios();
    setUsuarios(data);
  };

  const cargarLibros = async (filtro?: string) => {
    const data = await obtenerLibros(filtro);
    setLibros(data);
  };

  const agregarLinea = () => {
    if (!libroTemporal) {
      alert('Seleccione un libro');
      return;
    }

    if (cantidadTemporal <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }

    const libro = libros.find(l => l.id === libroTemporal);
    if (!libro) return;

    const nuevaLinea: LineaPedido = {
      id: Date.now().toString(),
      libro_id: libro.id,
      libro,
      cantidad: cantidadTemporal,
      precio_unitario: libro.precio
    };

    setLineas([...lineas, nuevaLinea]);
    setLibroTemporal('');
    setCantidadTemporal(1);
    setSearchLibro('');
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

    if (!usuarioSeleccionado) {
      alert('Seleccione un usuario');
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

      const pedido = await crearPedido({
        usuario_id: usuarioSeleccionado,
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
    setUsuarioSeleccionado('');
    setTipo('interno');
    setMetodoPago('tarjeta');
    setDireccionEnvio('');
    setTransportista('');
    setTracking('');
    setObservaciones('');
    setLineas([]);
    setLibroTemporal('');
    setCantidadTemporal(1);
    setSearchLibro('');
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
              <div className="form-group full-width">
                <label>Cliente *</label>
                <select
                  value={usuarioSeleccionado}
                  onChange={(e) => setUsuarioSeleccionado(e.target.value)}
                  className="form-select"
                  required
                >
                  <option value="">Seleccione un cliente</option>
                  {usuarios.map(usuario => (
                    <option key={usuario.id} value={usuario.id}>
                      {usuario.username} - {usuario.email}
                    </option>
                  ))}
                </select>
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
                  <option value="ASM">ASM</option>
                  <option value="GLS">GLS</option>
                  <option value="Envialia">Envialia</option>
                  <option value="otro">Otro</option>
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

            <div className="agregar-producto">
              <div className="buscar-libro">
                <Search size={18} />
                <input
                  type="text"
                  value={searchLibro}
                  onChange={(e) => setSearchLibro(e.target.value)}
                  placeholder="Buscar libro por título o ISBN..."
                  className="form-input"
                />
              </div>

              <select
                value={libroTemporal}
                onChange={(e) => setLibroTemporal(Number(e.target.value))}
                className="form-select"
              >
                <option value="">Seleccione un libro</option>
                {libros.map(libro => (
                  <option key={libro.id} value={libro.id}>
                    {libro.titulo} - {libro.precio.toFixed(2)} € (Stock: {libro.stock || 0})
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="1"
                value={cantidadTemporal}
                onChange={(e) => setCantidadTemporal(Number(e.target.value))}
                className="form-input cantidad-input"
                placeholder="Cant."
              />

              <button
                type="button"
                onClick={agregarLinea}
                className="btn-agregar-linea"
              >
                <Plus size={18} />
                Agregar
              </button>
            </div>

            {lineas.length > 0 && (
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
              disabled={loading || !usuarioSeleccionado || lineas.length === 0}
            >
              {loading ? 'Guardando...' : 'Guardar Pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
